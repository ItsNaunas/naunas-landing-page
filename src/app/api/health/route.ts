import { NextRequest, NextResponse } from 'next/server';
import { getMailer } from '@/lib/mailer';
import { checkHubSpot } from '@/lib/hubspot';
import { listAutomations, EXPECTED_AUTOMATIONS } from '@/lib/mailerlite';
import { alert } from '@/lib/alert';

// Daily funnel health check (Vercel cron, see vercel.json). Read-only: it never creates leads or sends
// email to anyone, it just proves every service the funnel depends on still accepts our keys and that
// the MailerLite sequences are switched on. Any failure → Telegram. Mondays also get an "all green"
// (as does any manual run with ?ping=1, to test the alert path).
// Vercel cron calls it with `Authorization: Bearer $CRON_SECRET`.

const REQUIRED_ENV = [
  'ZOHO_SMTP_HOST', 'ZOHO_SMTP_USER', 'ZOHO_SMTP_PASS', 'MAILERLITE_API_TOKEN', 'HUBSPOT_TOKEN',
  'CAL_WEBHOOK_SECRET', 'TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID',
];

type Check = { name: string; ok: boolean; detail?: string };

async function run(name: string, fn: () => Promise<string | void>): Promise<Check> {
  try {
    const detail = await fn();
    return { name, ok: true, detail: detail || undefined };
  } catch (err) {
    return { name, ok: false, detail: (err instanceof Error ? err.message : String(err)).slice(0, 300) };
  }
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const checks: Check[] = await Promise.all([
    run('Env vars', async () => {
      const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
      if (missing.length) throw new Error(`missing ${missing.join(', ')}`);
    }),
    run('HubSpot key', () => checkHubSpot()),
    run('MailerLite automations', async () => {
      const all = await listAutomations();
      const off = EXPECTED_AUTOMATIONS.filter((name) => !all.find((a) => a.name === name && a.enabled));
      if (off.length) throw new Error(`not running: ${off.join(', ')}`);
    }),
    run('Zoho SMTP', async () => {
      const mailer = getMailer();
      if (!mailer) throw new Error('not configured');
      await mailer.transporter.verify();
    }),
  ]);

  const failed = checks.filter((c) => !c.ok);
  if (failed.length) {
    await alert(`Funnel health check: ${failed.length} problem${failed.length > 1 ? 's' : ''}\n${failed.map((c) => `• ${c.name}: ${c.detail}`).join('\n')}`, 'error');
  } else if (new Date().getUTCDay() === 1 || req.nextUrl.searchParams.get('ping') === '1') {
    await alert(`Funnel health check: all green (${checks.map((c) => c.name).join(', ')})`, 'info');
  }
  return NextResponse.json({ ok: failed.length === 0, checks }, { status: failed.length ? 503 : 200 });
}
