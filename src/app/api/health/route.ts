import { NextRequest, NextResponse } from 'next/server';
import { runChecks } from '@/lib/health';
import { putJSON } from '@/lib/store';
import { notify, esc } from '@/lib/alert';
import { FUNNEL } from '@/config/funnel';
import { dispatchDailyJobs, runJob } from '@/lib/dailyJobs';

// Daily funnel health check (Vercel cron, see vercel.json). Read-only: it never creates leads or sends
// email to anyone, it just proves every service the funnel depends on still accepts our keys and that
// the MailerLite sequences are switched on. Any failure → Telegram. Mondays also get an "all green"
// (as does any manual run with ?ping=1, to test the alert path).
// Vercel cron calls it with `Authorization: Bearer $CRON_SECRET`.

export const maxDuration = 120; // the checks; every other job runs in its own call (lib/dailyJobs)

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const checks = await runChecks();
  // Last run, for the dashboard Automations tab.
  await putJSON('meta/health.json', { at: new Date().toISOString(), ok: checks.every((c) => c.ok) }).catch(() => {});

  const failed = checks.filter((c) => !c.ok);
  const checklist = checks.map((c) => (c.ok ? `✓ ${esc(c.name)}` : `✗ <b>${esc(c.name)}</b>\n    <code>${esc(c.detail ?? 'failed')}</code>`));
  if (failed.length) {
    await notify({
      level: 'error',
      title: `Daily health check: ${failed.length} problem${failed.length > 1 ? 's' : ''}`,
      lines: checklist,
      next: 'Leads may be slipping through until this is fixed.',
      buttons: [{ text: 'Open logs', url: FUNNEL.logsUrl }],
    });
  } else if (req.nextUrl.searchParams.get('ping') === '1') {
    await notify({ level: 'ok', title: 'Daily health check: all green', lines: checklist });
  }
  // Everything else (deal sync, asks, triage, top-up, backup, stats, Monday scoreboard + newsletter, the plan and the
  // brief) runs as separate jobs (lib/dailyJobs), each in its own function call, so one slow service can't stop the rest.
  // ?job=<name> runs a single job now (manual testing).
  const one = req.nextUrl.searchParams.get('job');
  const jobs = one ? { queued: [], ran: [one], result: await runJob(one) } : await dispatchDailyJobs();
  return NextResponse.json({ ok: failed.length === 0, checks, jobs }, { status: failed.length ? 503 : 200 });
}
