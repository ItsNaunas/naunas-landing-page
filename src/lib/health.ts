import { getMailer } from '@/lib/mailer';
import { checkHubSpot } from '@/lib/hubspot';
import { listAutomations, EXPECTED_AUTOMATIONS } from '@/lib/mailerlite';
import { igMe } from '@/lib/instagram';
import { storeReady } from '@/lib/store';
import { checkInbox } from '@/lib/inbox';
import { checkFathom } from '@/lib/fathom';
import { checkApify } from '@/lib/apify';
import { checkTikTok, tiktokConnected } from '@/lib/tiktok';
import { checkLinkedIn, linkedinAccount } from '@/lib/linkedin';
import { checkQStash, qstashReady } from '@/lib/qstash';

// The read-only checks behind the daily health cron and the /dashboard health panel: every service the
// funnel depends on still accepts our keys, and the MailerLite sequences are switched on.

const REQUIRED_ENV = [
  'ZOHO_SMTP_HOST', 'ZOHO_SMTP_USER', 'ZOHO_SMTP_PASS', 'MAILERLITE_API_TOKEN', 'HUBSPOT_TOKEN',
  'CAL_WEBHOOK_SECRET', 'TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID', 'STRIPE_WEBHOOK_SECRET',
];

export type Check = { name: string; ok: boolean; detail?: string };

async function run(name: string, fn: () => Promise<string | void>): Promise<Check> {
  try {
    const detail = await fn();
    return { name, ok: true, detail: detail || undefined };
  } catch (err) {
    return { name, ok: false, detail: (err instanceof Error ? err.message : String(err)).slice(0, 300) };
  }
}

export async function runChecks(): Promise<Check[]> {
  const tiktok = await tiktokConnected().catch(() => false);
  const linkedin = !!(await linkedinAccount().catch(() => null));
  return Promise.all([
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
    // Optional pieces: only checked once they are set up.
    ...(process.env.IG_ACCESS_TOKEN ? [run('Instagram token', async () => `@${(await igMe()).username}`)] : []),
    ...(process.env.ZOHO_SMTP_PASS ? [run('Zoho inbox (IMAP)', () => checkInbox())] : []),
    ...(process.env.FATHOM_API_KEY ? [run('Fathom', () => checkFathom())] : []),
    ...(process.env.APIFY_TOKEN ? [run('Apify', () => checkApify())] : []),
    ...(tiktok ? [run('TikTok', () => checkTikTok())] : []),
    ...(linkedin ? [run('LinkedIn', () => checkLinkedIn())] : []),
    ...(qstashReady() ? [run('QStash (scheduling)', () => checkQStash())] : []),
    ...(storeReady() ? [] : [run('Blob store', async () => { throw new Error('not connected: campaigns can\'t be edited, stats aren\'t kept'); })]),
  ]);
}
