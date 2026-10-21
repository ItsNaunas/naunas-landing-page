import { NextRequest, NextResponse } from 'next/server';
import { runChecks } from '@/lib/health';
import { putJSON } from '@/lib/store';
import { notify, esc, alertError } from '@/lib/alert';
import { weeklyScoreboard } from '@/lib/scoreboard';
import { FUNNEL } from '@/config/funnel';
import { refreshIgToken } from '@/lib/instagram';
import { buildWeeklyDraft } from '@/lib/newsletter';
import { refreshInsights } from '@/lib/performance';
import { sendTodayBrief } from '@/lib/ops/todayBrief';

// Daily funnel health check (Vercel cron, see vercel.json). Read-only: it never creates leads or sends
// email to anyone, it just proves every service the funnel depends on still accepts our keys and that
// the MailerLite sequences are switched on. Any failure → Telegram. Mondays also get an "all green"
// (as does any manual run with ?ping=1, to test the alert path).
// Vercel cron calls it with `Authorization: Bearer $CRON_SECRET`.

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
  } else if (new Date().getUTCDay() === 1 || req.nextUrl.searchParams.get('ping') === '1') {
    await notify({ level: 'ok', title: 'Daily health check: all green', lines: checklist });
  }
  // Mondays (or ?scoreboard=1): the weekly scoreboard rides on this cron instead of needing its own.
  if (new Date().getUTCDay() === 1 || req.nextUrl.searchParams.get('scoreboard') === '1') {
    try {
      await notify(await weeklyScoreboard());
    } catch (err) {
      await alertError('Health: weekly scoreboard', err, 'Nothing is broken for leads; only this week’s scoreboard is missing.');
    }
  }
  // Newsletter day (Monday): build the weekly draft in MailerLite from last week's posts. Never sends.
  if (new Date().getUTCDay() === FUNNEL.content.newsletterDay || req.nextUrl.searchParams.get('newsletter') === '1') {
    try {
      await buildWeeklyDraft();
    } catch (err) {
      await alertError('Health: newsletter draft', err, 'Only the weekly draft is missing. Build it from Content → Newsletter.');
    }
  }
  // Morning outreach brief (this cron runs 06:00 UTC = 09:00 Zanzibar).
  await sendTodayBrief().catch((err) => console.error('[health] today brief', err));
  // Instagram insights for recent posts (the Content leaderboard). Quiet on failure: stats only.
  await refreshInsights().catch((err) => console.error('[health] insights', err));
  // 1st of the month: extend the Instagram token (it dies after 60 days unused-refresh).
  if (process.env.IG_ACCESS_TOKEN && new Date().getUTCDate() === 1) {
    try {
      const r = await refreshIgToken();
      if (r.changed) {
        await notify({
          level: 'error',
          title: 'Instagram token: new value issued',
          lines: [`Instagram returned a new token (valid ${r.expiresInDays} days). The old one keeps working until it expires.`],
          next: 'Generate a fresh long-lived token in the Meta app and replace IG_ACCESS_TOKEN in Vercel + Bitwarden.',
        });
      }
    } catch (err) {
      await alertError('Health: Instagram token refresh', err, 'Comment DMs and DM capture stop when the token expires.');
    }
  }
  return NextResponse.json({ ok: failed.length === 0, checks }, { status: failed.length ? 503 : 200 });
}
