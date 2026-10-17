// "Adapt": turns one idea (plus an optional video transcript) into a LinkedIn post, an Instagram caption with
// the keyword call to action, and a TikTok caption, each with three hook options, plus a LinkedIn first
// comment, a newsletter blurb and a check against the ICP. The composer shows it all for editing.

import { aiJSON } from './ai';
import { VOICE, EXAMPLES } from '../config/voice';

export type Adapted = {
  linkedin: { hooks: string[]; text: string; firstComment: string };
  instagram: { hooks: string[]; caption: string };
  tiktok: { hooks: string[]; caption: string };
  newsletterBlurb: string;
  icpNote: string;
  unsupported: string[];
};

const str = { type: 'string' };
const hooks = { type: 'array', items: str };
const SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['linkedin', 'instagram', 'tiktok', 'newsletterBlurb', 'icpNote', 'unsupported'],
  properties: {
    linkedin: { type: 'object', additionalProperties: false, required: ['hooks', 'text', 'firstComment'], properties: { hooks, text: str, firstComment: str } },
    instagram: { type: 'object', additionalProperties: false, required: ['hooks', 'caption'], properties: { hooks, caption: str } },
    tiktok: { type: 'object', additionalProperties: false, required: ['hooks', 'caption'], properties: { hooks, caption: str } },
    newsletterBlurb: str,
    icpNote: str,
    unsupported: { type: 'array', items: str },
  },
};

const SYSTEM = `You write social posts for Naunas. Follow this voice exactly:

${VOICE}

Examples of hooks that worked (for tone and rhythm only; never reuse their facts, tools or numbers):
${EXAMPLES.map((e) => `- ${e}`).join('\n')}

Rules for every output:
- Use ONLY facts, numbers, names, examples and stories that appear in the source. Do NOT invent scenarios, days of the week, timelines, quotes, client stories or results to make it vivid. Rephrasing and restructuring is fine; adding new specifics is not.
- "unsupported": list every phrase you wrote that adds a specific detail not in the source (empty array only if there are truly none).
- Each channel gets exactly 3 hooks (opening lines), different from each other AND written for that platform (LinkedIn: a statement that stops a scroll in a professional feed; Instagram: punchy and visual; TikTok: spoken-style, under 10 words). The channel text must start with its first hook.
- LinkedIn: hook line, blank line, short paragraphs (1-2 sentences), 1,000-1,600 characters, 3-5 relevant hashtags on the last line, NO links in the post. firstComment: one short line that ends with the literal text {link}.
- Instagram: 300-900 characters, hook first, line breaks, then a final line exactly like "Comment KEYWORD and I'll send you OFFER." using the given keyword and offer, then 3-6 hashtags.
- TikTok: under 300 characters, punchy, 3-5 hashtags.
- newsletterBlurb: 2-3 sentences summarising the post for a weekly email, in the same voice.
- icpNote: one sentence: does this speak to owners of US interior design / high-ticket project businesses? If not, how to angle it.`;

export async function adapt(input: { idea: string; transcript?: string; keyword: string; offer: string }): Promise<Adapted> {
  const user = [
    `Instagram keyword: ${input.keyword}`,
    `What the keyword gets them: ${input.offer}`,
    '',
    'SOURCE (the only facts you may use):',
    `Idea / notes:\n${input.idea.trim()}`,
    input.transcript?.trim() ? `\nVideo transcript:\n${input.transcript.trim().slice(0, 12_000)}` : '',
  ].join('\n');
  const out = await aiJSON<Adapted>(SYSTEM, user, 'adapted_post', SCHEMA);
  out.linkedin.hooks = out.linkedin.hooks.slice(0, 3);
  out.instagram.hooks = out.instagram.hooks.slice(0, 3);
  out.tiktok.hooks = out.tiktok.hooks.slice(0, 3);
  return out;
}

/** Numbers (40%, $25k, 6 days, 2024) in `text` that don't appear anywhere in the source. */
const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];

export function strayNumbers(text: string, source: string): string[] {
  const norm = (s: string) => s.toLowerCase().replace(/,/g, '');
  // "Three places" in the source backs a "3" in the caption.
  const src = norm(source).replace(new RegExp(`\\b(${WORDS.join('|')})\\b`, 'g'), (w) => String(WORDS.indexOf(w)));
  const body = norm(text)
    .replace(/^\s*\d+[.)]\s/gm, '') // list numbering ("1. ", "2) ")
    .replace(/#\w+/g, ''); // hashtags
  const found = body.match(/[$£€]?\d+(?:\.\d+)?(?:k|m|%)?/g) ?? [];
  return [...new Set(found.filter((n) => !new RegExp(`(^|[^\\d.])${n.replace(/^[$£€]/, '').replace(/[.%]/g, '\\$&')}(?![\\d])`).test(src)))].slice(0, 5);
}
