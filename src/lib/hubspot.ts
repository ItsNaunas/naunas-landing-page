// HubSpot CRM writes (service key in HUBSPOT_TOKEN: contacts/deals/companies read+write, owners read;
// private apps are disabled on this portal). Every call is best-effort: the site
// never fails a visitor's submission because HubSpot is slow or down.

import type { Attribution } from '@/lib/attribution';
import { priorityOf } from '@/lib/booking';
import { FUNNEL } from '@/config/funnel';

// LOCAL_STORE_DIR (local click-testing only) may point HubSpot at a mock server via HUBSPOT_API_BASE.
const API = (process.env.LOCAL_STORE_DIR && process.env.HUBSPOT_API_BASE) || 'https://api.hubapi.com';
const PIPELINE = FUNNEL.hubspot.pipeline;
export const STAGE = FUNNEL.hubspot.stages;
const OPEN_STAGES = [STAGE.newEnquiry, STAGE.contacted];
// New deals and companies are assigned to the owner in the funnel config.
const OWNER_ID = FUNNEL.hubspot.ownerId;

export type LeadSource =
  | 'audit_questionnaire' | 'leak_map_popup' | 'cold_email' | 'instagram_dm'
  | 'linkedin' | 'referral' | 'contact_form' | 'other';

export async function hs<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
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
const PORTAL_ID = FUNNEL.hubspot.portalId;
export const hubspotUrl = {
  contact: (id: string) => `https://app.hubspot.com/contacts/${PORTAL_ID}/record/0-1/${id}`,
  deal: (id: string) => `https://app.hubspot.com/contacts/${PORTAL_ID}/record/0-3/${id}`,
  contacts: () => `https://app.hubspot.com/contacts/${PORTAL_ID}/objects/0-1/views/all/list`,
};

type Filter = { propertyName: string; operator: string; value?: string; values?: string[] };
/** Search CRM records (for reporting). Returns the match total and up to 200 rows with the requested properties. */
export async function crmSearch(object: 'contacts' | 'deals', filters: Filter[], properties: string[] = [], sortBy?: string) {
  return hs<{ total: number; results: { id: string; properties: Record<string, string | null> }[] }>(`/crm/v3/objects/${object}/search`, {
    method: 'POST',
    body: JSON.stringify({
      filterGroups: [{ filters }], properties, limit: 200,
      ...(sortBy ? { sorts: [{ propertyName: sortBy, direction: 'DESCENDING' }] } : {}),
    }),
  });
}

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
        hubspot_owner_id: OWNER_ID,
      }),
      associations: [{ to: { id: opts.contactId }, types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 3 }] }],
    }),
  });
  return deal.id;
}

/** Add a note to the contact's timeline (e.g. full questionnaire answers), and to the deal's when given. */
export async function addNote(contactId: string, html: string, dealId?: string) {
  const associations = [{ to: { id: contactId }, types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 202 }] }];
  if (dealId) associations.push({ to: { id: dealId }, types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 214 }] });
  await hs('/crm/v3/objects/notes', {
    method: 'POST',
    body: JSON.stringify({ properties: { hs_timestamp: new Date().toISOString(), hs_note_body: html }, associations }),
  });
}

/** "https://www.Studio.com/about" or "studio.com" → "studio.com". Instagram handles and junk → undefined. */
export function domainOf(website?: string): string | undefined {
  if (!website || website.startsWith('@') || /instagram\.com|tiktok\.com|facebook\.com|linktr\.ee/i.test(website)) return undefined;
  try {
    const host = new URL(/^https?:\/\//.test(website) ? website : `https://${website}`).hostname.toLowerCase().replace(/^www\./, '');
    return host.includes('.') ? host : undefined;
  } catch {
    return undefined;
  }
}

/** Find or create the business as a HubSpot company (by website domain) and link it to the contact and deal. */
export async function linkCompany(opts: { website?: string; name?: string; contactId: string; dealId?: string }): Promise<string | undefined> {
  const domain = domainOf(opts.website);
  if (!domain) return undefined;
  const found = await hs<{ results: { id: string }[] }>('/crm/v3/objects/companies/search', {
    method: 'POST',
    body: JSON.stringify({ filterGroups: [{ filters: [{ propertyName: 'domain', operator: 'EQ', value: domain }] }], limit: 1 }),
  });
  const companyId = found.results[0]?.id
    ?? (await hs<{ id: string }>('/crm/v3/objects/companies', { method: 'POST', body: JSON.stringify({ properties: clean({ domain, name: opts.name || domain, hubspot_owner_id: OWNER_ID }) }) })).id;
  // v4 "default" associations: no type ids to get wrong.
  await hs(`/crm/v4/objects/contact/${opts.contactId}/associations/default/company/${companyId}`, { method: 'PUT' });
  if (opts.dealId) await hs(`/crm/v4/objects/deal/${opts.dealId}/associations/default/company/${companyId}`, { method: 'PUT' });
  return companyId;
}

/** The contact's most recent deal still in play (any stage before Won/Lost), by email. */
export async function openDealForEmail(email: string): Promise<{ contactId: string; dealId: string | null } | null> {
  try {
    const contact = await hs<{ id: string }>(`/crm/v3/objects/contacts/${encodeURIComponent(email)}?idProperty=email`);
    return { contactId: contact.id, dealId: await openDealFor(contact.id) };
  } catch {
    return null;
  }
}

/**
 * Deposit paid: deal → Won with the amount. Returns alreadyWon=true when it was Won before (Stripe retries
 * a webhook until it gets a 200, so the onboarding email must only go out once).
 */
export async function markDealWon(dealId: string, amount: number, currency: string): Promise<{ alreadyWon: boolean; dealName: string }> {
  const deal = await hs<{ properties: { dealstage: string; dealname: string } }>(`/crm/v3/objects/deals/${dealId}?properties=dealstage,dealname`);
  if (deal.properties.dealstage === STAGE.won) return { alreadyWon: true, dealName: deal.properties.dealname };
  await hs(`/crm/v3/objects/deals/${dealId}`, {
    method: 'PATCH',
    body: JSON.stringify({ properties: { dealstage: STAGE.won, amount: String(amount), deal_currency_code: currency.toUpperCase(), closedate: new Date().toISOString() } }),
  });
  return { alreadyWon: false, dealName: deal.properties.dealname };
}

/**
 * Instagram commenter or DM sender → contact keyed by handle (custom `instagram_handle` property), since
 * there's no email yet. Returns the id and whether it was new; an email later merges via upsertContact.
 */
export async function upsertInstagramContact(
  handle: string,
  opts: { name?: string; campaign?: string; postUrl?: string } = {},
): Promise<{ id: string; isNew: boolean }> {
  const { name } = opts;
  // Latest keyword campaign + post they came through (instagram_campaign / instagram_post), for reporting.
  const touch = clean({ instagram_campaign: opts.campaign, instagram_post: opts.postUrl });
  const found = await crmSearch('contacts', [{ propertyName: 'instagram_handle', operator: 'EQ', value: handle }]);
  if (found.results[0]) {
    if (Object.keys(touch).length) {
      await hs(`/crm/v3/objects/contacts/${found.results[0].id}`, { method: 'PATCH', body: JSON.stringify({ properties: touch }) });
    }
    return { id: found.results[0].id, isNew: false };
  }
  const { firstname, lastname } = name ? splitName(name) : { firstname: `@${handle}`, lastname: undefined };
  const created = await hs<{ id: string }>('/crm/v3/objects/contacts', {
    method: 'POST',
    body: JSON.stringify({
      properties: clean({
        instagram_handle: handle, firstname, lastname, naunas_lead_source: 'instagram_dm', ...touch,
        first_touch_source: 'instagram', first_touch_medium: 'dm', hubspot_owner_id: OWNER_ID,
      }),
    }),
  });
  return { id: created.id, isNew: true };
}

/** HubSpot note HTML → plain text. */
export const noteText = (html: string) => html
  .replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|li|h\d)>/gi, '\n').replace(/<[^>]+>/g, '')
  .replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
  .replace(/\n{3,}/g, '\n\n').trim();

/** All notes on a contact, newest first, as plain text. */
export async function notesForContact(contactId: string): Promise<{ id: string; at: string; text: string }[]> {
  const assoc = await hs<{ results: { toObjectId: number }[] }>(`/crm/v4/objects/contacts/${contactId}/associations/notes?limit=100`);
  if (!assoc.results.length) return [];
  const notes = await hs<{ results: { id: string; properties: { hs_note_body?: string; hs_timestamp?: string } }[] }>('/crm/v3/objects/notes/batch/read', {
    method: 'POST',
    body: JSON.stringify({ properties: ['hs_note_body', 'hs_timestamp'], inputs: assoc.results.map((a) => ({ id: String(a.toObjectId) })) }),
  });
  return notes.results
    .map((n) => ({ id: n.id, at: n.properties.hs_timestamp ?? '', text: noteText(n.properties.hs_note_body ?? '') }))
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
}

/**
 * Routine run reports: the Claude routine logs each run as a note on an internal contact
 * (FUNNEL.routine.logEmail) whose body starts with "NAUNAS_ROUTINE_REPORT" followed by JSON.
 * Newest first. Notes that don't parse are skipped.
 */
export async function routineReports<T>(logEmail: string, take: number): Promise<T[]> {
  return opsNotes<T>(logEmail, 'NAUNAS_ROUTINE_REPORT', take);
}

/**
 * Structured notes the Claude routine writes on the internal ops-log contact: body = MARKER + one JSON
 * object. Newest first, each with runAt (the note time). Notes that don't parse are skipped.
 */
export async function opsNotes<T>(logEmail: string, marker: string, take: number): Promise<T[]> {
  let contactId: string;
  try {
    contactId = (await hs<{ id: string }>(`/crm/v3/objects/contacts/${encodeURIComponent(logEmail)}?idProperty=email`)).id;
  } catch {
    return []; // nothing logged yet
  }
  return (await notesForContact(contactId))
    .flatMap((n) => {
      const at = n.text.indexOf(marker);
      if (at < 0) return [];
      try {
        const json = n.text.slice(n.text.indexOf('{', at), n.text.lastIndexOf('}') + 1);
        return [{ runAt: n.at, ...JSON.parse(json) } as T];
      } catch {
        return [];
      }
    })
    .slice(0, take);
}

/** Set contact properties (e.g. naunas_outreach_status). */
export async function updateContact(id: string, properties: Record<string, string>) {
  await hs(`/crm/v3/objects/contacts/${id}`, { method: 'PATCH', body: JSON.stringify({ properties }) });
}

/** Move a deal to a stage (Lost may carry a reason; Won/Lost set the close date). */
export async function setDealStage(dealId: string, stage: string, lostReason?: string) {
  const closing = stage === STAGE.won || stage === STAGE.lost;
  await hs(`/crm/v3/objects/deals/${dealId}`, {
    method: 'PATCH',
    body: JSON.stringify({ properties: clean({ dealstage: stage, naunas_lost_reason: lostReason, closedate: closing ? new Date().toISOString() : undefined }) }),
  });
}

export function splitName(full: string) {
  const parts = full.trim().split(/\s+/);
  return { firstname: parts[0], lastname: parts.slice(1).join(' ') || undefined };
}
