// HubSpot CRM writes (private app token in HUBSPOT_TOKEN). Every call is best-effort: the site
// never fails a visitor's submission because HubSpot is slow or down.

import type { Attribution } from '@/lib/attribution';
import { priorityOf } from '@/lib/booking';

const API = 'https://api.hubapi.com';
const PIPELINE = 'default'; // "Client System sales"
export const STAGE = {
  newEnquiry: '6213348567',
  contacted: '6213348568',
  auditBooked: '6213348569',
  auditDone: '6213348570',
  scopeSent: '6213348571',
  won: '6213348572',
  lost: '6213348573',
} as const;
const OPEN_STAGES = [STAGE.newEnquiry, STAGE.contacted];

export type LeadSource =
  | 'audit_questionnaire' | 'leak_map_popup' | 'cold_email' | 'instagram_dm'
  | 'linkedin' | 'referral' | 'contact_form' | 'other';

async function hs<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const token = process.env.HUBSPOT_TOKEN;
  if (!token) throw new Error('Missing HUBSPOT_TOKEN');
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`HubSpot ${init.method ?? 'GET'} ${path} → ${res.status}: ${await res.text()}`);
  return (res.status === 204 ? undefined : await res.json()) as T;
}

// Links into the HubSpot UI (portal "Naunas Systems"), used by the Telegram alert buttons.
const PORTAL_ID = '149523755';
export const hubspotUrl = {
  contact: (id: string) => `https://app.hubspot.com/contacts/${PORTAL_ID}/record/0-1/${id}`,
  deal: (id: string) => `https://app.hubspot.com/contacts/${PORTAL_ID}/record/0-3/${id}`,
  contacts: () => `https://app.hubspot.com/contacts/${PORTAL_ID}/objects/0-1/views/all/list`,
};

/** Health check: proves the key is accepted and can read contacts (the 401 that went unnoticed for 3 days). */
export async function checkHubSpot(): Promise<void> {
  await hs('/crm/v3/objects/contacts?limit=1');
}

function clean(props: Record<string, string | number | undefined | null>) {
  return Object.fromEntries(Object.entries(props).filter(([, v]) => v !== undefined && v !== null && v !== '')) as Record<string, string>;
}

/** Channel the lead came through, from the attribution (cold email links, DM short link, etc.). */
export function inferLeadSource(fallback: LeadSource, a?: Attribution): LeadSource {
  const s = `${a?.first_touch_source ?? ''} ${a?.first_touch_medium ?? ''}`.toLowerCase();
  if (/cold-?email|outreach/.test(s)) return 'cold_email';
  if (/instagram/.test(s) && /\bdm\b/.test(s)) return 'instagram_dm';
  if (/linkedin/.test(s)) return 'linkedin';
  return fallback;
}

type ContactInput = {
  email: string;
  firstname?: string;
  lastname?: string;
  website?: string;
  business_type?: string;
  client_value?: string;
  monthly_revenue_band?: string;
  whats_not_working?: string;
  leadSource?: LeadSource;
  attribution?: Attribution;
};

/** Create or update a contact by email. First-touch fields and lead source are never overwritten. */
export async function upsertContact(c: ContactInput): Promise<string> {
  let existing: { id: string; properties: Record<string, string | null> } | null = null;
  try {
    existing = await hs(`/crm/v3/objects/contacts/${encodeURIComponent(c.email)}?idProperty=email&properties=first_touch_source,naunas_lead_source`);
  } catch {
    existing = null; // 404 = new contact
  }
  const a = c.attribution ?? {};
  const keepFirst = !!existing?.properties.first_touch_source;
  const props = clean({
    email: c.email,
    firstname: c.firstname,
    lastname: c.lastname,
    website: c.website,
    business_type: c.business_type,
    client_value: c.client_value,
    monthly_revenue_band: c.monthly_revenue_band,
    whats_not_working: c.whats_not_working,
    naunas_priority: priorityOf(c.client_value, c.monthly_revenue_band),
    naunas_lead_source: existing?.properties.naunas_lead_source ? undefined : c.leadSource,
    first_touch_source: keepFirst ? undefined : a.first_touch_source,
    first_touch_medium: keepFirst ? undefined : a.first_touch_medium,
    first_touch_campaign: keepFirst ? undefined : a.first_touch_campaign,
    first_landing_page: keepFirst ? undefined : a.first_landing_page,
    last_touch_source: a.last_touch_source,
    last_touch_medium: a.last_touch_medium,
    last_touch_campaign: a.last_touch_campaign,
    converted_on_page: a.converted_on_page,
  });
  if (existing) {
    await hs(`/crm/v3/objects/contacts/${existing.id}`, { method: 'PATCH', body: JSON.stringify({ properties: props }) });
    return existing.id;
  }
  const created = await hs<{ id: string }>('/crm/v3/objects/contacts', { method: 'POST', body: JSON.stringify({ properties: props }) });
  return created.id;
}

async function openDealFor(contactId: string): Promise<string | null> {
  const r = await hs<{ results: { id: string }[] }>(`/crm/v3/objects/deals/search`, {
    method: 'POST',
    body: JSON.stringify({
      filterGroups: [{
        filters: [
          { propertyName: 'pipeline', operator: 'EQ', value: PIPELINE },
          { propertyName: 'dealstage', operator: 'IN', values: [...OPEN_STAGES, STAGE.auditBooked, STAGE.auditDone, STAGE.scopeSent] },
          { propertyName: 'associations.contact', operator: 'EQ', value: contactId },
        ],
      }],
      limit: 1,
    }),
  });
  return r.results[0]?.id ?? null;
}

/** Ensure an open deal exists for the contact and is at least at `stage`. */
export async function ensureDeal(opts: { contactId: string; name: string; stage: string; leadSource?: string; attribution?: Attribution; priority?: string }) {
  const existing = await openDealFor(opts.contactId);
  if (existing) {
    const order = Object.values(STAGE);
    const current = await hs<{ properties: { dealstage: string } }>(`/crm/v3/objects/deals/${existing}?properties=dealstage`);
    if (order.indexOf(opts.stage as (typeof order)[number]) > order.indexOf(current.properties.dealstage as (typeof order)[number])) {
      await hs(`/crm/v3/objects/deals/${existing}`, { method: 'PATCH', body: JSON.stringify({ properties: { dealstage: opts.stage } }) });
    }
    return existing;
  }
  const a = opts.attribution ?? {};
  const deal = await hs<{ id: string }>('/crm/v3/objects/deals', {
    method: 'POST',
    body: JSON.stringify({
      properties: clean({
        dealname: opts.name,
        pipeline: PIPELINE,
        dealstage: opts.stage,
        deal_lead_source: opts.leadSource,
        naunas_deal_priority: opts.priority,
        deal_source: [a.first_touch_source, a.first_touch_medium].filter(Boolean).join(' / ') || undefined,
      }),
      associations: [{ to: { id: opts.contactId }, types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 3 }] }],
    }),
  });
  return deal.id;
}

/** Add a note to the contact's timeline (e.g. full questionnaire answers). */
export async function addNote(contactId: string, html: string) {
  await hs('/crm/v3/objects/notes', {
    method: 'POST',
    body: JSON.stringify({
      properties: { hs_timestamp: new Date().toISOString(), hs_note_body: html },
      associations: [{ to: { id: contactId }, types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 202 }] }],
    }),
  });
}

export function splitName(full: string) {
  const parts = full.trim().split(/\s+/);
  return { firstname: parts[0], lastname: parts.slice(1).join(' ') || undefined };
}
