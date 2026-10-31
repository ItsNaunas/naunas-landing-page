// Content that learns from its own results (2026-10-31). A weekly job reads what each posted post did (leads,
// deals, clicks, reach: lib/performance) and keeps three lessons in content/learning.json:
//   1. winners: the opening lines of the posts that brought leads or clicks, with their numbers. They become
//      the AI's voice examples (lib/adapt) and the Hook bank.
//   2. hook kinds: each posted hook is labelled once (question, confession, number...), and kinds are compared
//      only once there are enough posts to mean something (MIN_POSTS).
//   3. edits: what Naufal changed in the AI's drafts before posting, so the next drafts start closer to him.
// It only changes what the AI writes from. Nothing is posted, scheduled or sent because of a lesson.

import { getJSON, putJSON } from '@/lib/store';

const LEARN = 'content/learning.json';
export const MIN_POSTS = 10;

export type Winner = { id: string; hook: string; leads: number; deals: number; clicks: number; seen?: number };
export type KindStat = { kind: string; posts: number; leads: number; clicks: number; perPost: number };
export type Learning = {
  at: string; posted: number;
  winners: Winner[];
  /** Post id → its hook's kind, labelled once. */
  kinds: Record<string, string>;
  kindStats: KindStat[];
  edits: { channel: string; ai: string; final: string }[];
};

export const getLearning = () => getJSON<Learning | null>(LEARN, null);

const KINDS = ['question', 'confession or story', 'number or list', 'contrarian take', 'how-to', 'mistake or warning', 'show my work'];
const firstLine = (t?: string) => (t ?? '').split('\n').find((l) => l.trim())?.trim().slice(0, 200) ?? '';

export async function runContentLessons(): Promise<Learning> {
  const [{ postPerformance }, { getPost }] = await Promise.all([import('@/lib/performance'), import('@/lib/content')]);
  const prev = await getLearning();
  const { rows } = await postPerformance(365);
  const posts = (await Promise.all(rows.slice(0, 60).map((r) => getPost(r.id)))).filter((p): p is NonNullable<typeof p> => !!p);
  const byId = new Map(posts.map((p) => [p.id, p]));
  const hookOf = (id: string) => { const p = byId.get(id); return firstLine(p?.channels.linkedin.text) || firstLine(p?.channels.instagram.caption) || firstLine(p?.channels.tiktok.caption) || p?.master.idea.slice(0, 200) || ''; };

  const winners: Winner[] = rows
    .filter((r) => r.leads > 0 || r.deals > 0 || r.totalClicks >= 5)
    .slice(0, 6)
    .map((r) => ({ id: r.id, hook: hookOf(r.id), leads: r.leads, deals: r.deals, clicks: r.totalClicks,
      seen: (r.linkedin?.impressions ?? 0) + (r.insights?.reach ?? r.insights?.views ?? 0) + (r.tiktok?.views ?? 0) || undefined }))
    .filter((w) => w.hook);

  // Label any hook not labelled yet (one small AI call for the batch).
  const kinds = { ...(prev?.kinds ?? {}) };
  const todo = rows.filter((r) => !kinds[r.id] && hookOf(r.id)).slice(0, 30);
  const { aiReady, aiJSON } = await import('@/lib/ai');
  if (todo.length && aiReady()) {
    try {
      const out = await aiJSON<{ labels: string[] }>(
        `Label each social post's opening line with exactly one kind from: ${KINDS.join(', ')}. Return the labels in the same order.`,
        todo.map((r, i) => `${i + 1}. ${hookOf(r.id)}`).join('\n'), 'hook_kinds',
        { type: 'object', additionalProperties: false, required: ['labels'], properties: { labels: { type: 'array', items: { type: 'string', enum: KINDS } } } },
      );
      todo.forEach((r, i) => { if (out.labels[i]) kinds[r.id] = out.labels[i]; });
    } catch { /* labelled next week */ }
  }
  const kindStats: KindStat[] = rows.length >= MIN_POSTS
    ? KINDS.map((kind) => {
      const mine = rows.filter((r) => kinds[r.id] === kind);
      const leads = mine.reduce((s, r) => s + r.leads, 0);
      const clicks = mine.reduce((s, r) => s + r.totalClicks, 0);
      return { kind, posts: mine.length, leads, clicks, perPost: mine.length ? Math.round(((leads * 10 + clicks) / mine.length) * 10) / 10 : 0 };
    }).filter((k) => k.posts >= 2).sort((a, b) => b.perPost - a.perPost)
    : [];

  // What he changed in the AI's drafts (newest first): enough to show the AI his corrections.
  const edits: Learning['edits'] = [];
  for (const p of posts) {
    for (const ch of ['linkedin', 'instagram'] as const) {
      const ai = p.aiDraft?.[ch];
      const final = ch === 'linkedin' ? p.channels.linkedin.text : p.channels.instagram.caption;
      if (ai && final && ai.trim() !== final.trim() && p.channels[ch].status === 'posted') edits.push({ channel: ch, ai: ai.slice(0, 1200), final: final.slice(0, 1200) });
    }
    if (edits.length >= 4) break;
  }

  const learning: Learning = { at: new Date().toISOString(), posted: rows.length, winners, kinds, kindStats, edits };
  await putJSON(LEARN, learning);
  return learning;
}

/** Extra prompt text for the AI writer: his winners and his corrections. Empty until there's something real. */
export async function learnedPrompt(): Promise<string> {
  const l = await getLearning().catch(() => null);
  if (!l) return '';
  const parts: string[] = [];
  if (l.winners.length) {
    parts.push(`Naufal's own posts that brought the most leads and clicks (match their tone and directness; never reuse their facts):\n${l.winners.map((w) => `- ${w.hook} (${w.leads} leads, ${w.clicks} clicks)`).join('\n')}`);
  }
  if (l.kindStats.length) {
    parts.push(`For his audience, these kinds of opening line have done best so far: ${l.kindStats.slice(0, 2).map((k) => k.kind).join(', ')}. Make at least one of the three hooks per channel one of these kinds.`);
  }
  if (l.edits.length) {
    parts.push(`How he edits AI drafts before posting (learn the direction of his changes):\n${l.edits.slice(0, 2).map((e) => `AI wrote:\n${e.ai.slice(0, 500)}\nHe posted:\n${e.final.slice(0, 500)}`).join('\n---\n')}`);
  }
  return parts.join('\n\n');
}
