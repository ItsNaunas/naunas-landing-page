import { crmSearch, STAGE, routineReports } from '@/lib/hubspot';
import { isTest } from '@/lib/scoreboard';
import { getCampaigns, getStats, type Campaign } from '@/lib/campaigns';
import { FUNNEL } from '@/config/funnel';

// Everything /dashboard shows, read live from HubSpot + Blob (read-only). HubSpot is the source of truth
// for people and deals (and routine run reports, logged as notes); Blob only holds campaigns + counters.

const DAY = 86_400_000;
export const OPEN_STAGES: [string, string][] = [
  [STAGE.newEnquiry, 'New enquiry'], [STAGE.contacted, 'Contacted'], [STAGE.auditBooked, 'Audit booked'],
  [STAGE.auditDone, 'Audit done'], [STAGE.scopeSent, 'Scope sent'],
];
export const SOURCE_LABEL: Record<string, string> = {
  leak_map_popup: 'Leak Map', audit_questionnaire: 'Audit questionnaire', cold_email: 'Cold email', instagram_dm: 'Instagram',
  linkedin: 'LinkedIn', referral: 'Referral', contact_form: 'Contact form', other: 'Other / newsletter',
};

export type RoutineReport = {
  runAt: string;
  nextRunAt?: string;
  counts: Partial<Record<'replies' | 'calls' | 'proposals' | 'retention' | 'content', number>>;
  needsYou: string[];
  items: { job: string; title: string; detail?: string; link?: string }[];
};

const num = (v?: string | null) => Number(v ?? 0) || 0;
const tally = (xs: string[]) => xs.reduce<Record<string, number>>((a, x) => ({ ...a, [x]: (a[x] ?? 0) + 1 }), {});

export async function dashboardData() {
  const now = Date.now();
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
  const wonSince = Math.min(monthStart, now - 7 * DAY);

  // Each source fails on its own: a HubSpot outage shows as a warning, not a blank page.
  const errors: string[] = [];
  const EMPTY = { total: 0, results: [] as { id: string; properties: Record<string, string | null> }[] };
  const safe = (label: string, p: Promise<typeof EMPTY>) =>
    p.catch((err) => {
      errors.push(`${label}: ${err instanceof Error ? err.message.slice(0, 160) : String(err)}`);
      return EMPTY;
    });
  const hs = (label: string, ...args: Parameters<typeof crmSearch>) => safe(label, crmSearch(...args));

  const [contacts7, won, lost7, igContacts, campaigns, stats, reports, ...open] = await Promise.all([
    hs('New leads', 'contacts', [{ propertyName: 'createdate', operator: 'GTE', value: String(now - 7 * DAY) }], ['email', 'naunas_lead_source', 'createdate']),
    hs('Won deals', 'deals', [{ propertyName: 'dealstage', operator: 'EQ', value: STAGE.won }, { propertyName: 'closedate', operator: 'GTE', value: String(wonSince) }], ['amount', 'dealname', 'closedate']),
    hs('Lost deals', 'deals', [{ propertyName: 'dealstage', operator: 'EQ', value: STAGE.lost }, { propertyName: 'closedate', operator: 'GTE', value: String(now - 7 * DAY) }], ['naunas_lost_reason']),
    hs('Instagram leads', 'contacts', [{ propertyName: 'instagram_campaign', operator: 'HAS_PROPERTY' }], ['instagram_campaign', 'instagram_post', 'num_associated_deals']),
    getCampaigns(),
    getStats(),
    routineReports<RoutineReport>(FUNNEL.routine.logEmail, 7).catch((err) => {
      errors.push(`Routine reports: ${err instanceof Error ? err.message.slice(0, 160) : String(err)}`);
      return [] as RoutineReport[];
    }),
    ...OPEN_STAGES.map(([stage, label]) => hs(label, 'deals', [{ propertyName: 'dealstage', operator: 'EQ', value: stage }], ['dealname', 'amount', 'createdate'])),
  ]);

  const leads = contacts7.results.filter((c) => !isTest(c.properties.email));
  const leads24 = leads.filter((c) => Date.parse(c.properties.createdate ?? '') > now - DAY);
  const wonMonth = won.results.filter((d) => Date.parse(d.properties.closedate ?? '') >= monthStart);
  const won7 = won.results.filter((d) => Date.parse(d.properties.closedate ?? '') >= now - 7 * DAY);
  const sum = (ds: typeof won.results) => ds.reduce((s, d) => s + num(d.properties.amount), 0);

  const pipeline = OPEN_STAGES.map(([id, label], i) => ({
    id, label,
    deals: open[i].results.map((d) => ({ id: d.id, name: d.properties.dealname ?? 'Untitled', amount: num(d.properties.amount) })),
    total: open[i].total,
  }));
  const openValue = pipeline.reduce((s, st) => s + st.deals.reduce((t, d) => t + d.amount, 0), 0);
  const wonMonthValue = sum(wonMonth);
  const gap = Math.max(0, FUNNEL.goals.monthlyRevenue - wonMonthValue);

  // Instagram: leads per campaign / post (all time, from HubSpot), plus DM + click counters (Blob).
  const ig = igContacts.results;
  const byCampaign = tally(ig.map((c) => c.properties.instagram_campaign ?? ''));
  const withDeal = tally(ig.filter((c) => num(c.properties.num_associated_deals) > 0).map((c) => c.properties.instagram_campaign ?? ''));
  const campaignRows = campaigns.map((c: Campaign) => ({
    ...c,
    stats: { ...(stats[c.id] ?? { comments: 0, dms: 0, clicks: 0 }), leads: byCampaign[c.id] ?? 0, deals: withDeal[c.id] ?? 0 },
  }));
  const topPosts = Object.entries(tally(ig.map((c) => c.properties.instagram_post ?? '').filter(Boolean)))
    .sort((a, b) => b[1] - a[1]).slice(0, 5).map(([url, leads]) => ({ url, leads }));

  return {
    errors,
    today: {
      leads24: leads24.length,
      auditBooked: pipeline.find((s) => s.id === STAGE.auditBooked)!.deals,
      deposits7: { count: won7.length, value: sum(won7) },
    },
    week: {
      leads: leads.length,
      bySource: Object.entries(tally(leads.map((c) => c.properties.naunas_lead_source ?? 'other'))).sort((a, b) => b[1] - a[1]),
      won: won7.length,
      lost: lost7.total,
      lostWhy: tally(lost7.results.map((d) => d.properties.naunas_lost_reason ?? 'other')),
    },
    goal: {
      target: FUNNEL.goals.monthlyRevenue,
      wonMonth: wonMonthValue,
      gap,
      openValue,
      coverage: gap ? openValue / gap : null,
      coverageTarget: FUNNEL.goals.pipelineCoverage,
    },
    pipeline,
    campaigns: campaignRows,
    topPosts,
    reports,
  };
}
