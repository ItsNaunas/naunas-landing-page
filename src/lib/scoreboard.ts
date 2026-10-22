import { crmSearch, STAGE, hubspotUrl } from '@/lib/hubspot';
import { line, type AlertMessage } from '@/lib/alert';
import { FUNNEL } from '@/config/funnel';

// Weekly scoreboard (sent Mondays from the health-check cron): last 7 days of inflow by source, deals won
// and lost (with reasons), and where the open pipeline stands right now. Built only from HubSpot, which
// the site keeps up to date. Test leads (its.naunas+…) are left out.

const SOURCE_LABEL: Record<string, string> = {
  leak_map_popup: 'Leak Map', audit_questionnaire: 'Audit questionnaire', cold_email: 'Cold email', instagram_dm: 'Instagram DM',
  linkedin: 'LinkedIn', referral: 'Referral', contact_form: 'Contact form', other: 'Other / newsletter',
};
const LOST_LABEL: Record<string, string> = {
  price: 'price', timing: 'timing', competitor: 'went elsewhere', diy: 'DIY', no_fit: 'not a fit', ghosted: 'went quiet', other: 'other',
};
const OPEN: [string, string][] = [
  [STAGE.newEnquiry, 'New enquiry'], [STAGE.contacted, 'Contacted'], [STAGE.auditBooked, 'Audit booked'], [STAGE.auditDone, 'Audit done'], [STAGE.scopeSent, 'Scope sent'],
];

export const isTest = (email?: string | null) => !!email && /its\.naunas\+|@naunas\.co\.uk$/i.test(email);
const gbp = (n: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(n);
const tally = (values: (string | null | undefined)[]) =>
  values.reduce<Record<string, number>>((acc, v) => ({ ...acc, [v || 'other']: (acc[v || 'other'] ?? 0) + 1 }), {});

export async function weeklyScoreboard(): Promise<AlertMessage> {
  const since = String(Date.now() - 7 * 24 * 3600 * 1000);

  const [newContacts, won, lost, ...open] = await Promise.all([
    crmSearch('contacts', [{ propertyName: 'createdate', operator: 'GTE', value: since }, { propertyName: 'naunas_lead_source', operator: 'HAS_PROPERTY' }], ['email', 'naunas_lead_source', 'instagram_campaign']),
    crmSearch('deals', [{ propertyName: 'dealstage', operator: 'EQ', value: STAGE.won }, { propertyName: 'closedate', operator: 'GTE', value: since }], ['amount', 'dealname']),
    crmSearch('deals', [{ propertyName: 'dealstage', operator: 'EQ', value: STAGE.lost }, { propertyName: 'closedate', operator: 'GTE', value: since }], ['naunas_lost_reason']),
    ...OPEN.map(([stage]) => crmSearch('deals', [{ propertyName: 'dealstage', operator: 'EQ', value: stage }], ['amount'])),
  ]);

  const leads = newContacts.results.filter((c) => !isTest(c.properties.email));
  const topCampaign = Object.entries(tally(leads.map((c) => c.properties.instagram_campaign).filter(Boolean))).sort((a, b) => b[1] - a[1])[0];
  const bySource = Object.entries(tally(leads.map((c) => c.properties.naunas_lead_source))).sort((a, b) => b[1] - a[1]);
  const wonValue = won.results.reduce((sum, d) => sum + Number(d.properties.amount ?? 0), 0);
  const lostWhy = Object.entries(tally(lost.results.map((d) => d.properties.naunas_lost_reason))).map(([k, n]) => `${LOST_LABEL[k] ?? k} ${n}`).join(', ');
  const pipeline = OPEN.map(([, label], i) => `${label} ${open[i].total}`).join(' · ');
  const openValue = open.reduce((sum, r) => sum + r.results.reduce((s, d) => s + Number(d.properties.amount ?? 0), 0), 0);

  return {
    level: 'ok',
    title: 'Weekly scoreboard',
    lines: [
      line('📥', 'New leads', `${leads.length}${bySource.length ? ` (${bySource.map(([k, n]) => `${SOURCE_LABEL[k] ?? k} ${n}`).join(', ')})` : ''}`),
      topCampaign ? line('📸', 'Top Instagram campaign', `${topCampaign[0]} (${topCampaign[1]} lead${topCampaign[1] > 1 ? 's' : ''})`) : '',
      line('🏆', 'Won', `${won.total}${wonValue ? ` · ${gbp(wonValue)}` : ''}`),
      line('🪦', 'Lost', `${lost.total}${lostWhy ? ` (${lostWhy})` : ''}`),
      line('🧭', 'Pipeline now', pipeline),
      openValue ? line('💷', 'Open value', gbp(openValue)) : '',
    ],
    next: leads.length === 0 ? 'No new leads this week: the bottleneck is Attention. Push the Leak Map in DMs and posts.' : won.total === 0 && open[4].total > 0 ? 'Scopes are out with no wins yet: follow up every one this week.' : undefined,
    buttons: [{ text: 'Dashboard', url: `${FUNNEL.site}/dashboard` }, { text: 'Open deals in HubSpot', url: hubspotUrl.contacts().replace('/objects/0-1/', '/objects/0-3/') }],
  };
}
