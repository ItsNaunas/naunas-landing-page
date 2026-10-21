// Cold-outreach firms → HubSpot (2026-10-21). A firm only enters the CRM once it has actually engaged (the
// outreach rule: no CRM records for firms that never answered). When one replies on any channel, this makes
// sure there is a contact (by email, else Instagram handle, else the owner's name), the company, and an open
// deal at Contacted with the channel as lead source, plus one note carrying the research. Later moments
// (said yes, leak report published) add notes to the same deal. Never contacts anyone.

import { hs, crmSearch, domainOf, upsertContact, upsertInstagramContact, updateContact, ensureDeal, linkCompany, addNote, splitName, hubspotUrl, STAGE, type LeadSource } from '@/lib/hubspot';
import { getProspects, updateProspect, CHANNEL_LABEL, type Prospect, type OutreachChannel } from '@/lib/outreach';
import { escapeHtml } from '@/lib/mailer';
import { getJSON, putJSON, updateJSON } from '@/lib/store';
import { FUNNEL } from '@/config/funnel';

const SOURCE: Record<OutreachChannel, LeadSource> = { email: 'cold_email', instagram: 'instagram_dm', linkedin: 'linkedin' };

function channelOf(p: Prospect): OutreachChannel {
  if (p.channel) return p.channel;
  if (p.igRepliedAt || p.dmSentAt || p.warmedAt) return 'instagram';
  if (p.liDmAt || p.liAt || p.liEngagedAt) return 'linkedin';
  return 'email';
}

function researchNote(p: Prospect, channel: OutreachChannel): string {
  const r = p.drafts?.research;
  const rows = ([
    ['Channel', `Cold ${CHANNEL_LABEL[channel]}`], ['Owner', r?.owner], ['Team', r?.team], ['Projects', r?.portfolio],
    ['How enquiries reach them', r?.enquiryPath], ['The gap', r?.gap], ['Detail', r?.detail], ['Minimum', r?.minimum],
    ['Website', p.website], ['Instagram', p.instagram ? `https://instagram.com/${p.instagram}` : undefined], ['LinkedIn', r?.ownerLinkedin],
  ] as const).filter(([, v]) => v).map(([k, v]) => `<li><b>${k}:</b> ${escapeHtml(String(v))}</li>`).join('');
  return `<p><b>Cold outreach: ${escapeHtml(p.firm)} replied</b></p>${p.drafts?.dossier ? `<p>${escapeHtml(p.drafts.dossier)}</p>` : ''}<ul>${rows}</ul><p><a href="${FUNNEL.site}/dashboard/outreach/firm/${encodeURIComponent(p.id)}">Firm page in the dashboard</a></p>`;
}

/** Contact + company + open deal (at least Contacted) for a firm that engaged. Idempotent; saves the ids on the prospect. */
export async function syncProspect(id: string, opts: { status?: string; quote?: string } = {}): Promise<{ contactId: string; dealId: string; isNewDeal: boolean } | null> {
  if (!process.env.HUBSPOT_TOKEN) return null;
  const p = (await getProspects()).find((x) => x.id === id);
  if (!p) return null;
  const channel = channelOf(p);
  const r = p.drafts?.research;
  const name = r?.owner ? splitName(r.owner) : { firstname: p.firm, lastname: undefined as string | undefined };
  const email = r?.ownerEmail ?? p.email;
  let contactId = p.contactId;
  if (!contactId && email) contactId = await upsertContact({ email, ...name, website: p.website, leadSource: SOURCE[channel] });
  if (!contactId && p.instagram) {
    contactId = (await upsertInstagramContact(p.instagram, { name: r?.owner })).id;
    if (p.website) await updateContact(contactId, { website: p.website }).catch(() => {});
  }
  if (!contactId) {
    // LinkedIn-only firm: no email or Instagram to key on, so a plain contact by name (the firm page links back).
    contactId = (await hs<{ id: string }>('/crm/v3/objects/contacts', { method: 'POST', body: JSON.stringify({ properties: Object.fromEntries(Object.entries({
      ...name, website: p.website, naunas_lead_source: SOURCE[channel], hubspot_owner_id: FUNNEL.hubspot.ownerId,
    }).filter(([, v]) => v)) }) })).id;
  }
  const isNewDeal = !p.dealId;
  // Reuse the deal we opened before: HubSpot search lags a few seconds behind writes, so looking it up again could duplicate it.
  const dealId = p.dealId ?? await ensureDeal({ contactId, name: `${p.firm} · cold ${CHANNEL_LABEL[channel]}`, stage: STAGE.contacted, leadSource: SOURCE[channel] });
  // Reporting fields (Cold channel, Opener style, Days to reply, Gap found); separate so a missing field can't block the deal.
  if (isNewDeal) await patchDeal(dealId, dealFields(p)).catch(() => {});
  if (isNewDeal) await linkCompany({ website: p.website, name: p.firm, contactId, dealId }).catch(() => undefined);
  if (opts.status || isNewDeal) await updateContact(contactId, { naunas_outreach_status: opts.status ?? 'replied' }).catch(() => {});
  if (isNewDeal) await addNote(contactId, researchNote(p, channel) + (opts.quote ? `<blockquote>${escapeHtml(opts.quote)}</blockquote>` : ''), dealId);
  await updateProspect(id, { contactId, dealId });
  return { contactId, dealId, isNewDeal };
}

/** A note on the firm's HubSpot deal (syncing the firm first if it isn't in the CRM yet). */
export async function prospectNote(id: string, html: string, status?: string): Promise<void> {
  const ids = await syncProspect(id, status ? { status } : {});
  if (ids) await addNote(ids.contactId, html, ids.dealId);
}

export const dealLink = (dealId?: string) => (dealId ? hubspotUrl.deal(dealId) : undefined);

// ---------------------------------------------------------------- Deal fields (naunas_cold_channel etc.)

const DAY = 86_400_000;
/** Cold-outreach facts for HubSpot reporting: channel, opener style, days from first touch to reply, the gap. */
export function dealFields(p: Prospect): Record<string, string> {
  const channel = channelOf(p);
  // First real touch (warm-up, DM, LinkedIn engage/connect, first email); pressing Start only counts if nothing else does.
  const touches = [p.warmedAt, p.dmSentAt, p.liEngagedAt, p.liAt, p.sent?.[0]?.at].filter(Boolean) as string[];
  const first = (touches.length ? touches : [p.scheduledAt].filter(Boolean) as string[]).map((t) => Date.parse(t)).sort((x, y) => x - y)[0];
  const replied = Date.parse(p.igRepliedAt ?? p.repliedAt ?? new Date().toISOString());
  const out: Record<string, string> = { naunas_cold_channel: channel };
  if (channel === 'instagram' && p.dmStyle && /^[ABC]$/.test(p.dmStyle)) out.naunas_opener_style = p.dmStyle;
  if (first && replied >= first) out.naunas_days_to_reply = String(Math.round((replied - first) / DAY));
  if (p.drafts?.research?.gap) out.naunas_gap = p.drafts.research.gap.slice(0, 250);
  return out;
}

async function patchDeal(dealId: string, properties: Record<string, string>) {
  await hs(`/crm/v3/objects/deals/${dealId}`, { method: 'PATCH', body: JSON.stringify({ properties }) });
}

// ---------------------------------------------------------------- Booking from a cold prospect

const FREE_MAIL = /^(gmail|googlemail|yahoo|hotmail|outlook|live|icloud|me|aol|proton|protonmail|msn)\./i;

/** The cold-outreach firm behind a booking: same email, or same website / email domain. */
export async function prospectForBooking(email: string, website?: string): Promise<Prospect | null> {
  const list = await getProspects();
  const e = email.toLowerCase();
  const host = e.split('@')[1] ?? '';
  const domains = [domainOf(website), FREE_MAIL.test(`${host}.`) || !host ? undefined : host].filter(Boolean) as string[];
  return list.find((p) => [p.email, p.drafts?.research?.ownerEmail].some((x) => x?.toLowerCase() === e))
    ?? list.find((p) => !!p.website && domains.includes(domainOf(p.website) ?? '#'))
    ?? null;
}

/** A cold prospect booked an audit: stop their sequences, tie the booking deal to the firm, add research + report. */
export async function onColdBooking(p: Prospect, ids: { contactId?: string; dealId?: string }): Promise<void> {
  const now = new Date().toISOString();
  await updateProspect(p.id, {
    bookedAt: now, ...(['drafted', 'scheduled', 'active'].includes(p.status) ? { status: 'replied' as const, repliedAt: p.repliedAt ?? now } : {}),
    ...(ids.contactId ? { contactId: ids.contactId } : {}), ...(ids.dealId ? { dealId: ids.dealId } : {}),
  });
  if (!ids.contactId || !process.env.HUBSPOT_TOKEN) return;
  const fresh = (await getProspects()).find((x) => x.id === p.id) ?? p;
  const report = fresh.reportToken ? `<p>Leak report: <a href="${FUNNEL.site}/r/${fresh.reportToken}">${FUNNEL.site}/r/${fresh.reportToken}</a></p>` : '';
  await addNote(ids.contactId, `<p><b>Booked from cold outreach</b></p>${researchNote(fresh, channelOf(fresh)).replace(/^<p><b>[^<]*<\/b><\/p>/, '')}${report}`, ids.dealId);
  if (ids.dealId) await patchDeal(ids.dealId, dealFields(fresh)).catch(() => {});
  await updateContact(ids.contactId, { naunas_outreach_status: 'audit_booked' }).catch(() => {});
}

// ---------------------------------------------------------------- HubSpot back to the dashboard

/**
 * Deals moved to Won or Lost in HubSpot (on the phone, by hand) close the firm here too: sequences stop and
 * the lost reason is kept for Results. One batch read for every firm that has a deal and isn't closed yet.
 */
export async function pullDealStages(): Promise<number> {
  if (!process.env.HUBSPOT_TOKEN) return 0;
  const open = (await getProspects()).filter((p) => p.dealId && !p.wonAt && !p.lostAt);
  if (!open.length) return 0;
  type D = { id: string; properties: { dealstage?: string; naunas_lost_reason?: string; closed_lost_reason?: string; closedate?: string } };
  const res = await hs<{ results: D[] }>('/crm/v3/objects/deals/batch/read', {
    method: 'POST', body: JSON.stringify({ properties: ['dealstage', 'naunas_lost_reason', 'closed_lost_reason', 'closedate'], inputs: open.slice(0, 100).map((p) => ({ id: p.dealId })) }),
  });
  const byId = new Map(res.results.map((d) => [d.id, d.properties]));
  let n = 0;
  await updateJSON<Prospect[]>('outreach/prospects.json', [], (list) => list.map((p) => {
    const d = p.dealId ? byId.get(p.dealId) : undefined;
    if (!d || p.wonAt || p.lostAt) return p;
    const at = d.closedate || new Date().toISOString();
    const stop = ['drafted', 'scheduled', 'active', 'replied'].includes(p.status);
    if (d.dealstage === STAGE.won) { n++; return { ...p, wonAt: at, ...(stop ? { status: 'finished' as const } : {}) }; }
    if (d.dealstage === STAGE.lost) { n++; return { ...p, lostAt: at, lostReason: d.naunas_lost_reason || d.closed_lost_reason || undefined, ...(stop ? { status: 'stopped' as const } : {}) }; }
    return p;
  }));
  return n;
}

// ---------------------------------------------------------------- Before research: already known?

/** Why this firm shouldn't be cold-pitched, from HubSpot (client, open deal, lost in the last 6 months, known contact), or null. */
export async function knownInHubSpot(emails: string[], website?: string): Promise<string | null> {
  if (!process.env.HUBSPOT_TOKEN) return null;
  const domain = domainOf(website);
  const ids = new Set<string>();
  for (const e of [...new Set(emails.map((x) => x.toLowerCase()))].slice(0, 3)) {
    const r = await crmSearch('contacts', [{ propertyName: 'email', operator: 'EQ', value: e }], ['email']).catch(() => null);
    r?.results.forEach((c) => ids.add(c.id));
  }
  if (domain) {
    const r = await crmSearch('contacts', [{ propertyName: 'hs_email_domain', operator: 'EQ', value: domain }], ['email']).catch(() => null);
    r?.results.slice(0, 5).forEach((c) => ids.add(c.id));
    const co = await hs<{ results: { id: string }[] }>('/crm/v3/objects/companies/search', { method: 'POST', body: JSON.stringify({ filterGroups: [{ filters: [{ propertyName: 'domain', operator: 'EQ', value: domain }] }], limit: 1 }) }).catch(() => null);
    if (co?.results[0]) {
      const a = await hs<{ results: { toObjectId: number }[] }>(`/crm/v4/objects/companies/${co.results[0].id}/associations/contacts?limit=5`).catch(() => null);
      a?.results.forEach((x) => ids.add(String(x.toObjectId)));
    }
  }
  if (!ids.size) return null;
  const dealIds = new Set<string>();
  for (const id of [...ids].slice(0, 5)) {
    const a = await hs<{ results: { toObjectId: number }[] }>(`/crm/v4/objects/contacts/${id}/associations/deals?limit=10`).catch(() => null);
    a?.results.forEach((x) => dealIds.add(String(x.toObjectId)));
  }
  if (dealIds.size) {
    const deals = await hs<{ results: { properties: { dealstage?: string; closedate?: string } }[] }>('/crm/v3/objects/deals/batch/read', {
      method: 'POST', body: JSON.stringify({ properties: ['dealstage', 'closedate'], inputs: [...dealIds].slice(0, 20).map((id) => ({ id })) }),
    }).catch(() => ({ results: [] as { properties: { dealstage?: string; closedate?: string } }[] }));
    const st = deals.results.map((d) => d.properties);
    if (st.some((d) => d.dealstage === STAGE.won)) return 'already a client in HubSpot';
    if (st.some((d) => d.dealstage && d.dealstage !== STAGE.lost)) return 'already has an open deal in HubSpot';
    const lost = st.filter((d) => d.dealstage === STAGE.lost && d.closedate && Date.now() - Date.parse(d.closedate) < 180 * DAY);
    if (lost.length) return `deal lost in HubSpot on ${lost[0].closedate!.slice(0, 10)}`;
  }
  return 'already a contact in HubSpot';
}

// ---------------------------------------------------------------- Tasks (promised Looms/PDFs)

/** A HubSpot to-do due at `due`, on the contact and deal (shows in the HubSpot phone app). Returns the task id. */
export async function createTask(contactId: string, dealId: string | undefined, subject: string, due: Date): Promise<string> {
  const associations = [{ to: { id: contactId }, types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 204 }] }];
  if (dealId) associations.push({ to: { id: dealId }, types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 216 }] });
  const t = await hs<{ id: string }>('/crm/v3/objects/tasks', {
    method: 'POST',
    body: JSON.stringify({ properties: { hs_task_subject: subject.slice(0, 200), hs_timestamp: due.toISOString(), hs_task_status: 'NOT_STARTED', hs_task_type: 'TODO', hs_task_priority: 'HIGH', hubspot_owner_id: FUNNEL.hubspot.ownerId }, associations }),
  });
  return t.id;
}

export async function completeTask(taskId: string) {
  await hs(`/crm/v3/objects/tasks/${taskId}`, { method: 'PATCH', body: JSON.stringify({ properties: { hs_task_status: 'COMPLETED' } }) });
}

/** pullDealStages at most every 15 minutes (called when Prospects or a firm page opens). */
export async function pullDealStagesSoon(): Promise<void> {
  const last = await getJSON<{ at?: string }>('meta/deal-sync.json', {});
  if (last.at && Date.now() - Date.parse(last.at) < 15 * 60_000) return;
  await putJSON('meta/deal-sync.json', { at: new Date().toISOString() });
  await pullDealStages();
}

/** Short outcome label for a firm: Won, Lost (reason), Booked. */
export const outcomeOf = (p: Prospect) => (p.wonAt ? 'Won' : p.lostAt ? `Lost${p.lostReason ? `: ${p.lostReason}` : ''}` : p.bookedAt ? 'Booked' : undefined);
