import { hs, STAGE } from '@/lib/hubspot';
import { ml } from '@/lib/mailerlite';
import { ig } from '@/lib/instagram';
import { DAY, OPEN_STAGES } from './common';

// Read-only fetchers for every connected tool. Each throws on failure; pages wrap them in collector().safe.

type Obj = { id: string; properties: Record<string, string | null> };
type Search = { total: number; results: Obj[] };

// ---------- HubSpot ----------
const CONTACT_PROPS = ['email', 'firstname', 'lastname', 'naunas_lead_source', 'naunas_priority', 'client_value', 'monthly_revenue_band',
  'business_type', 'website', 'whats_not_working', 'instagram_handle', 'instagram_campaign', 'instagram_post', 'createdate', 'lastmodifieddate',
  'notes_last_updated', 'num_associated_deals', 'first_touch_source', 'first_touch_medium'];
const DEAL_PROPS = ['dealname', 'amount', 'dealstage', 'createdate', 'closedate', 'hs_lastmodifieddate', 'notes_last_updated',
  'naunas_deal_priority', 'deal_lead_source', 'naunas_lost_reason'];

export async function searchContacts(opts: { since?: number; query?: string; limit?: number }): Promise<Search> {
  return hs<Search>('/crm/v3/objects/contacts/search', {
    method: 'POST',
    body: JSON.stringify({
      ...(opts.query ? { query: opts.query } : {}),
      filterGroups: opts.since ? [{ filters: [{ propertyName: 'createdate', operator: 'GTE', value: String(opts.since) }] }] : [],
      sorts: [{ propertyName: 'createdate', direction: 'DESCENDING' }],
      properties: CONTACT_PROPS, limit: opts.limit ?? 100,
    }),
  });
}

export async function searchDeals(stages: string[], closedSince?: number): Promise<Search> {
  const filters: { propertyName: string; operator: string; value?: string; values?: string[] }[] = [{ propertyName: 'dealstage', operator: 'IN', values: stages }];
  if (closedSince) filters.push({ propertyName: 'closedate', operator: 'GTE', value: String(closedSince) });
  return hs<Search>('/crm/v3/objects/deals/search', {
    method: 'POST',
    body: JSON.stringify({ filterGroups: [{ filters }], sorts: [{ propertyName: 'createdate', direction: 'DESCENDING' }], properties: DEAL_PROPS, limit: 200 }),
  });
}

export const openDeals = () => searchDeals(OPEN_STAGES.map(([s]) => s));
export const closedDeals = (since: number) => searchDeals([STAGE.won, STAGE.lost], since);
export const dealsCreatedSince = (since: number) => hs<Search>('/crm/v3/objects/deals/search', {
  method: 'POST',
  body: JSON.stringify({ filterGroups: [{ filters: [{ propertyName: 'createdate', operator: 'GTE', value: String(since) }] }], properties: DEAL_PROPS, limit: 200 }),
});

/** contactId → its most advanced deal (one batch association read + one batch deal read). */
export async function dealsForContacts(contactIds: string[]): Promise<Record<string, Obj>> {
  if (!contactIds.length) return {};
  const assoc = await hs<{ results: { from: { id: string }; to: { toObjectId: number }[] }[] }>('/crm/v4/associations/contacts/deals/batch/read', {
    method: 'POST', body: JSON.stringify({ inputs: contactIds.map((id) => ({ id })) }),
  });
  const dealIds = [...new Set(assoc.results.flatMap((r) => r.to.map((t) => String(t.toObjectId))))];
  if (!dealIds.length) return {};
  const deals = await hs<{ results: Obj[] }>('/crm/v3/objects/deals/batch/read', {
    method: 'POST', body: JSON.stringify({ properties: DEAL_PROPS, inputs: dealIds.map((id) => ({ id })) }),
  });
  const byId = new Map(deals.results.map((d) => [d.id, d]));
  const order = [...OPEN_STAGES.map(([s]) => s), STAGE.lost, STAGE.won];
  const out: Record<string, Obj> = {};
  for (const r of assoc.results) {
    const ds = r.to.map((t) => byId.get(String(t.toObjectId))).filter((d): d is Obj => !!d);
    ds.sort((a, b) => order.indexOf(b.properties.dealstage ?? '') - order.indexOf(a.properties.dealstage ?? ''));
    if (ds[0]) out[r.from.id] = ds[0];
  }
  return out;
}

export const getContact = (id: string) => hs<Obj>(`/crm/v3/objects/contacts/${id}?properties=${CONTACT_PROPS.join(',')}`);

// ---------- MailerLite ----------
export type MlStats = { sent: number; opens_count?: number; open_rate: { float: number }; clicks_count?: number; click_rate: { float: number }; unsubscribes_count?: number };
export type MlAutomation = {
  id: string; name: string; enabled: boolean; emails_count: number;
  stats: MlStats & { completed_subscribers_count: number; subscribers_in_queue_count: number };
  steps?: { type: string; name?: string; subject?: string; type_count?: number; description?: string; email?: { stats: MlStats } }[];
};
export const mlAutomations = () => ml<{ data: MlAutomation[] }>('/automations?limit=50').then((r) => r.data);
export const mlAutomation = (id: string) => ml<{ data: MlAutomation }>(`/automations/${id}`).then((r) => r.data);
export type MlGroup = { id: string; name: string; active_count: number; sent_count: number; open_rate: { float: number }; click_rate: { float: number }; unsubscribed_count: number };
export const mlGroups = () => ml<{ data: MlGroup[] }>('/groups?limit=100').then((r) => r.data);
export const mlSubscriber = (email: string) =>
  ml<{ data: { status: string; created_at: string; opens_count: number; clicks_count: number; groups: { name: string }[] } }>(`/subscribers/${encodeURIComponent(email)}`)
    .then((r) => r.data).catch(() => null);

// ---------- Instagram ----------
export type IgMedia = { id: string; caption?: string; media_type: string; permalink: string; timestamp: string; like_count?: number; comments_count?: number; thumbnail_url?: string; media_url?: string };
export const igProfileStats = () => ig<{ username: string; followers_count?: number; media_count?: number }>('/me?fields=username,followers_count,media_count');
export const igRecentMedia = (limit = 12) =>
  ig<{ data: IgMedia[] }>(`/me/media?fields=id,caption,media_type,permalink,timestamp,like_count,comments_count,thumbnail_url,media_url&limit=${limit}`).then((r) => r.data);

// ---------- Cal.com (CAL_API_KEY, read-only use) ----------
export type CalBooking = {
  uid: string; title: string; status: string; start: string; end: string; meetingUrl?: string; location?: string;
  attendees: { name: string; email: string; timeZone: string; absent?: boolean }[];
};
async function cal<T>(path: string): Promise<T> {
  const key = process.env.CAL_API_KEY;
  if (!key) throw new Error('Missing CAL_API_KEY');
  const res = await fetch(`https://api.cal.com/v2${path}`, { headers: { Authorization: `Bearer ${key}`, 'cal-api-version': '2024-08-13' }, cache: 'no-store' });
  if (!res.ok) throw new Error(`Cal.com ${path} → ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json() as Promise<T>;
}
export const calBookings = (status: 'upcoming' | 'past' | 'cancelled', take = 50, attendeeEmail?: string) =>
  cal<{ data: CalBooking[] }>(`/bookings?status=${status}&take=${take}${status === 'upcoming' ? '&sortStart=asc' : '&sortStart=desc'}${attendeeEmail ? `&attendeeEmail=${encodeURIComponent(attendeeEmail)}` : ''}`).then((r) => r.data);

// ---------- Stripe (STRIPE_READ_KEY: restricted, read-only) ----------
async function stripe<T>(path: string): Promise<T> {
  const key = process.env.STRIPE_READ_KEY;
  if (!key) throw new Error('Missing STRIPE_READ_KEY');
  const res = await fetch(`https://api.stripe.com/v1${path}`, { headers: { Authorization: `Bearer ${key}` }, cache: 'no-store' });
  if (!res.ok) throw new Error(`Stripe ${path.split('?')[0]} → ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json() as Promise<T>;
}
export type Charge = {
  id: string; amount: number; amount_refunded: number; currency: string; status: string; paid: boolean; refunded: boolean; disputed: boolean;
  created: number; payment_intent?: string; description?: string; receipt_url?: string; billing_details: { name?: string; email?: string };
};
export const stripeCharges = (sinceDays = 180) =>
  stripe<{ data: Charge[] }>(`/charges?limit=100&created[gte]=${Math.floor((Date.now() - sinceDays * DAY) / 1000)}`).then((r) => r.data);
export const stripeChargesFor = (email: string) =>
  stripe<{ data: Charge[] }>(`/charges/search?limit=20&query=${encodeURIComponent(`billing_details.email:"${email.replace(/"/g, '')}"`)}`).then((r) => r.data);
export const stripeBalance = () => stripe<{ available: { amount: number; currency: string }[]; pending: { amount: number; currency: string }[] }>('/balance');
export const stripeOpenInvoices = () =>
  stripe<{ data: { id: string; number?: string; amount_due: number; currency: string; customer_name?: string; customer_email?: string; due_date?: number; hosted_invoice_url?: string }[] }>('/invoices?status=open&limit=20').then((r) => r.data);
export const stripeSubscriptions = () =>
  stripe<{ data: { id: string; customer: string; items: { data: { quantity?: number; price: { unit_amount?: number; currency: string; recurring?: { interval: string; interval_count: number } } }[] } }[] }>('/subscriptions?status=active&limit=100').then((r) => r.data);
export const stripeSessions = () =>
  stripe<{ data: { payment_intent?: string; client_reference_id?: string }[] }>('/checkout/sessions?limit=100&status=complete').then((r) => r.data);
