// Instagram warm-ups with the actual posts (cold outreach, 2026-10-21): for firms waiting on a warm-up, the
// site fetches their 3 latest posts through Apify (apify/instagram-post-scraper, about $0.002 a post) and
// writes one suggested comment per post from its caption (OpenAI, no invented facts). Async like the Maps
// search: start a run on one page load, collect it on a later one. Nothing is posted; Naufal likes and
// comments himself.

import { getJSON, updateJSON } from '@/lib/store';
import { aiJSON, aiReady } from '@/lib/ai';

const API = 'https://api.apify.com/v2';
const ACTOR = 'apify~instagram-post-scraper';
const PATH = 'outreach/igposts.json';

export type IgPost = { url: string; caption?: string; at?: string; image?: string; comment?: string };
type Store = { runs: { id: string; datasetId: string; handles: string[]; at: string }[]; posts: Record<string, { at: string; items: IgPost[] }> };
const EMPTY: Store = { runs: [], posts: {} };

async function apify<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = process.env.APIFY_TOKEN;
  if (!token) throw new Error('Missing APIFY_TOKEN');
  const res = await fetch(`${API}${path}`, { ...init, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) }, cache: 'no-store' });
  if (!res.ok) throw new Error(`Apify ${path.split('?')[0]} → ${res.status}: ${(await res.text()).slice(0, 160)}`);
  return res.json() as Promise<T>;
}

export const getIgPosts = async () => (await getJSON<Store>(PATH, EMPTY)).posts;

const SYSTEM = `You suggest Instagram comments for Naufal to leave on an interior design firm's posts before he ever messages them.
For each caption, write ONE comment of 6 to 15 words about the work itself: a specific material, room, detail or choice mentioned in the caption.
No pitch, no questions about their business, no links, no hashtags, no placeholders, at most one emoji, never generic ("love this", "stunning", "amazing work" alone).
If a caption gives nothing specific, return an empty string for it. Never invent details that are not in the caption.`;

async function suggest(captions: string[]): Promise<string[]> {
  if (!aiReady() || !captions.some(Boolean)) return captions.map(() => '');
  const out = await aiJSON<{ comments: string[] }>(SYSTEM, captions.map((c, i) => `${i + 1}. ${c.slice(0, 600) || '(no caption)'}`).join('\n\n'), 'comments', {
    type: 'object', additionalProperties: false, required: ['comments'], properties: { comments: { type: 'array', items: { type: 'string' } } },
  });
  return captions.map((_, i) => (out.comments[i] ?? '').replace(/[[\]{}]/g, '').trim());
}

/** Store posts already fetched elsewhere (prospect research reads the profile's latest posts), with comments. */
export async function saveIgPosts(handle: string, posts: { url: string; caption?: string; at?: string; image?: string }[]): Promise<void> {
  const mine = posts.filter((p) => p.url).slice(0, 3);
  if (!mine.length) return;
  const comments = await suggest(mine.map((m) => m.caption ?? '')).catch(() => mine.map(() => ''));
  await updateJSON<Store>(PATH, EMPTY, (st) => ({ ...st, posts: { ...st.posts, [handle.toLowerCase()]: { at: new Date().toISOString(), items: mine.map((m, i) => ({ ...m, caption: m.caption?.slice(0, 300), comment: comments[i] || undefined })) } } }));
}

/**
 * Collect finished runs, then start one for handles that still have no posts (max 10 per run, one run at a
 * time). Call from the Outreach page load; cheap when there's nothing to do.
 */
export async function syncIgPosts(handles: string[]): Promise<void> {
  if (!process.env.APIFY_TOKEN) return;
  const store = await getJSON<Store>(PATH, EMPTY);
  let changed = false;

  for (const run of [...store.runs]) {
    const r = (await apify<{ data: { status: string } }>(`/actor-runs/${run.id}`)).data;
    if (r.status === 'RUNNING' || r.status === 'READY') continue;
    store.runs = store.runs.filter((x) => x.id !== run.id);
    changed = true;
    if (r.status !== 'SUCCEEDED') continue;
    type Item = { url?: string; caption?: string; timestamp?: string; displayUrl?: string; ownerUsername?: string; inputUrl?: string };
    const items = await apify<Item[]>(`/datasets/${run.datasetId}/items?clean=true&format=json&limit=100`);
    for (const h of run.handles) {
      const mine = items.filter((it) => (it.ownerUsername ?? '').toLowerCase() === h.toLowerCase() || (it.inputUrl ?? '').toLowerCase().includes(`/${h.toLowerCase()}`))
        .filter((it) => it.url).sort((a, b) => (b.timestamp ?? '').localeCompare(a.timestamp ?? '')).slice(0, 3);
      const comments = await suggest(mine.map((m) => m.caption ?? '')).catch(() => mine.map(() => ''));
      store.posts[h.toLowerCase()] = { at: new Date().toISOString(), items: mine.map((m, i) => ({ url: m.url!, caption: m.caption?.slice(0, 300), at: m.timestamp, image: m.displayUrl, comment: comments[i] || undefined })) };
    }
  }

  const pending = new Set(store.runs.flatMap((r) => r.handles.map((h) => h.toLowerCase())));
  const need = [...new Set(handles.map((h) => h.toLowerCase()))].filter((h) => !store.posts[h] && !pending.has(h)).slice(0, 10);
  if (need.length && !store.runs.length) {
    const run = (await apify<{ data: { id: string; defaultDatasetId: string } }>(`/acts/${ACTOR}/runs?maxTotalChargeUsd=0.25`, {
      method: 'POST', body: JSON.stringify({ username: need, resultsLimit: 3 }),
    })).data;
    store.runs.push({ id: run.id, datasetId: run.defaultDatasetId, handles: need, at: new Date().toISOString() });
    changed = true;
  }
  if (changed) await updateJSON<Store>(PATH, EMPTY, () => store);
}
