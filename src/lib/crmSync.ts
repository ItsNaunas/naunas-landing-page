// Cold-outreach firms → HubSpot (2026-10-21). A firm only enters the CRM once it has actually engaged (the
// outreach rule: no CRM records for firms that never answered). When one replies on any channel, this makes
// sure there is a contact (by email, else Instagram handle, else the owner's name), the company, and an open
// deal at Contacted with the channel as lead source, plus one note carrying the research. Later moments
// (said yes, leak report published) add notes to the same deal. Never contacts anyone.

import { hs, upsertContact, upsertInstagramContact, updateContact, ensureDeal, linkCompany, addNote, splitName, hubspotUrl, STAGE, type LeadSource } from '@/lib/hubspot';
import { getProspects, updateProspect, CHANNEL_LABEL, type Prospect, type OutreachChannel } from '@/lib/outreach';
import { escapeHtml } from '@/lib/mailer';
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
