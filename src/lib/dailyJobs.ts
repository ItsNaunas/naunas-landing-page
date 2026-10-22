// The 09:00 jobs (2026-10-23), split out of the health cron so each gets its own function run and time limit.
// The cron runs the checks, then hands every job to QStash as its own call to /api/content/fire ({ job }).
// A slow outside service then only delays its own job. Without QStash they run one after another, as before.

import { alertError, notify } from '@/lib/alert';
import { FUNNEL } from '@/config/funnel';

type Job = { name: string; when: (d: Date) => boolean; delayS: number; what: string; run: () => Promise<unknown> };
const daily = () => true;
const monday = (d: Date) => d.getUTCDay() === 1;

export const JOBS: Job[] = [
  { name: 'deals', when: daily, delayS: 0, what: 'Won/Lost from HubSpot', run: async () => (await import('@/lib/crmSync')).pullDealStages() },
  { name: 'asks', when: daily, delayS: 0, what: 'review and referral asks', run: async () => (await import('@/lib/asks')).buildAsks() },
  { name: 'triage', when: daily, delayS: 0, what: 'reply triage', run: async () => (await import('@/lib/triage')).triageInbox({ force: true }) },
  { name: 'topup', when: daily, delayS: 0, what: 'prospect top-up search', run: async () => (await import('@/lib/outreach')).topUpProspects() },
  { name: 'backup', when: daily, delayS: 0, what: 'store backup', run: async () => (await import('@/lib/store')).backupStore() },
  { name: 'insights', when: daily, delayS: 0, what: 'Instagram post stats', run: async () => (await import('@/lib/performance')).refreshInsights() },
  { name: 'scoreboard', when: monday, delayS: 0, what: 'weekly scoreboard', run: async () => notify(await (await import('@/lib/scoreboard')).weeklyScoreboard()) },
  { name: 'newsletter', when: (d) => d.getUTCDay() === FUNNEL.content.newsletterDay, delayS: 0, what: 'newsletter draft', run: async () => (await import('@/lib/newsletter')).buildWeeklyDraft() },
  { name: 'igtoken', when: (d) => d.getUTCDate() === 1 && !!process.env.IG_ACCESS_TOKEN, delayS: 0, what: 'Instagram token refresh', run: async () => {
    const r = await (await import('@/lib/instagram')).refreshIgToken();
    if (r.changed) await notify({ level: 'error', title: 'Instagram token: new value issued', lines: [`Instagram returned a new token (valid ${r.expiresInDays} days). The old one keeps working until it expires.`], next: 'Generate a fresh long-lived token in the Meta app and replace IG_ACCESS_TOKEN in Vercel + Bitwarden.' });
  } },
  // After the jobs above have landed: the plan reads the flags, the brief counts the triaged replies.
  { name: 'briefing', when: () => !!process.env.OPENAI_API_KEY, delayS: 90, what: 'today’s plan', run: async () => (await import('@/lib/assistant')).writeBriefing() },
  { name: 'brief', when: daily, delayS: 150, what: 'morning Telegram brief', run: async () => (await import('@/lib/ops/todayBrief')).sendTodayBrief() },
];

export const jobFor = (name: string) => JOBS.find((j) => j.name === name);

/** One job, with its failure reported (a failed job never stops the others). */
export async function runJob(name: string): Promise<'ok' | 'failed' | 'unknown'> {
  const j = jobFor(name);
  if (!j) return 'unknown';
  try { await j.run(); return 'ok'; } catch (err) { await alertError(`Daily job: ${j.what}`, err, `Only the ${j.what} is affected today.`); return 'failed'; }
}

/** Today's jobs: each queued as its own QStash call, or run here one after another when QStash isn't set up. */
export async function dispatchDailyJobs(): Promise<{ queued: string[]; ran: string[] }> {
  const now = new Date();
  const today = JOBS.filter((j) => j.when(now));
  const { qstashReady, scheduleAt } = await import('@/lib/qstash');
  if (qstashReady()) {
    const queued: string[] = [];
    for (const j of today) {
      try { await scheduleAt(new Date(Date.now() + j.delayS * 1000), { job: j.name }); queued.push(j.name); }
      catch { await runJob(j.name); }
    }
    return { queued, ran: [] };
  }
  for (const j of today) await runJob(j.name);
  return { queued: [], ran: today.map((j) => j.name) };
}
