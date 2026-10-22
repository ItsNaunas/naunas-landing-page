// Proposal + deposit in one link (2026-10-22): the step the site promises ("proposal, e-signature and deposit
// in one link"), now used by Naunas itself. Naufal drafts a proposal from a lead (AI writes the scope from the
// research brief and the call notes; he sets the price), publishes it to naunas.co.uk/p/<token>, the client
// reads it, accepts by typing their name, and pays the deposit through the Stripe Payment Link with the HubSpot
// deal id attached, so the existing Stripe webhook marks the deal Won and sends onboarding. Opens and the
// acceptance are logged, noted on the deal and pinged to Telegram. Private until published; 404 otherwise.

import { randomBytes } from 'node:crypto';
import { getJSON, putJSON, updateJSON } from '@/lib/store';
import { aiJSON, aiReady } from '@/lib/ai';
import { addNote, hs, hubspotUrl, setDealStage, STAGE } from '@/lib/hubspot';
import { logEvent } from '@/lib/events';
import { notify, line } from '@/lib/alert';
import { FUNNEL } from '@/config/funnel';

export type Block = { title: string; text: string };
export type ProposalStatus = 'draft' | 'sent' | 'opened' | 'accepted' | 'paid';
export type Proposal = {
  token: string; createdAt: string; updatedAt: string;
  contactId?: string; dealId?: string; prospectId?: string;
  client: string; firstName?: string; business?: string; email?: string;
  title: string; intro: string; blocks: Block[]; timeline: string; nextSteps: string;
  /** Free text, typed by Naufal (never generated): "£4,500 fixed", "£1,500 deposit, balance at handover". */
  price: string; deposit: string;
  /** Stripe Payment Link for the deposit; the deal id and email are added to it on the page. */
  paymentLink?: string; validUntil?: string;
  published: boolean; publishedAt?: string;
  opens: number; openedAt?: string; lastOpenAt?: string;
  acceptedAt?: string; acceptedBy?: string; paidAt?: string;
  /** Same-day recap email drafted after the call (lib/postcall). */
  recap?: string;
};
export type ProposalRow = { token: string; client: string; contactId?: string; dealId?: string; status: ProposalStatus; title: string; updatedAt: string };

const path = (token: string) => `proposals/${token}.json`;
const INDEX = 'proposals/index.json';
const now = () => new Date().toISOString();

export const statusOf = (p: Proposal): ProposalStatus => (p.paidAt ? 'paid' : p.acceptedAt ? 'accepted' : p.openedAt ? 'opened' : p.published ? 'sent' : 'draft');
export const STATUS_LABEL: Record<ProposalStatus, string> = { draft: 'Draft', sent: 'Sent', opened: 'Opened', accepted: 'Accepted', paid: 'Deposit paid' };
export const proposalUrl = (token: string) => `${FUNNEL.site}/p/${token}`;

export const getProposal = (token: string) => (/^[a-f0-9]{24}$/.test(token) ? getJSON<Proposal | null>(path(token), null) : Promise.resolve(null));
export const listProposals = () => getJSON<ProposalRow[]>(INDEX, []);
export async function proposalsFor(contactId?: string, dealId?: string): Promise<ProposalRow[]> {
  if (!contactId && !dealId) return [];
  return (await listProposals()).filter((r) => (contactId && r.contactId === contactId) || (dealId && r.dealId === dealId));
}

export async function saveProposal(p: Proposal): Promise<Proposal> {
  const next = { ...p, updatedAt: now() };
  await putJSON(path(p.token), next);
  await updateJSON<ProposalRow[]>(INDEX, [], (rows) => [
    { token: next.token, client: next.client, contactId: next.contactId, dealId: next.dealId, status: statusOf(next), title: next.title, updatedAt: next.updatedAt },
    ...rows.filter((r) => r.token !== next.token),
  ].slice(0, 300));
  return next;
}

export async function createProposal(init: Pick<Proposal, 'client'> & Partial<Pick<Proposal, 'contactId' | 'dealId' | 'prospectId' | 'firstName' | 'business' | 'email'>>): Promise<Proposal> {
  const t = now();
  return saveProposal({
    token: randomBytes(12).toString('hex'), createdAt: t, updatedAt: t, ...init,
    title: `The Client System for ${init.client}`, intro: '', blocks: [], timeline: '',
    nextSteps: 'Accept below, pay the deposit, and we book the kickoff call for next week.',
    price: '', deposit: '', published: false, opens: 0,
  });
}

/** The deposit link with the deal id (for the Stripe webhook) and their email prefilled. */
export function depositHref(p: Proposal): string | undefined {
  if (!p.paymentLink || !/^https:\/\/(buy\.stripe\.com|checkout\.stripe\.com)\//.test(p.paymentLink)) return undefined;
  const q = new URLSearchParams({ ...(p.dealId ? { client_reference_id: p.dealId } : {}), ...(p.email ? { prefilled_email: p.email } : {}) });
  return q.size ? `${p.paymentLink}${p.paymentLink.includes('?') ? '&' : '?'}${q}` : p.paymentLink;
}

// ---------------------------------------------------------------- AI draft (scope only, never the price)

const SYSTEM = `You write the body of a short proposal for Naufal (Naunas, naunas.co.uk) to send a business owner after their free audit call. Naunas installs "The Client System": the building blocks between an enquiry and a signed, onboarded client (instant reply + booking, proposal-to-payment in one link, deposit-triggered onboarding and client portal, review and referral asks, and a dashboard that traces every client to its source), built in the client's own accounts.

You get CONTEXT: what they wrote when booking, the website research brief, the call summary and action items. Use only that. Never invent numbers, prices, dates, results, tools they don't use or facts about them. Leave the price out entirely (Naufal sets it). UK spelling, warm, direct, no hype, no exclamation marks.

Return: title (under 10 words, e.g. "The Client System for Oakline Interiors"), intro (2-3 sentences addressed to the owner by first name: the problem in their own words from the context, and what this proposal does about it), blocks (3 to 5 building blocks to install, each {title, text}: what gets built and what changes for them and their clients, 2-4 sentences, concrete, citing their current gap where the context shows it), timeline (one or two sentences: phases and rough order, no dates unless given), nextSteps (one sentence: accept, deposit, kickoff).`;
const str = { type: 'string' };
const SCHEMA = {
  type: 'object', additionalProperties: false, required: ['title', 'intro', 'blocks', 'timeline', 'nextSteps'],
  properties: { title: str, intro: str, timeline: str, nextSteps: str, blocks: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['title', 'text'], properties: { title: str, text: str } } } },
};

export async function draftProposal(token: string, ctx: { business?: string; clientValue?: string; notWorking?: string; brief?: string; answers?: string; callSummary?: string; actions?: string[] }): Promise<Proposal> {
  if (!aiReady()) throw new Error('OPENAI_API_KEY is not set.');
  const p = await getProposal(token);
  if (!p) throw new Error('Proposal not found.');
  const user = [
    `CLIENT: ${p.client}${p.firstName ? ` (first name ${p.firstName})` : ''}${p.business ?? ctx.business ? `, ${p.business ?? ctx.business}` : ''}${ctx.clientValue ? `. A new client is worth ${ctx.clientValue} to them.` : ''}`,
    ctx.notWorking ? `IN THEIR WORDS: ${ctx.notWorking}` : '', ctx.answers ? `WHAT THEY TOLD US:\n${ctx.answers}` : '', ctx.brief ? `RESEARCH BRIEF:\n${ctx.brief}` : '',
    ctx.callSummary ? `CALL SUMMARY:\n${ctx.callSummary}` : '', ctx.actions?.length ? `ACTION ITEMS FROM THE CALL:\n- ${ctx.actions.join('\n- ')}` : '',
  ].filter(Boolean).join('\n\n');
  if (user.length < 120) throw new Error('Not enough context yet (no brief, answers or call notes on this lead). Write it by hand or add a note first.');
  const out = await aiJSON<{ title: string; intro: string; blocks: Block[]; timeline: string; nextSteps: string }>(SYSTEM, user.slice(0, 14000), 'proposal_draft', SCHEMA);
  return saveProposal({ ...p, title: out.title || p.title, intro: out.intro, blocks: out.blocks.slice(0, 5), timeline: out.timeline, nextSteps: out.nextSteps || p.nextSteps });
}

// ---------------------------------------------------------------- Lifecycle: publish → open → accept → paid

async function dealStage(dealId: string): Promise<string | undefined> {
  try { return (await hs<{ properties: { dealstage?: string } }>(`/crm/v3/objects/deals/${dealId}?properties=dealstage`)).properties.dealstage; } catch { return undefined; }
}

/** Publish (or take down). First publish: note on the deal and move it to Scope sent if it hasn't got there yet. */
export async function setPublished(token: string, published: boolean): Promise<Proposal> {
  const p = await getProposal(token);
  if (!p) throw new Error('Proposal not found.');
  const first = published && !p.published;
  const next = await saveProposal({ ...p, published, publishedAt: first ? now() : p.publishedAt });
  if (first) {
    await logEvent('proposal', `Proposal sent · ${p.client}`, `/dashboard/pipeline/proposal/${p.token}`);
    if (process.env.HUBSPOT_TOKEN && p.contactId) {
      await addNote(p.contactId, `<p><b>Proposal published:</b> <a href="${proposalUrl(p.token)}">${proposalUrl(p.token)}</a>${p.price ? `<br>Price: ${p.price}` : ''}${p.deposit ? `<br>Deposit: ${p.deposit}` : ''}</p>`, p.dealId).catch(() => {});
      if (p.dealId) {
        const stage = await dealStage(p.dealId);
        if (stage && ([STAGE.newEnquiry, STAGE.contacted, STAGE.auditBooked, STAGE.auditDone] as string[]).includes(stage)) await setDealStage(p.dealId, STAGE.scopeSent).catch(() => {});
      }
    }
  }
  return next;
}

/** A visit to the public page. Counted at most every 30 minutes; the first one pings Telegram and the deal. */
export async function recordOpen(token: string): Promise<void> {
  const p = await getProposal(token);
  if (!p?.published || p.acceptedAt) return;
  if (p.lastOpenAt && Date.now() - Date.parse(p.lastOpenAt) < 30 * 60_000) return;
  const first = !p.openedAt;
  await saveProposal({ ...p, opens: p.opens + 1, openedAt: p.openedAt ?? now(), lastOpenAt: now() });
  if (!first) return;
  await logEvent('proposal', `Proposal opened · ${p.client}`, `/dashboard/pipeline/proposal/${p.token}`);
  if (p.contactId && process.env.HUBSPOT_TOKEN) await addNote(p.contactId, '<p><b>Opened the proposal</b> for the first time.</p>', p.dealId).catch(() => {});
  await notify({
    level: 'lead', title: `${p.client} opened the proposal`, lines: [line('📄', 'Proposal', p.title), line('💷', 'Price', p.price)],
    next: 'If they go quiet for two days, a short message asking what questions came up usually moves it.',
    buttons: [{ text: 'Open proposal', url: `${FUNNEL.site}/dashboard/pipeline/proposal/${p.token}` }, ...(p.dealId ? [{ text: 'Deal in HubSpot', url: hubspotUrl.deal(p.dealId) }] : [])],
  });
}

/** The client typed their name and ticked the box. */
export async function accept(token: string, name: string): Promise<Proposal> {
  const p = await getProposal(token);
  if (!p?.published) throw new Error('This proposal is not available.');
  if (p.acceptedAt) return p;
  const next = await saveProposal({ ...p, acceptedAt: now(), acceptedBy: name.slice(0, 120) });
  await logEvent('proposal', `Proposal accepted · ${p.client} (${name})`, `/dashboard/pipeline/proposal/${p.token}`);
  if (p.contactId && process.env.HUBSPOT_TOKEN) await addNote(p.contactId, `<p><b>Accepted the proposal</b>, signed "${name}" on ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}.${p.price ? ` Price: ${p.price}.` : ''} ${p.paymentLink ? 'Deposit link shown.' : 'No deposit link on the proposal: send one.'}</p>`, p.dealId).catch(() => {});
  await notify({
    level: 'money', title: `${p.client} accepted the proposal`, lines: [line('✍️', 'Signed', name), line('💷', 'Price', p.price), line('🏦', 'Deposit', p.deposit)],
    next: p.paymentLink ? 'The deposit link is in front of them now. Stripe will tell you when it lands.' : 'No deposit link on this proposal: send them one today.',
    buttons: [{ text: 'Open proposal', url: `${FUNNEL.site}/dashboard/pipeline/proposal/${p.token}` }, ...(p.dealId ? [{ text: 'Deal in HubSpot', url: hubspotUrl.deal(p.dealId) }] : [])],
  });
  return next;
}

/** Called by the Stripe webhook once a deposit for this deal is paid. */
export async function markProposalPaid(dealId: string): Promise<void> {
  const rows = (await listProposals()).filter((r) => r.dealId === dealId && r.status !== 'paid');
  for (const r of rows) {
    const p = await getProposal(r.token);
    if (p && !p.paidAt) await saveProposal({ ...p, paidAt: now() });
  }
}
