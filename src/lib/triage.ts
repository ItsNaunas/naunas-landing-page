// Reply triage in the dashboard (2026-10-23), replacing the Claude routine's job 1. Reads contact@'s inbox (IMAP),
// keeps only mail from people HubSpot knows (leads, prospects, clients) or cold-outreach firms, and for each new
// message: stops their MailerLite sequence (Leak Map / booking nudge), notes the reply on the contact, sets the
// cold-outreach status (interested also opens a deal at Contacted), and writes a draft reply in Naufal's voice.
// Drafts show on Outreach → Today under "They replied". Nothing is ever sent from here.

import { getJSON, updateJSON } from '@/lib/store';
import { recentInbound, inboxReady, type Mail } from '@/lib/inbox';
import { crmSearch, addNote, updateContact, ensureDeal, STAGE } from '@/lib/hubspot';
import { removeFromGroup, LEAK_MAP_GROUP, ENQUIRED_GROUP } from '@/lib/mailerlite';
import { aiJSON, aiReady } from '@/lib/ai';
import { getProspects } from '@/lib/outreach';
import { logEvent } from '@/lib/events';
import { isTest } from '@/lib/scoreboard';
import { FUNNEL } from '@/config/funnel';

export type Kind = 'interested' | 'not_interested' | 'out_of_office' | 'bounce' | 'question' | 'replied';
export type Triaged = {
  messageId: string; at: string; from: string; who: string; subject: string; text: string;
  contactId?: string; firmId?: string; cold: boolean; kind: Kind; summary: string; draft?: string; needsYou?: boolean;
  doneAt?: string;
};
const PATH = 'inbox/triage.json';
const META = 'meta/triage-run.json';
export const getTriaged = () => getJSON<Triaged[]>(PATH, []);
export const openTriaged = async () => (await getTriaged()).filter((t) => !t.doneAt && t.kind !== 'out_of_office' && t.kind !== 'bounce');

const SYSTEM = `You triage one email sent to Naufal's business inbox (Naunas, naunas.co.uk: installs "The Client System", everything between an enquiry and a signed, onboarded client, for high-value project businesses; the next step he wants is a free 30-minute audit at ${FUNNEL.site}/audit).
Return: kind (interested = yes / tell me more / can we talk; not_interested = no / stop / remove me; out_of_office = an auto-reply; bounce = delivery failure; question = asks about price, budget, terms, scope or anything that needs Naufal's judgement; replied = anything else human), summary (one line, under 20 words), needsYou (true for question, or anything sensitive), draft (a reply in Naufal's voice: warm, direct, short, UK spelling, no exclamation marks, signed "Naufal"; empty for out_of_office and bounce).
Draft rules: answer what they said first. not_interested: one polite line and nothing else. "who are you / what do you do": two sentences on what Naunas does. interested: two sentences on what the free audit covers + the link ${FUNNEL.site}/audit?utm_source=email&utm_medium=reply. question: a careful holding reply that commits to nothing on price or terms. Never invent facts, numbers, prices or results.`;
const SCHEMA = {
  type: 'object', additionalProperties: false, required: ['kind', 'summary', 'needsYou', 'draft'],
  properties: { kind: { type: 'string', enum: ['interested', 'not_interested', 'out_of_office', 'bounce', 'question', 'replied'] }, summary: { type: 'string' }, needsYou: { type: 'boolean' }, draft: { type: 'string' } },
};

const AUTOMATED = /no-?reply|mailer-daemon|postmaster|notifications?@|newsletter|bounce|calendar-notification|@(mailerlite|hubspot|stripe|cal\.com|vercel|github|google)\./i;

/** Triage new inbound mail. Throttled to every 15 minutes unless forced. Returns how many were triaged. */
export async function triageInbox(opts: { force?: boolean } = {}): Promise<number> {
  if (!inboxReady()) return 0;
  const meta = await getJSON<{ at?: string }>(META, {});
  if (!opts.force && meta.at && Date.now() - Date.parse(meta.at) < 15 * 60_000) return 0;
  await updateJSON<{ at?: string }>(META, {}, () => ({ at: new Date().toISOString() }));
  const seen = new Set((await getTriaged()).map((t) => t.messageId));
  const mail = (await recentInbound(3, 60)).filter((m) => m.messageId && !seen.has(m.messageId) && !AUTOMATED.test(m.from) && !isTest(m.from) && !/naunas\.co\.uk$/i.test(m.from));
  if (!mail.length) return 0;
  const prospects = await getProspects().catch(() => []);
  const out: Triaged[] = [];
  for (const m of mail.slice(0, 15)) {
    const t = await triageOne(m, prospects).catch((err) => { console.error('[triage]', m.from, err); return null; });
    if (t) out.push(t);
  }
  if (out.length) await updateJSON<Triaged[]>(PATH, [], (list) => [...out, ...list].slice(0, 300));
  return out.length;
}

async function triageOne(m: Mail, prospects: Awaited<ReturnType<typeof getProspects>>): Promise<Triaged | null> {
  const email = m.from.toLowerCase();
  const firm = prospects.find((p) => [p.email, p.drafts?.research?.ownerEmail].some((x) => x?.toLowerCase() === email));
  const found = process.env.HUBSPOT_TOKEN ? await crmSearch('contacts', [{ propertyName: 'email', operator: 'EQ', value: email }], ['naunas_lead_source', 'firstname', 'num_associated_deals']).catch(() => null) : null;
  const contact = found?.results[0];
  if (!contact && !firm) return null; // not someone we know: leave it in the inbox
  const cold = contact?.properties.naunas_lead_source === 'cold_email' || !!firm;
  const who = contact?.properties.firstname || m.fromName || firm?.firm || email;

  let ai: { kind: Kind; summary: string; needsYou: boolean; draft: string } = { kind: 'replied', summary: (m.subject || 'Replied').slice(0, 80), needsYou: false, draft: '' };
  if (aiReady()) ai = await aiJSON(SYSTEM, `FROM: ${who} <${email}>${firm ? ` (cold-outreach firm: ${firm.firm}${firm.drafts?.research?.gap ? `; their gap: ${firm.drafts.research.gap}` : ''})` : ''}\nSUBJECT: ${m.subject}\n\n${m.text.slice(0, 4000)}`, 'triage', SCHEMA);

  // A reply stops the nurture sequences (same as booking does).
  if (ai.kind !== 'bounce' && ai.kind !== 'out_of_office') for (const g of [LEAK_MAP_GROUP, ENQUIRED_GROUP]) await removeFromGroup(email, g).catch(() => false);
  if (contact) {
    await addNote(contact.id, `<p><b>Replied ${new Date(m.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}:</b> ${ai.summary.replace(/</g, '&lt;')}</p>`).catch(() => {});
    if (cold) {
      const status = ai.kind === 'interested' ? 'interested' : ai.kind === 'not_interested' ? 'not_interested' : ai.kind === 'out_of_office' ? 'out_of_office' : ai.kind === 'bounce' ? 'bounced' : 'replied';
      await updateContact(contact.id, { naunas_outreach_status: status }).catch(() => {});
      if (ai.kind === 'interested' && !Number(contact.properties.num_associated_deals ?? 0)) {
        await ensureDeal({ contactId: contact.id, name: `${firm?.firm ?? who} · cold email`, stage: STAGE.contacted, leadSource: 'cold_email' }).catch(() => {});
      }
    }
  }
  await logEvent('outreach_reply', `Reply · ${firm?.firm ?? who}: ${ai.summary}`.slice(0, 150), contact ? `/dashboard/leads/${contact.id}` : firm ? `/dashboard/outreach/firm/${encodeURIComponent(firm.id)}` : undefined);
  return {
    messageId: m.messageId, at: m.date, from: email, who: firm ? `${who} · ${firm.firm}` : who, subject: m.subject, text: m.text.slice(0, 2000),
    contactId: contact?.id, firmId: firm?.id, cold, kind: ai.kind, summary: ai.summary, draft: ai.draft || undefined, needsYou: ai.needsYou,
  };
}

export async function markTriaged(messageId: string) {
  await updateJSON<Triaged[]>(PATH, [], (list) => list.map((t) => (t.messageId === messageId ? { ...t, doneAt: new Date().toISOString() } : t)));
}
