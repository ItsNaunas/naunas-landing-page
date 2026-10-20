// Old warm leads to re-open (Outreach → Today's list). The LinkedIn and Instagram audits put people who
// replied or showed interest into HubSpot; most went quiet after a call. Each day the list offers a few who
// haven't been touched in 14 days, with a short check-in written from their own HubSpot notes (OpenAI, no
// invented facts). Naufal sends it himself in the app and ticks it off; nothing is sent from here.

import { getJSON, updateJSON } from '@/lib/store';
import { crmSearch, notesForContact, addNote, updateContact } from '@/lib/hubspot';
import { aiJSON, aiReady } from '@/lib/ai';

export type WarmLead = {
  id: string; name: string; company?: string; status: string; source: string;
  instagram?: string; linkedin?: string; channel: 'Instagram' | 'LinkedIn'; href?: string;
};
type Touch = { at: string; outcome: 'sent' | 'snoozed' | 'dropped'; until?: string };

const TOUCHES = 'outreach/touches.json';
const DRAFTS = 'outreach/checkin-drafts.json';
const DAY = 86_400_000;
export const PER_DAY = 5;

export const getTouches = () => getJSON<Record<string, Touch>>(TOUCHES, {});
export const getCheckinDrafts = () => getJSON<Record<string, { text: string; at: string }>>(DRAFTS, {});

export async function warmLeads(): Promise<WarmLead[]> {
  const res = await crmSearch('contacts', [
    { propertyName: 'naunas_outreach_status', operator: 'IN', values: ['interested', 'replied'] },
    { propertyName: 'naunas_lead_source', operator: 'IN', values: ['linkedin', 'instagram_dm'] },
  ], ['firstname', 'lastname', 'company', 'naunas_outreach_status', 'naunas_lead_source', 'instagram_handle', 'hs_linkedin_url']);
  return res.results.map((c) => {
    const p = c.properties;
    const ig = p.instagram_handle ?? undefined;
    const li = p.hs_linkedin_url ?? undefined;
    const channel = p.naunas_lead_source === 'instagram_dm' || (!li && ig) ? 'Instagram' : 'LinkedIn';
    return {
      id: c.id, name: [p.firstname, p.lastname].filter(Boolean).join(' ') || (ig ? `@${ig}` : 'Unknown'),
      company: p.company ?? undefined, status: p.naunas_outreach_status ?? 'replied', source: p.naunas_lead_source ?? '',
      instagram: ig, linkedin: li, channel,
      href: channel === 'Instagram' ? (ig ? `https://ig.me/m/${ig}` : undefined) : li,
    };
  });
}

/** Today's check-ins: untouched for 14 days (or past their snooze), interested first. */
export function dueCheckins(leads: WarmLead[], touches: Record<string, Touch>, now = Date.now()) {
  return leads
    .filter((l) => {
      const t = touches[l.id];
      if (!t) return true;
      if (t.outcome === 'dropped') return false;
      if (t.outcome === 'snoozed') return !!t.until && Date.parse(t.until) <= now;
      return Date.parse(t.at) <= now - 14 * DAY;
    })
    .sort((a, b) => (a.status === 'interested' ? 0 : 1) - (b.status === 'interested' ? 0 : 1))
    .slice(0, PER_DAY);
}

const SYSTEM = `You write one short check-in DM for Naufal (Naunas: builds client systems, enquiry-to-booking-to-onboarding, for service businesses) to someone he talked to before.
Rules: under 40 words. Warm, direct, UK spelling, no exclamation marks, no emojis, no links, no pitch, no placeholders or square brackets.
Use ONLY facts from the notes (what was discussed, when). Never invent results, numbers, names or claims. Refer to the last real moment (e.g. the call in April) and end with one easy question about where things stand for them now.
If the notes are thin, write a simple, honest re-open that asks how things are going with their business.`;

export async function draftCheckin(lead: Pick<WarmLead, 'id' | 'name' | 'company' | 'channel'>): Promise<string> {
  if (!aiReady()) throw new Error('OPENAI_API_KEY is not set');
  const notes = (await notesForContact(lead.id).catch(() => [])).slice(0, 4).map((n) => `${n.at.slice(0, 10)}: ${n.text.slice(0, 600)}`).join('\n');
  const first = lead.name.startsWith('@') ? '' : lead.name.split(' ')[0];
  const out = await aiJSON<{ message: string }>(SYSTEM,
    `Person: ${first || 'unknown first name (start with "Hey,")'}${lead.company ? `, ${lead.company}` : ''}. Channel: ${lead.channel} DM. Today: ${new Date().toISOString().slice(0, 10)}.\nNotes:\n${notes || '(none)'}`,
    'checkin', { type: 'object', additionalProperties: false, required: ['message'], properties: { message: { type: 'string' } } });
  const text = out.message.trim();
  await updateJSON<Record<string, { text: string; at: string }>>(DRAFTS, {}, (d) => ({ ...d, [lead.id]: { text, at: new Date().toISOString() } }));
  return text;
}

export async function recordCheckin(lead: { id: string; channel: string }, outcome: Touch['outcome']) {
  const now = new Date();
  const touch: Touch = { at: now.toISOString(), outcome, ...(outcome === 'snoozed' ? { until: new Date(now.getTime() + 30 * DAY).toISOString() } : {}) };
  await updateJSON<Record<string, Touch>>(TOUCHES, {}, (t) => ({ ...t, [lead.id]: touch }));
  if (outcome === 'sent') await addNote(lead.id, `Checked in via ${lead.channel} DM on ${now.toISOString().slice(0, 10)} (from the dashboard list).`).catch(() => {});
  if (outcome === 'dropped') await updateContact(lead.id, { naunas_outreach_status: 'finished' }).catch(() => {});
}
