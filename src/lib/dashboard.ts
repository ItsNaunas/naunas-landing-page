import { crmSearch, STAGE, routineReports } from '@/lib/hubspot';
import { isTest } from '@/lib/scoreboard';
import { getCampaigns, getStats, type Campaign } from '@/lib/campaigns';
import { FUNNEL } from '@/config/funnel';
import { demo, demoOn } from '@/lib/dashboardDemo';

// Data for /dashboard, read live from HubSpot (people, deals, routine run reports logged as notes) and
// Blob (campaigns + counters). Read-only. Every source fails on its own, so an outage shows as a warning
// on the page instead of a blank screen.

export const DAY = 86_400_000;
export const OPEN_STAGES: [string, string][] = [
  [STAGE.newEnquiry, 'New enquiry'], [STAGE.contacted, 'Contacted'], [STAGE.auditBooked, 'Audit booked'],
  [STAGE.auditDone, 'Audit done'], [STAGE.scopeSent, 'Scope sent'],
];
export const SOURCE_LABEL: Record<string, string> = {
  leak_map_popup: 'Leak Map', audit_questionnaire: 'Audit form', cold_email: 'Cold email', instagram_dm: 'Instagram',
  linkedin: 'LinkedIn', referral: 'Referral', contact_form: 'Contact form', other: 'Newsletter / other',
};
export const LOST_LABEL: Record<string, string> = {
  price: 'Price', timing: 'Timing', competitor: 'Went elsewhere', diy: 'DIY', no_fit: 'Not a fit', ghosted: 'Went quiet', other: 'Other',
};

export type RoutineReport = {
  runAt: string;
  counts: Partial<Record<'replies' | 'calls' | 'proposals' | 'retention' | 'content', number>>;
  needsYou: string[];
  items: { job: string; title: string; detail?: string; link?: string }[];
};

type Row = { id: string; properties: Record<string, string | null> };
const EMPTY = { total: 0, results: [] as Row[] };
const num = (v?: string | null) => Number(v ?? 0) || 0;
const ts = (v?: string | null) => Date.parse(v ?? '') || 0;
export const tally = (xs: string[]) => xs.reduce<Record<string, number>>((a, x) => ({ ...a, [x]: (a[x] ?? 0) + 1 }), {});

function collector() {
  const errors: string[] = [];
  const safe = <T,>(label: string, p: Promise<T>, fallback: T) =>
    p.catch((err) => {
      errors.push(`${label}: ${err instanceof Error ? err.message.slice(0, 140) : String(err)}`);
      return fallback;
    });
  const search = (label: string, ...args: Parameters<typeof crmSearch>) => safe(label, crmSearch(...args), EMPTY);
  return { errors, safe, search };
}

const monthStart = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).getTime(); };

/** Overview: KPIs with week-on-week change, 30-day lead series, funnel, goal, needs-you, recent leads. */
export async function overviewData() {
  if (demoOn()) return demo.overview();
  const { errors, safe, search } = collector();
  const now = Date.now();
  const since30 = now - 30 * DAY;
  const [contacts, won, lost30, reports, ...open] = await Promise.all([
    search('Leads', 'contacts', [{ propertyName: 'createdate', operator: 'GTE', value: String(since30) }],
      ['email', 'firstname', 'lastname', 'naunas_lead_source', 'createdate', 'instagram_handle'], 'createdate'),
    search('Won deals', 'deals', [{ propertyName: 'dealstage', operator: 'EQ', value: STAGE.won }, { propertyName: 'closedate', operator: 'GTE', value: String(Math.min(monthStart(), since30)) }], ['amount', 'dealname', 'closedate']),
    search('Lost deals', 'deals', [{ propertyName: 'dealstage', operator: 'EQ', value: STAGE.lost }, { propertyName: 'closedate', operator: 'GTE', value: String(since30) }], ['naunas_lost_reason']),
    safe('Routine reports', routineReports<RoutineReport>(FUNNEL.routine.logEmail, 3), [] as RoutineReport[]),
    ...OPEN_STAGES.map(([stage, label]) => search(label, 'deals', [{ propertyName: 'dealstage', operator: 'EQ', value: stage }], ['dealname', 'amount'])),
  ]);

  const leads = contacts.results.filter((c) => !isTest(c.properties.email));
  const inRange = (from: number, to: number) => leads.filter((c) => ts(c.properties.createdate) >= from && ts(c.properties.createdate) < to).length;
  const series = Array.from({ length: 30 }, (_, i) => {
    const start = new Date(now - (29 - i) * DAY); start.setHours(0, 0, 0, 0);
    return { day: start.toISOString().slice(0, 10), count: inRange(start.getTime(), start.getTime() + DAY) };
  });
  const wonIn = (from: number) => won.results.filter((d) => ts(d.properties.closedate) >= from);
  const sum = (ds: Row[]) => ds.reduce((s, d) => s + num(d.properties.amount), 0);
  const stage = (id: string) => open[OPEN_STAGES.findIndex(([s]) => s === id)];
  const openValue = open.reduce((s, r) => s + sum(r.results), 0);
  const wonMonth = sum(wonIn(monthStart()));
  const gap = Math.max(0, FUNNEL.goals.monthlyRevenue - wonMonth);

  return {
    errors,
    kpis: {
      leads7: inRange(now - 7 * DAY, now + 1), leadsPrev7: inRange(now - 14 * DAY, now - 7 * DAY),
      booked: stage(STAGE.auditBooked).total,
      wonMonth, wonMonthCount: wonIn(monthStart()).length,
      openValue, openCount: open.reduce((s, r) => s + r.total, 0),
    },
    series,
    bySource: Object.entries(tally(leads.map((c) => c.properties.naunas_lead_source ?? 'other'))).sort((a, b) => b[1] - a[1]),
    // Snapshot funnel: 30-day inflow, then where deals sit now, then 30-day wins.
    funnel: [
      { label: 'Leads (30d)', value: leads.length },
      { label: 'Audit booked', value: stage(STAGE.auditBooked).total },
      { label: 'Audit done', value: stage(STAGE.auditDone).total },
      { label: 'Scope sent', value: stage(STAGE.scopeSent).total },
      { label: 'Won (30d)', value: wonIn(since30).length },
    ],
    goal: { target: FUNNEL.goals.monthlyRevenue, wonMonth, gap, openValue, coverage: gap ? openValue / gap : null, coverageTarget: FUNNEL.goals.pipelineCoverage },
    lostWhy: Object.entries(tally(lost30.results.map((d) => d.properties.naunas_lost_reason ?? 'other'))).sort((a, b) => b[1] - a[1]),
    booked: stage(STAGE.auditBooked).results.map((d) => ({ id: d.id, name: d.properties.dealname ?? 'Untitled' })),
    recent: leads.slice(0, 8).map((c) => ({
      id: c.id,
      name: [c.properties.firstname, c.properties.lastname].filter(Boolean).join(' ') || (c.properties.instagram_handle ? `@${c.properties.instagram_handle}` : c.properties.email) || 'Unknown',
      source: c.properties.naunas_lead_source ?? 'other',
      at: c.properties.createdate ?? '',
    })),
    lastRun: reports[0] as RoutineReport | undefined,
  };
}

/** Pipeline board: every open deal by stage. */
export async function pipelineData() {
  if (demoOn()) return demo.pipeline();
  const { errors, search } = collector();
  const open = await Promise.all(OPEN_STAGES.map(([stage, label]) =>
    search(label, 'deals', [{ propertyName: 'dealstage', operator: 'EQ', value: stage }], ['dealname', 'amount', 'createdate', 'naunas_deal_priority', 'deal_lead_source'], 'createdate')));
  return {
    errors,
    stages: OPEN_STAGES.map(([id, label], i) => {
      const deals = open[i].results.map((d) => ({
        id: d.id, name: d.properties.dealname ?? 'Untitled', amount: num(d.properties.amount),
        createdAt: d.properties.createdate ?? '', priority: d.properties.naunas_deal_priority ?? '', source: d.properties.deal_lead_source ?? '',
      }));
      return { id, label, deals, total: open[i].total, value: deals.reduce((s, d) => s + d.amount, 0) };
    }),
  };
}

/** Campaigns with counters (Blob) and leads / deals per campaign (HubSpot). */
export async function campaignsData() {
  if (demoOn()) return demo.campaigns();
  const { errors, search } = collector();
  const [campaigns, stats, ig] = await Promise.all([
    getCampaigns(), getStats(),
    search('Instagram leads', 'contacts', [{ propertyName: 'instagram_campaign', operator: 'HAS_PROPERTY' }], ['instagram_campaign', 'instagram_post', 'num_associated_deals']),
  ]);
  const leads = tally(ig.results.map((c) => c.properties.instagram_campaign ?? ''));
  const deals = tally(ig.results.filter((c) => num(c.properties.num_associated_deals) > 0).map((c) => c.properties.instagram_campaign ?? ''));
  return {
    errors,
    campaigns: campaigns.map((c: Campaign) => ({
      ...c,
      stats: { ...(stats[c.id] ?? { comments: 0, dms: 0, clicks: 0 }), leads: leads[c.id] ?? 0, deals: deals[c.id] ?? 0 },
    })),
    topPosts: Object.entries(tally(ig.results.map((c) => c.properties.instagram_post ?? '').filter(Boolean)))
      .sort((a, b) => b[1] - a[1]).slice(0, 8).map(([url, n]) => ({ url, leads: n })),
  };
}

/** Routine run history. */
export async function routineData(take = 14) {
  if (demoOn()) return demo.routine();
  const { errors, safe } = collector();
  const reports = await safe('Routine reports', routineReports<RoutineReport>(FUNNEL.routine.logEmail, take), [] as RoutineReport[]);
  return { errors, reports };
}
