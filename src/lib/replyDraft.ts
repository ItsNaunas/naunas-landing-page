// Reply drafting in the dashboard (2026-10-22): when a cold prospect or a lead writes back, one AI call turns
// what they said + what we know (research, the gap, the leak report link, the thread so far) into a reply in
// Naufal's voice that moves towards the free audit. Shown with a Copy button; Naufal sends it himself.

import { aiJSON, aiReady } from '@/lib/ai';
import { FUNNEL } from '@/config/funnel';

const SYSTEM = `You draft replies for Naufal (Naunas, naunas.co.uk). Naunas installs "The Client System": everything between an enquiry and a signed, onboarded client, for high-value project businesses. The next step he wants is a free 30-minute audit call (booking page: ${FUNNEL.site}/audit). He may also have a "leak report" for them: a short page showing the gaps visible on their own website.

You get CONTEXT (who they are, their gap, what was said before) and THEIR MESSAGE. Write ONE reply as Naufal:
- Answer what they actually said first, in their terms. Then one small step towards the call, never a hard pitch.
- If a leak report link is in the context and they haven't seen it, offer it in one line with the link. Otherwise no links except the booking page, and only when a call is the natural next step.
- Voice: warm, direct, specific, UK spelling, plain words, no hype, no exclamation marks, no corporate phrases, no "I hope this finds you well". Never invent facts, numbers, results or claims about other firms.
- Length: Instagram or LinkedIn DM under 70 words; email under 130 words, signed "Naufal". No placeholders or brackets.`;

export type ReplyCtx = {
  channel: 'instagram' | 'linkedin' | 'email'; who: string; firm?: string; firstName?: string;
  research?: string; gap?: string; reportUrl?: string; previous?: string[]; theirMessage: string;
};

export async function draftReply(c: ReplyCtx): Promise<string> {
  if (!aiReady()) throw new Error('OPENAI_API_KEY is not set, so replies can’t be drafted here.');
  if (c.theirMessage.trim().length < 2) throw new Error('Paste what they said first.');
  const user = [
    `CHANNEL: ${c.channel}. THEY ARE: ${c.who}${c.firm ? ` (${c.firm})` : ''}${c.firstName ? `, first name ${c.firstName}` : ''}.`,
    c.gap ? `THEIR GAP (from research): ${c.gap}` : '', c.research ? `RESEARCH: ${c.research}` : '',
    c.reportUrl ? `LEAK REPORT LINK (published, they may not have seen it): ${c.reportUrl}` : 'No leak report yet.',
    c.previous?.length ? `WHAT WAS SAID BEFORE (oldest first):\n${c.previous.map((m) => `- ${m}`).join('\n')}` : '',
    `THEIR MESSAGE:\n${c.theirMessage.trim()}`,
  ].filter(Boolean).join('\n\n');
  const out = await aiJSON<{ reply: string }>(SYSTEM, user.slice(0, 12000), 'reply_draft', { type: 'object', additionalProperties: false, required: ['reply'], properties: { reply: { type: 'string' } } });
  return out.reply.trim();
}
