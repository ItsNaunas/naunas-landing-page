// Weekly review (2026-10-23): the Monday scoreboard as a page. Each number is this week (last 7 days) against
// the week before, from what the dashboard already reads: HubSpot contacts and deals (cached), the activity
// log, the content index, the outreach list and proposals. Imported LinkedIn connections and test sign-ups
// don't count as leads.

import { STAGE } from '@/lib/hubspot';
import { isTest } from '@/lib/scoreboard';
import { listEvents, type OpsEvent } from '@/lib/events';
import { getIndex, type IndexRow } from '@/lib/content';
import { getProspects, type Prospect } from '@/lib/outreach';
import { listProposals, type ProposalRow } from '@/lib/proposal';
import { DAY, num, ts, collector } from './common';
import { src } from './cache';
import { demoOn } from './demo';

export type Metric = { label: string; now: number; prev: number; money?: boolean; href?: string; goodWhenDown?: boolean };
export type Group = { title: string; metrics: Metric[] };

const EMPTY = { total: 0, results: [] as { id: string; properties: Record<string, string | null> }[] };

export async function reviewData(): Promise<{ errors: string[]; groups: Group[]; from: string; to: string }> {
  const now = Date.now();
  const from = new Date(now - 7 * DAY).toISOString();
  const to = new Date(now).toISOString();
  if (demoOn()) {
    return { errors: [], from, to, groups: [
      { title: 'Inflow', metrics: [{ label: 'New leads', now: 18, prev: 12, href: '/dashboard/leads?range=7' }, { label: 'Audit enquiries', now: 4, prev: 3 }, { label: 'Instagram keyword DMs', now: 11, prev: 7 }] },
      { title: 'Sales', metrics: [{ label: 'Calls booked', now: 3, prev: 2 }, { label: 'No-shows', now: 1, prev: 0, goodWhenDown: true }, { label: 'Proposals accepted', now: 1, prev: 0 }, { label: 'Won', now: 5000, prev: 2500, money: true }, { label: 'Deals lost', now: 0, prev: 1, goodWhenDown: true }] },
      { title: 'Outreach', metrics: [{ label: 'Firms started', now: 20, prev: 14 }, { label: 'Replies', now: 3, prev: 1 }] },
      { title: 'Content', metrics: [{ label: 'Posts published', now: 5, prev: 6 }, { label: 'Tracked link clicks', now: 52, prev: 31 }] },
    ] };
  }
  const { errors, safe } = collector();
  const [contacts, won, lost, events, rows, firms, proposals] = await Promise.all([
    safe('Leads', src.searchContacts({ since: now - 14 * DAY, limit: 200 }), EMPTY),
    safe('Won deals', src.searchDeals([STAGE.won], now - 14 * DAY), EMPTY),
    safe('Lost deals', src.searchDeals([STAGE.lost], now - 14 * DAY), EMPTY),
    safe('Activity', listEvents(500), [] as OpsEvent[]),
    getIndex().catch(() => [] as IndexRow[]),
    getProspects().catch(() => [] as Prospect[]),
    listProposals().catch(() => [] as ProposalRow[]),
  ]);
  // [this week, last week] for a list of timestamps, optionally summing a value.
  const split = <T,>(xs: T[], at: (x: T) => number, value: (x: T) => number = () => 1): [number, number] => {
    let a = 0, b = 0;
    for (const x of xs) { const t = at(x); if (!t) continue; if (t >= now - 7 * DAY) a += value(x); else if (t >= now - 14 * DAY) b += value(x); }
    return [a, b];
  };
  const m = (label: string, [nowV, prev]: [number, number], extra: Partial<Metric> = {}): Metric => ({ label, now: nowV, prev, ...extra });
  const ev = (...kinds: string[]) => split(events.filter((e) => kinds.includes(e.kind)), (e) => ts(e.at));
  const leads = contacts.results.filter((c) => !isTest(c.properties.email) && c.properties.naunas_lead_source !== 'linkedin');
  const posted = rows.filter((r) => Object.values(r.channels).includes('posted'));
  const fstarted = (p: Prospect) => ts(p.scheduledAt ?? p.startedAt ?? p.warmedAt ?? p.liEngagedAt);

  return { errors, from, to, groups: [
    { title: 'Inflow', metrics: [
      m('New leads', split(leads, (c) => ts(c.properties.createdate)), { href: '/dashboard/leads?range=7' }),
      m('Audit enquiries', ev('enquiry')),
      m('Instagram keyword DMs', ev('ig_dm', 'ig_comment')),
    ] },
    { title: 'Sales', metrics: [
      m('Calls booked', ev('booking'), { href: '/dashboard/pipeline/calls' }),
      m('No-shows', ev('noshow'), { goodWhenDown: true }),
      m('Proposals accepted', split(proposals.filter((p) => p.status === 'accepted' || p.status === 'paid'), (p) => ts(p.updatedAt)), { href: '/dashboard/pipeline/proposals' }),
      m('Won', split(won.results, (d) => ts(d.properties.closedate), (d) => num(d.properties.amount)), { money: true, href: '/dashboard/pipeline' }),
      m('Deals lost', split(lost.results, (d) => ts(d.properties.closedate)), { goodWhenDown: true }),
    ] },
    { title: 'Outreach', metrics: [
      m('Firms started', split(firms, fstarted), { href: '/dashboard/outreach/prospects?step=outreach' }),
      m('Replies', split(firms, (p) => ts(p.igRepliedAt ?? p.repliedAt)), { href: '/dashboard/outreach/results' }),
    ] },
    { title: 'Content', metrics: [
      m('Posts published', split(posted, (r) => ts(r.when)), { href: '/dashboard/content/performance' }),
      m('Tracked link clicks', ev('click')),
    ] },
  ] };
}
