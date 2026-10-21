// Morning Telegram (09:00 Zanzibar, on the daily health cron): what's on Today's list and roughly how long it
// takes, so the day starts with one tap into the dashboard. Counts only; nothing is sent to anyone.
import { getProspects } from '@/lib/outreach';
import { getOwed, needsYou } from '@/lib/owed';
import { warmLeads, dueCheckins, getTouches } from '@/lib/checkins';
import { igSequence } from '@/lib/ops/more';
import { notify, line } from '@/lib/alert';
import { FUNNEL } from '@/config/funnel';

export async function sendTodayBrief() {
  const [prospects, owedAll, leads, touches] = await Promise.all([
    getProspects(), getOwed().catch(() => []), FUNNEL.outreach.warmCheckins ? warmLeads().catch(() => []) : Promise.resolve([]), getTouches().catch(() => ({})),
  ]);
  const owed = needsYou(owedAll);
  const ig = igSequence(prospects);
  const checkins = dueCheckins(leads, touches);
  const rows: [string, string, number][] = [
    ['🤝', 'Promised (Loom/PDF)', owed.toSend.length],
    ['🔁', 'Nudges', owed.toNudge.length],
    ['🔥', 'Warm leads to re-open', checkins.length],
    ['📸', 'Instagram follow-ups', ig.followups.length],
    ['💼', 'LinkedIn steps', ig.linkedin.length],
    ['✉️', 'Instagram openers', ig.openers.length],
    ['👋', 'Instagram warm-ups', ig.warm.length],
  ];
  const total = rows.reduce((t, r) => t + r[2], 0);
  if (!total) return 0;
  const late = owed.toSend.filter((o) => Date.parse(o.owedAt) + 24 * 3_600_000 < Date.now()).length;
  await notify({
    level: 'ok',
    title: `Today’s outreach: ${total} item${total > 1 ? 's' : ''}, about ${Math.max(10, Math.round(total * 2.5))} min`,
    lines: rows.filter((r) => r[2]).map(([icon, label, n]) => line(icon, label, String(n))),
    next: late ? `${late} promise${late > 1 ? 's are' : ' is'} past 24 hours: send ${late > 1 ? 'those' : 'that'} first.` : 'Work the list top to bottom. Focus mode shows one at a time.',
    buttons: [{ text: 'Open Today’s list', url: `${FUNNEL.site}/dashboard/outreach` }],
  });
  return total;
}
