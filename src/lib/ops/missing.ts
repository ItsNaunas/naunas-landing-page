// "What am I missing?" (2026-10-22): fixed rules over everything the dashboard knows (outreach, HubSpot
// deals, promises, content, system health). No AI here, so every flag is true and links to where it's fixed.
// The assistant (lib/assistant) and the home briefing are built on top of this list.

import { getProspects, getSettings, CHANNEL_LABEL, type Prospect } from '@/lib/outreach';
import { getOwed, needsYou, dueAt } from '@/lib/owed';
import { openAsks } from '@/lib/asks';
import { getIndex } from '@/lib/content';
import { getJSON } from '@/lib/store';
import { inboxReady } from '@/lib/inbox';
import { channelBoard } from '@/lib/channels';
import { igSequence } from '@/lib/ops/more';
import { crmSearch, STAGE } from '@/lib/hubspot';
import { FUNNEL } from '@/config/funnel';
import { listProposals, getProposal } from '@/lib/proposal';
import { reportOpens } from '@/lib/leakReport';

export type Flag = {
  id: string; level: 'high' | 'medium' | 'low'; area: 'Outreach' | 'Pipeline' | 'Content' | 'System';
  title: string; detail?: string; href: string; label?: string;
};

const DAY = 86_400_000;
const daysSince = (iso?: string) => (iso ? Math.floor((Date.now() - Date.parse(iso)) / DAY) : 0);
const firmHref = (p: Prospect) => `/dashboard/outreach/firm/${encodeURIComponent(p.id)}`;
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;

export type Deal = { id: string; name: string; stage: string; idleDays: number; amount?: number };

/** Open deals from HubSpot with how long since anything changed on them. Empty without a token. */
export async function openDeals(): Promise<Deal[]> {
  if (!process.env.HUBSPOT_TOKEN) return [];
  const r = await crmSearch('deals', [{ propertyName: 'dealstage', operator: 'IN', values: [STAGE.newEnquiry, STAGE.contacted, STAGE.auditBooked, STAGE.auditDone, STAGE.scopeSent] }],
    ['dealname', 'dealstage', 'hs_lastmodifieddate', 'notes_last_updated', 'amount']);
  return r.results.map((d) => {
    const last = [d.properties.notes_last_updated, d.properties.hs_lastmodifieddate].filter(Boolean).map((t) => Date.parse(t!)).sort((a, b) => b - a)[0];
    return { id: d.id, name: d.properties.dealname ?? 'Deal', stage: d.properties.dealstage ?? '', idleDays: last ? Math.floor((Date.now() - last) / DAY) : 0, amount: d.properties.amount ? Number(d.properties.amount) : undefined };
  });
}

export async function missing(): Promise<{ flags: Flag[]; deals: Deal[]; errors: string[] }> {
  const errors: string[] = [];
  const safe = <T,>(name: string, p: Promise<T>, fallback: T) => p.catch((e) => { errors.push(`${name}: ${e instanceof Error ? e.message : e}`); return fallback; });
  const [prospects, settings, owed, asks, posts, health, deals] = await Promise.all([
    safe('Prospects', getProspects(), [] as Prospect[]), getSettings().catch(() => null), safe('Owed', getOwed(), []), safe('Asks', openAsks(), []),
    safe('Content', getIndex(), []), getJSON<{ at?: string; ok?: boolean }>('meta/health.json', {}).catch(() => ({} as { at?: string; ok?: boolean })),
    safe('HubSpot', openDeals(), [] as Deal[]),
  ]);
  const flags: Flag[] = [];
  const add = (f: Flag) => flags.push(f);

  // ---- Promises and replies (money first)
  const o = needsYou(owed);
  for (const x of o.toSend.filter((x) => dueAt(x) < Date.now())) add({ id: `owed-${x.id}`, level: 'high', area: 'Outreach', title: `You promised ${x.who} a ${x.what}`, detail: `Overdue by ${Math.round((Date.now() - dueAt(x)) / 3_600_000)} hours.`, href: x.firmId ? `/dashboard/outreach/firm/${encodeURIComponent(x.firmId)}` : '/dashboard/outreach', label: 'Send it' });
  if (o.toNudge.length) add({ id: 'nudges', level: 'medium', area: 'Outreach', title: `${plural(o.toNudge.length, 'nudge')} due`, detail: `Quiet since you sent: ${o.toNudge.map((x) => x.who).slice(0, 3).join(', ')}.`, href: '/dashboard/outreach', label: 'Open Today' });
  const quietReplies = prospects.filter((p) => p.status === 'replied' && !p.bookedAt && !p.wonAt && !p.lostAt && daysSince(p.igRepliedAt ?? p.repliedAt) >= 2 && !owed.some((x) => x.firmId === p.id));
  for (const p of quietReplies.slice(0, 5)) add({ id: `reply-${p.id}`, level: 'high', area: 'Outreach', title: `${p.firm} replied ${daysSince(p.igRepliedAt ?? p.repliedAt)} days ago with no next step`, detail: 'No call booked and nothing promised. Move it towards a call, or offer the leak report.', href: firmHref(p), label: 'Open firm' });

  // ---- Proposals opened but not accepted (2+ days), and published but never opened (3+ days)
  const rows = await listProposals().catch(() => []);
  for (const r of rows.filter((x) => x.status === 'opened' || x.status === 'sent')) {
    const pr = await getProposal(r.token).catch(() => null);
    if (!pr) continue;
    if (r.status === 'opened' && pr.openedAt && daysSince(pr.openedAt) >= 2) add({ id: `prop-${r.token}`, level: 'high', area: 'Pipeline', title: `${pr.client} opened the proposal ${daysSince(pr.openedAt)} days ago and hasn’t accepted`, detail: `Opened ${pr.opens} time${pr.opens === 1 ? '' : 's'}. A follow-up message is drafted on the proposal page.`, href: `/dashboard/pipeline/proposal/${r.token}`, label: 'Follow up' });
    else if (r.status === 'sent' && pr.publishedAt && daysSince(pr.publishedAt) >= 3) add({ id: `prop-${r.token}`, level: 'medium', area: 'Pipeline', title: `${pr.client} hasn’t opened the proposal (sent ${daysSince(pr.publishedAt)} days ago)`, detail: 'Check they got the link, or send it again another way.', href: `/dashboard/pipeline/proposal/${r.token}`, label: 'Open' });
  }

  // ---- Leak reports opened by a firm that hasn't replied since: the best moment to message them
  for (const o of await reportOpens().catch(() => [])) {
    const p = prospects.find((x) => x.id === o.prospectId);
    if (!p || p.bookedAt || p.wonAt || p.lostAt || daysSince(o.lastOpenAt) > 3) continue;
    if ((p.igRepliedAt ?? p.repliedAt ?? '') > o.lastOpenAt) continue;
    add({ id: `report-${o.token}`, level: 'high', area: 'Outreach', title: `${p.firm} opened your leak report ${daysSince(o.lastOpenAt) === 0 ? 'today' : `${daysSince(o.lastOpenAt)} days ago`}`, detail: `Opened ${o.opens} time${o.opens === 1 ? '' : 's'}. Message them now while it’s fresh; Draft my reply is on the firm page.`, href: firmHref(p), label: 'Message them' });
  }

  // ---- HubSpot pipeline going stale
  const nameOf = (s: string) => Object.entries(STAGE).find(([, v]) => v === s)?.[0];
  for (const d of deals) {
    if (d.stage === STAGE.auditDone && d.idleDays >= 5) add({ id: `deal-${d.id}`, level: 'high', area: 'Pipeline', title: `${d.name}: audit done ${d.idleDays} days ago, no proposal`, href: `/dashboard/pipeline`, label: 'Open pipeline' });
    else if (d.stage === STAGE.scopeSent && d.idleDays >= 7) add({ id: `deal-${d.id}`, level: 'high', area: 'Pipeline', title: `${d.name}: proposal out ${d.idleDays} days, no deposit`, detail: 'Chase it, or ask what is holding them back.', href: `/dashboard/pipeline`, label: 'Open pipeline' });
    else if ((d.stage === STAGE.contacted || d.stage === STAGE.newEnquiry) && d.idleDays >= 5) add({ id: `deal-${d.id}`, level: 'medium', area: 'Pipeline', title: `${d.name}: nothing for ${d.idleDays} days (${nameOf(d.stage) === 'newEnquiry' ? 'new enquiry' : 'contacted'})`, href: `/dashboard/pipeline`, label: 'Open pipeline' });
  }

  // ---- Outreach engine
  if (settings) {
    const emailWaiting = prospects.filter((p) => p.status === 'scheduled' && (!p.channel || p.channel === 'email') && p.email).length;
    if (emailWaiting && (!settings.sending || !inboxReady())) add({ id: 'email-blocked', level: 'high', area: 'System', title: `${plural(emailWaiting, 'firm')} waiting for a first email that can't go`, detail: !inboxReady() ? 'The ZOHO_SMTP_* keys aren’t set, so replies can’t be read and cold email is blocked.' : 'Sending is off in ⚙ Settings.', href: '/dashboard/outreach', label: 'Open settings' });
    const board = channelBoard(prospects, settings);
    const dow = (new Date().getUTCDay() + 6) % 7; // Monday = 0
    // One flag for the week's pace (from Wednesday on), not one nag per channel every day.
    const expected = board.reduce((n, c) => n + c.target * (dow + 1), 0);
    const got = board.reduce((n, c) => n + c.newThisWeek, 0);
    if (expected > 0 && dow >= 2 && got < expected * 0.5) add({ id: 'behind', level: 'low', area: 'Outreach', title: `Outreach behind this week: ${got} new firms of about ${expected}`, detail: board.map((c) => `${c.label} ${c.newThisWeek}/${c.target * (dow + 1)}`).join(' · '), href: '/dashboard/outreach', label: 'Open Today' });
    const seq = igSequence(prospects, false, { ig: settings.igNew, li: settings.liNew });
    const due = seq.followups.length + seq.linkedin.filter((l) => l.step !== 'engage').length;
    if (due) add({ id: 'followups', level: 'medium', area: 'Outreach', title: `${plural(due, 'follow-up')} due on Instagram and LinkedIn`, href: '/dashboard/outreach', label: 'Open Today' });
    const pipe = prospects.filter((p) => ['new', 'approved', 'drafted'].includes(p.status)).length;
    const daily = settings.igNew + settings.liNew + settings.dailyNew;
    if (pipe < daily) add({ id: 'dry', level: 'medium', area: 'Outreach', title: `Prospect list running dry: ${pipe} firms left to review or start`, detail: settings.cities?.length ? `Your targets add up to ${daily} new firms a day. The next city search starts automatically.` : `Your targets add up to ${daily} new firms a day. Add cities in ⚙ Settings and searches start on their own.`, href: '/dashboard/outreach/prospects?step=review', label: 'Find firms' });
    const ready = prospects.filter((p) => p.status === 'drafted').length;
    if (ready >= daily) add({ id: 'ready', level: 'low', area: 'Outreach', title: `${plural(ready, 'firm')} researched and ready to start`, href: '/dashboard/outreach/prospects?step=ready', label: 'Start them' });
  }
  const failed = prospects.filter((p) => p.status === 'approved' && p.researchError);
  if (failed.length) add({ id: 'research-failed', level: 'medium', area: 'Outreach', title: `Research failed for ${plural(failed.length, 'firm')}`, detail: failed[0].researchError, href: '/dashboard/outreach/prospects?step=researching', label: 'Try again' });

  // Opener test: a style with plenty of sends and no replies while another style gets replies.
  const styles = ['A', 'B', 'C'].map((s) => { const f = prospects.filter((p) => p.dmStyle === s); return { s, sent: f.length, replied: f.filter((p) => p.igRepliedAt).length }; });
  const winner = styles.filter((s) => s.replied > 0).sort((a, b) => b.replied / b.sent - a.replied / a.sent)[0];
  for (const s of styles) if (winner && s.sent >= 15 && s.replied === 0) add({ id: `opener-${s.s}`, level: 'low', area: 'Outreach', title: `Opener ${s.s}: ${s.sent} sent, no replies`, detail: `Opener ${winner.s} has ${winner.replied} of ${winner.sent}. Consider dropping ${s.s}.`, href: '/dashboard/outreach/results', label: 'See results' });

  // Channels that make money (from HubSpot outcomes synced back)
  for (const c of ['instagram', 'linkedin', 'email'] as const) {
    const f = prospects.filter((p) => p.channel === c && (p.scheduledAt || p.startedAt));
    const replied = f.filter((p) => p.igRepliedAt || p.repliedAt || p.bookedAt).length;
    if (f.length >= 30 && replied === 0) add({ id: `zero-${c}`, level: 'medium', area: 'Outreach', title: `${CHANNEL_LABEL[c]}: ${f.length} firms worked, no replies yet`, detail: 'Check the openers and that the steps are actually being sent.', href: '/dashboard/outreach/results', label: 'See results' });
  }

  // ---- Asks
  const oldAsks = asks.filter((a) => daysSince(a.createdAt) >= 2);
  if (oldAsks.length) add({ id: 'asks', level: 'low', area: 'Pipeline', title: `${plural(oldAsks.length, 'review/referral ask')} not sent yet`, detail: oldAsks.map((a) => a.who).slice(0, 3).join(', '), href: '/dashboard/outreach', label: 'Open Today' });

  // ---- Content
  const now = Date.now();
  const failedPosts = posts.filter((r) => Object.values(r.channels).includes('failed'));
  if (failedPosts.length) add({ id: 'post-failed', level: 'medium', area: 'Content', title: `${plural(failedPosts.length, 'post')} failed on a channel`, href: '/dashboard/content', label: 'Retry' });
  const weekAgo = now - 7 * DAY;
  const lastWeek = posts.filter((r) => (r.status === 'done' || r.status === 'partial') && Date.parse(r.when) > weekAgo).length;
  const upcoming = posts.filter((r) => r.status === 'scheduled' && Date.parse(r.when) > now && Date.parse(r.when) < now + 2 * DAY).length;
  if (lastWeek < FUNNEL.content.weeklyTarget / 2) add({ id: 'content-low', level: 'medium', area: 'Content', title: `${lastWeek} posts in the last 7 days (target ${FUNNEL.content.weeklyTarget})`, href: '/dashboard/content', label: 'Plan posts' });
  if (!upcoming) add({ id: 'content-empty', level: 'low', area: 'Content', title: 'Nothing scheduled for the next 2 days', href: '/dashboard/content', label: 'Schedule one' });

  // ---- System
  if (health.ok === false) add({ id: 'health', level: 'high', area: 'System', title: 'The daily health check found a problem', detail: 'Leads may be slipping through until it’s fixed.', href: '/dashboard/system', label: 'Open health' });
  else if (health.at && daysSince(health.at) >= 2) add({ id: 'health-stale', level: 'medium', area: 'System', title: `Health check hasn't run for ${daysSince(health.at)} days`, href: '/dashboard/system', label: 'Open health' });
  for (const e of errors) add({ id: `err-${e.slice(0, 20)}`, level: 'low', area: 'System', title: `Couldn't read ${e.split(':')[0]}`, detail: e, href: '/dashboard/system' });

  const rank = { high: 0, medium: 1, low: 2 };
  flags.sort((a, b) => rank[a.level] - rank[b.level]);
  return { flags, deals, errors };
}
