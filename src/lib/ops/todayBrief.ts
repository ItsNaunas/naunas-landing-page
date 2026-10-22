// Morning Telegram (09:00 Zanzibar, on the daily health cron): what's on Today's list and roughly how long it
// takes, so the day starts with one tap into the dashboard. Counts only; nothing is sent to anyone.
import { getProspects, getSettings } from '@/lib/outreach';
import { getOwed, needsYou } from '@/lib/owed';
import { warmLeads, dueCheckins, getTouches } from '@/lib/checkins';
import { igSequence } from '@/lib/ops/more';
import { notify, line } from '@/lib/alert';
import { FUNNEL } from '@/config/funnel';
import { openTriaged } from '@/lib/triage';
import { overdueInvoices } from '@/lib/invoices';

export async function sendTodayBrief() {
  const [prospects, owedAll, leads, touches, settings] = await Promise.all([
    getProspects(), getOwed().catch(() => []), FUNNEL.outreach.warmCheckins ? warmLeads().catch(() => []) : Promise.resolve([]), getTouches().catch(() => ({})), getSettings(),
  ]);
  const owed = needsYou(owedAll);
  const ig = igSequence(prospects, false, { ig: settings.igNew, li: settings.liNew });
  const checkins = dueCheckins(leads, touches);
  const replies = await openTriaged().catch(() => []);
  const overdue = await overdueInvoices().catch(() => []);
  const rows: [string, string, number][] = [
    ['🧾', 'Overdue invoices to chase', overdue.length],
    ['💬', 'Replies to answer (drafts ready)', replies.length],
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
    lines: [...rows.filter((r) => r[2]).map(([icon, label, n]) => line(icon, label, String(n))), line('🎯', 'New firms today', `Instagram ${settings.igNew} · LinkedIn ${settings.liNew} · Email ${settings.dailyNew}`)],
    next: late ? `${late} promise${late > 1 ? 's are' : ' is'} past 24 hours: send ${late > 1 ? 'those' : 'that'} first.` : 'Work the list top to bottom. Focus mode shows one at a time.',
    buttons: [{ text: 'Open Today’s list', url: `${FUNNEL.site}/dashboard/outreach` }],
  });
  return total;
}
