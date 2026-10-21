// Review and referral asks (2026-10-21), replacing the routine's job 4. The daily health cron finds deals
// that went Won 21 days ago (ask how it's working + for a short testimonial) or 60 days ago (ask for a
// referral), drafts each ask from the deal's notes in Naufal's voice, and puts it on Outreach → Today with
// Copy and Sent. Each deal/kind comes up once. Drafts only: Naufal sends from his own inbox.

import { getJSON, updateJSON } from '@/lib/store';
import { crmSearch, hs, hubspotUrl, notesForContact, STAGE } from '@/lib/hubspot';
import { aiJSON, aiReady } from '@/lib/ai';

export type Ask = { id: string; dealId: string; kind: 'review' | 'referral'; who: string; email?: string; draft: string; dealUrl: string; createdAt: string; doneAt?: string; outcome?: 'sent' | 'skipped' };
const PATH = 'ops/asks.json';
export const getAsks = () => getJSON<Ask[]>(PATH, []);
export const openAsks = async () => (await getAsks()).filter((a) => !a.doneAt);

export async function markAsk(id: string, outcome: 'sent' | 'skipped') {
  await updateJSON<Ask[]>(PATH, [], (list) => list.map((a) => (a.id === id ? { ...a, doneAt: new Date().toISOString(), outcome } : a)));
}

const SYSTEM = `You draft a short, personal email from Naufal (Naunas) to a client whose project finished. Naufal's voice: warm, direct, UK spelling, no hype, no exclamation marks, never pushy. Plain text, starts "Hi <first name>," and is signed "Naufal". 50-90 words.
Kind "review" (21 days after): ask how the system is working for them, and if it's helping, for a 2-3 sentence testimonial, offering 3 simple prompts (what was happening before, what changed, who they'd recommend it to), and permission to write it up as a short case study.
Kind "referral" (60 days after): ask who else they know running a service business where enquiries slip through; offer a free audit for that person. No incentives or discounts.
Only mention work that the NOTES actually show. Never invent results, numbers or details. No placeholders or brackets: if something is unknown, leave it out.`;

const DAY = 86_400_000;
const midnight = (daysAgo: number) => { const d = new Date(Date.now() - daysAgo * DAY); d.setUTCHours(0, 0, 0, 0); return d.getTime(); };

/** Find deals due an ask today and draft them. Returns how many new asks were added. */
export async function buildAsks(): Promise<number> {
  if (!process.env.HUBSPOT_TOKEN) return 0;
  const have = new Set((await getAsks()).map((a) => a.id));
  const fresh: Ask[] = [];
  for (const [kind, days] of [['review', 21], ['referral', 60]] as const) {
    const res = await crmSearch('deals', [
      { propertyName: 'dealstage', operator: 'EQ', value: STAGE.won },
      { propertyName: 'closedate', operator: 'GTE', value: String(midnight(days)) },
      { propertyName: 'closedate', operator: 'LT', value: String(midnight(days - 1)) },
    ], ['dealname', 'closedate']);
    for (const d of res.results) {
      const id = `${d.id}-${kind}`;
      if (have.has(id)) continue;
      const assoc = await hs<{ results: { toObjectId: number }[] }>(`/crm/v4/objects/deals/${d.id}/associations/contacts?limit=1`).catch(() => ({ results: [] }));
      const contactId = assoc.results[0] ? String(assoc.results[0].toObjectId) : undefined;
      const c = contactId ? await hs<{ properties: Record<string, string | null> }>(`/crm/v3/objects/contacts/${contactId}?properties=firstname,lastname,email,company`).catch(() => null) : null;
      const first = c?.properties.firstname ?? '';
      const notes = contactId ? (await notesForContact(contactId).catch(() => [])).slice(0, 8).map((n) => n.text.slice(0, 600)).join('\n---\n') : '';
      let draft = '';
      if (aiReady()) {
        draft = (await aiJSON<{ email: string }>(SYSTEM, `Kind: ${kind}\nFirst name: ${first || 'unknown'}\nDeal: ${d.properties.dealname ?? ''}\nNOTES:\n${notes || '(none)'}`, 'ask',
          { type: 'object', additionalProperties: false, required: ['email'], properties: { email: { type: 'string' } } }).catch(() => ({ email: '' }))).email.replace(/[[\]{}]/g, '');
      }
      fresh.push({
        id, dealId: d.id, kind, who: [first, c?.properties.lastname].filter(Boolean).join(' ') || (d.properties.dealname ?? 'Client'), email: c?.properties.email ?? undefined,
        draft: draft || (kind === 'review'
          ? `Hi${first ? ` ${first}` : ''},\n\nHow is the new system working for you so far? If it's helping, would you write 2-3 sentences about it: what was happening before, what changed, and who you'd recommend it to? And would you be happy for me to write it up as a short case study?\n\nNaufal`
          : `Hi${first ? ` ${first}` : ''},\n\nQuick one: do you know anyone else running a service business where enquiries slip through the cracks? I'd happily give them a free audit, no strings.\n\nNaufal`),
        dealUrl: hubspotUrl.deal(d.id), createdAt: new Date().toISOString(),
      });
    }
  }
  if (fresh.length) await updateJSON<Ask[]>(PATH, [], (list) => [...list, ...fresh.filter((f) => !list.some((a) => a.id === f.id))].slice(-200));
  return fresh.length;
}
