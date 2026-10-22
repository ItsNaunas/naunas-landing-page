// Post-call (2026-10-23), replacing the Claude routine's job 2. When Fathom finishes a call with someone whose
// deal is at Audit booked: move the deal to Audit done, write the same-day recap email (scope in their words,
// proposal + deposit link coming), and start a proposal draft from the call (lib/proposal: scope only, Naufal
// sets the price). The recap sits on the proposal and the deal; nothing is sent.

import { aiJSON, aiReady } from '@/lib/ai';
import { addNote, hs, setDealStage, STAGE } from '@/lib/hubspot';
import { createProposal, draftProposal, saveProposal, getProposal, proposalsFor } from '@/lib/proposal';
import { FUNNEL } from '@/config/funnel';

const SYSTEM = `You write the same-day recap email Naufal (Naunas) sends after a free audit call, modelled on his best close: thank them, list the agreed scope as 3 to 5 bullets in THEIR words from the call, say the proposal and the deposit link are coming today or tomorrow, and that work starts as soon as the deposit lands. Warm, short, UK spelling, no exclamation marks, signed "Naufal". Use only the call summary and action items; never invent scope, prices or dates.`;

type Guest = { contactId: string; name?: string; email: string };

/** Returns the proposal editor path when a draft was started, else null. */
export async function afterCall(g: Guest, call: { title?: string; summary: string; actions: string[] }): Promise<string | null> {
  if (!process.env.HUBSPOT_TOKEN) return null;
  const deals = await hs<{ results: { toObjectId: string | number }[] }>(`/crm/v4/objects/contacts/${g.contactId}/associations/deals`).catch(() => ({ results: [] }));
  let dealId: string | undefined;
  for (const d of deals.results) {
    const stage = (await hs<{ properties: { dealstage?: string } }>(`/crm/v3/objects/deals/${d.toObjectId}?properties=dealstage`).catch(() => null))?.properties.dealstage;
    if (stage === STAGE.auditBooked) { dealId = String(d.toObjectId); break; }
  }
  if (!dealId) return null;
  await setDealStage(dealId, STAGE.auditDone).catch(() => {});

  let recap = '';
  if (aiReady() && call.summary.trim()) {
    recap = (await aiJSON<{ email: string }>(SYSTEM, `GUEST: ${g.name ?? g.email}\nCALL: ${call.title ?? ''}\n\nSUMMARY:\n${call.summary.slice(0, 8000)}\n\nACTION ITEMS:\n- ${call.actions.join('\n- ')}`, 'recap', { type: 'object', additionalProperties: false, required: ['email'], properties: { email: { type: 'string' } } }).catch(() => ({ email: '' }))).email;
  }
  const existing = (await proposalsFor(g.contactId, dealId)).find((r) => r.status === 'draft');
  const p = existing ? await getProposal(existing.token) : await createProposal({ client: g.name ?? g.email, contactId: g.contactId, dealId, firstName: g.name?.split(' ')[0], email: g.email });
  if (!p) return null;
  if (recap) await saveProposal({ ...p, recap });
  if (aiReady()) await draftProposal(p.token, { callSummary: call.summary, actions: call.actions }).catch(() => undefined);
  const path = `/dashboard/pipeline/proposal/${p.token}`;
  await addNote(g.contactId, `<p><b>After the call:</b> deal moved to Audit done. Proposal draft: <a href="${FUNNEL.site}${path}">${FUNNEL.site}${path}</a>${recap ? `</p><p><b>Recap email draft</b></p><p>${recap.replace(/</g, '&lt;').replace(/\n/g, '<br/>')}` : ''}</p>`, dealId).catch(() => {});
  return path;
}
