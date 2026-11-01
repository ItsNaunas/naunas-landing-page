// "What's working out there" (2026-10-31, lanes + Instagram 2026-11-01): once a week, the latest posts from a
// watch-list are pulled through Apify (TikTok: clockworks/tiktok-scraper; Instagram: apify/instagram-scraper;
// together about $0.40 a run, hard-capped). Each post is scored against its own creator's usual numbers, so a
// breakout from a small account beats an average post from a big one. The watch-list has three lanes:
//   demo:    founders showing systems they built (the format to copy)
//   problem: accounts that win with problem-led posts and carousels (the structure to copy)
//   world:   media and owners inside an industry (the topics and words)
// The AI turns the best few into idea cards: pattern, why it works, the Naunas angle (problem-led, one industry
// as the example) and a hook. It never copies their content and never uses their numbers as ours.

import { getJSON, putJSON } from '@/lib/store';

const WATCH = 'content/watchlist.json';
const OUT = 'content/market.json';

export type Lane = 'demo' | 'problem' | 'world';
export type Platform = 'tiktok' | 'instagram';
export type WatchEntry = { handle: string; platform: Platform; lane: Lane };
export const LANES: { key: Lane; label: string; hint: string }[] = [
  { key: 'demo', label: 'Build demos', hint: 'Founders showing what they built for a client' },
  { key: 'problem', label: 'Problem-led posts', hint: 'Carousels and posts that name a problem the owner hasn’t noticed' },
  { key: 'world', label: 'Industry world', hint: 'Media and owners inside an industry: what they’re talking about' },
];

/** Seeded from the 31 Oct – 1 Nov research (PROGRESS): the accounts that actually get engagement. */
export const DEFAULT_WATCH: WatchEntry[] = [
  { handle: 'jbwebbuilders', platform: 'tiktok', lane: 'demo' },
  { handle: 'restructureai', platform: 'tiktok', lane: 'demo' },
  { handle: 'quamob_', platform: 'tiktok', lane: 'demo' },
  { handle: 'designgrowthhub', platform: 'instagram', lane: 'problem' },
  { handle: 'clairejefford', platform: 'instagram', lane: 'problem' },
  { handle: 'marketing411official', platform: 'instagram', lane: 'problem' },
  { handle: 'businessofhome', platform: 'instagram', lane: 'world' },
  { handle: 'studio.mcgee', platform: 'tiktok', lane: 'world' },
];

export type MarketIdea = {
  creator: string; platform: Platform; lane: Lane; format: 'video' | 'carousel' | 'image';
  followers: number; url: string; postedAt: string; views: number; likes: number; saves: number; comments: number;
  /** The post's score ÷ the creator's median in this pull: 3 = three times their usual. */
  lift: number; caption: string;
  pattern: string; why: string; angle: string; hook: string;
};
export type Market = { at: string; creators: number; videos: number; items: MarketIdea[]; error?: string };

/** Older lists were TikTok usernames only: they read as TikTok build demos. */
export async function getWatchlist(): Promise<WatchEntry[]> {
  const raw = await getJSON<(string | WatchEntry)[]>(WATCH, DEFAULT_WATCH);
  return raw.map((e) => (typeof e === 'string' ? { handle: e, platform: 'tiktok' as const, lane: 'demo' as const } : e));
}
export const getMarket = () => getJSON<Market | null>(OUT, null);

const handleOf = (s: string) => s.replace(/^@/, '').replace(/^https?:\/\/(www\.)?(tiktok\.com\/@|instagram\.com\/)/, '').replace(/[/?].*$/, '').trim().toLowerCase();

/** One text box per lane: "tt:handle, ig:handle" (no prefix = TikTok). */
export async function saveWatchlist(byLane: Partial<Record<Lane, string>>): Promise<WatchEntry[]> {
  const out: WatchEntry[] = [];
  for (const lane of LANES.map((l) => l.key)) {
    for (const token of (byLane[lane] ?? '').split(/[\s,]+/).filter(Boolean)) {
      const ig = /^ig:|instagram\.com/i.test(token);
      const handle = handleOf(token.replace(/^(ig|tt):/i, ''));
      if (/^[\w.]{2,40}$/.test(handle) && !out.some((e) => e.handle === handle && e.platform === (ig ? 'instagram' : 'tiktok'))) out.push({ handle, platform: ig ? 'instagram' : 'tiktok', lane });
    }
  }
  await putJSON(WATCH, out.slice(0, 24));
  return out;
}
export const laneText = (list: WatchEntry[], lane: Lane) => list.filter((e) => e.lane === lane).map((e) => `${e.platform === 'instagram' ? 'ig' : 'tt'}:${e.handle}`).join(', ');

type Post = Omit<MarketIdea, 'lift' | 'pattern' | 'why' | 'angle' | 'hook' | 'lane'> & { score: number };

async function apify<T>(actor: string, input: unknown, capUsd: number): Promise<T> {
  const res = await fetch(`https://api.apify.com/v2/acts/${actor}/run-sync-get-dataset-items?maxTotalChargeUsd=${capUsd}&timeout=240`, {
    method: 'POST', headers: { Authorization: `Bearer ${process.env.APIFY_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify(input), cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Apify ${actor} ${res.status}`);
  return res.json() as Promise<T>;
}

type TtVideo = { text?: string; webVideoUrl?: string; createTimeISO?: string; playCount?: number; diggCount?: number; collectCount?: number; commentCount?: number; isPinned?: boolean; isSlideshow?: boolean; authorMeta?: { name?: string; fans?: number } };
async function pullTikTok(handles: string[]): Promise<Post[]> {
  if (!handles.length) return [];
  const vids = await apify<TtVideo[]>('clockworks~tiktok-scraper', { profiles: handles, profileSorting: 'latest', resultsPerPage: 8, excludePinnedPosts: true }, 0.4);
  return vids.filter((v) => v.webVideoUrl && v.authorMeta?.name && !v.isPinned).map((v) => ({
    creator: v.authorMeta!.name!, platform: 'tiktok', format: v.isSlideshow ? 'carousel' : 'video', followers: v.authorMeta!.fans ?? 0,
    url: v.webVideoUrl!, postedAt: v.createTimeISO ?? '', views: v.playCount ?? 0, likes: v.diggCount ?? 0, saves: v.collectCount ?? 0, comments: v.commentCount ?? 0,
    caption: (v.text ?? '').slice(0, 600), score: v.playCount ?? 0,
  }));
}

type IgProfile = { username?: string; followersCount?: number; latestPosts?: { url?: string; type?: string; caption?: string; timestamp?: string; likesCount?: number; commentsCount?: number; videoViewCount?: number; isPinned?: boolean }[] };
async function pullInstagram(handles: string[]): Promise<Post[]> {
  if (!handles.length) return [];
  const profiles = await apify<IgProfile[]>('apify~instagram-scraper', { directUrls: handles.map((h) => `https://www.instagram.com/${h}/`), resultsType: 'details' }, 0.2);
  return profiles.flatMap((p) => (p.latestPosts ?? []).filter((x) => x.url && !x.isPinned).map((x) => ({
    creator: p.username ?? '', platform: 'instagram' as const, format: (x.type === 'Sidecar' ? 'carousel' : x.type === 'Video' ? 'video' : 'image') as Post['format'],
    followers: p.followersCount ?? 0, url: x.url!, postedAt: x.timestamp ?? '', views: x.videoViewCount ?? 0, likes: Math.max(0, x.likesCount ?? 0), saves: 0,
    comments: x.commentsCount ?? 0, caption: (x.caption ?? '').slice(0, 600),
    // Carousels have no view count: likes plus comments (a comment-keyword post shows up in comments).
    score: Math.max(0, x.likesCount ?? 0) + 3 * (x.commentsCount ?? 0),
  })));
}

const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : 0; };

/** The weekly pull. Without APIFY_TOKEN it does nothing; without OPENAI_API_KEY the cards keep the raw posts only. */
export async function runMarketWatch(): Promise<Market | null> {
  if (!process.env.APIFY_TOKEN) return null;
  const watch = await getWatchlist();
  if (!watch.length) return null;
  const laneOf = (p: Post) => watch.find((w) => w.handle === p.creator.toLowerCase() && w.platform === p.platform)?.lane ?? 'world';
  const [tt, ig] = await Promise.allSettled([
    pullTikTok(watch.filter((w) => w.platform === 'tiktok').map((w) => w.handle)),
    pullInstagram(watch.filter((w) => w.platform === 'instagram').map((w) => w.handle)),
  ]);
  const posts = [...(tt.status === 'fulfilled' ? tt.value : []), ...(ig.status === 'fulfilled' ? ig.value : [])];
  const failed = [tt.status === 'rejected' ? 'TikTok' : '', ig.status === 'rejected' ? 'Instagram' : ''].filter(Boolean).join(' + ');
  if (!posts.length) {
    const market: Market = { at: new Date().toISOString(), creators: watch.length, videos: 0, items: (await getMarket())?.items ?? [], error: failed ? `${failed} pull failed` : 'nothing came back' };
    await putJSON(OUT, market);
    return market;
  }

  const byCreator = new Map<string, Post[]>();
  for (const p of posts) byCreator.set(`${p.platform}:${p.creator}`, [...(byCreator.get(`${p.platform}:${p.creator}`) ?? []), p]);
  const scored = [...byCreator.values()].flatMap((list) => {
    const mid = Math.max(median(list.map((p) => p.score)), list[0].platform === 'tiktok' ? 500 : 10);
    return list.map((p) => ({ p, lane: laneOf(p), lift: p.score / mid }));
  }).filter((s) => s.p.score >= (s.p.platform === 'tiktok' ? 2000 : 30));
  // Two per lane first (so every lane is represented), then the best of the rest; one post per creator.
  const seen = new Set<string>();
  const top: typeof scored = [];
  const pick = (list: typeof scored, n: number) => {
    for (const s of list) {
      if (n <= 0) break;
      const k = `${s.p.platform}:${s.p.creator}`;
      if (seen.has(k)) continue;
      seen.add(k); top.push(s); n -= 1;
    }
  };
  const ranked = [...scored].sort((a, b) => b.lift - a.lift);
  for (const lane of ['demo', 'problem', 'world'] as Lane[]) pick(ranked.filter((s) => s.lane === lane), 2);
  pick(ranked, 7 - top.length);

  let cards: { pattern: string; why: string; angle: string; hook: string }[] = [];
  const { aiReady, aiJSON } = await import('@/lib/ai');
  if (aiReady() && top.length) {
    try {
      cards = (await aiJSON<{ cards: typeof cards }>(SYSTEM, top.map((s, i) => `#${i + 1} @${s.p.creator} on ${s.p.platform}, a ${s.p.format} (${s.lift.toFixed(1)}x their usual), lane: ${LANES.find((l) => l.key === s.lane)?.label}\nCaption: ${s.p.caption || '(no caption)'}`).join('\n\n'), 'market_ideas', SCHEMA)).cards;
    } catch { /* the videos still show; the cards fill in next week */ }
  }
  const items: MarketIdea[] = top.map(({ p, lane, lift }, i) => ({
    creator: p.creator, platform: p.platform, lane, format: p.format, followers: p.followers, url: p.url, postedAt: p.postedAt,
    views: p.views, likes: p.likes, saves: p.saves, comments: p.comments, lift: Math.round(lift * 10) / 10, caption: p.caption.slice(0, 300),
    pattern: cards[i]?.pattern ?? '', why: cards[i]?.why ?? '', angle: cards[i]?.angle ?? '', hook: cards[i]?.hook ?? '',
  }));
  const market: Market = { at: new Date().toISOString(), creators: byCreator.size, videos: posts.length, items, error: failed ? `${failed} pull failed this week` : undefined };
  await putJSON(OUT, market);
  return market;
}

const SYSTEM = `You study posts (videos and carousels) that are outperforming for other creators and turn each into a content idea for Naunas.
Naunas (Naufal) builds connected client systems for service businesses in the US and UK (design studios, property, construction and trades, agencies, education, professional services): enquiry capture, fast follow-up, booking, proposals, onboarding, client portals, dashboards. His proof: real builds (a client portal, an events dashboard, a payments platform). His posts lead with one problem every service business has, and use one industry as the example.
For each post, in order, give:
- pattern: the format in a few words (e.g. "walkthrough of my own system", "script for an awkward client moment").
- why: one sentence on why it likely worked, from the caption and its lift.
- angle (use the lane: Build demos → copy the format with one of his builds; Problem-led posts → copy the structure for one Leak Map problem; Industry world → take the topic and say which industry it frames): one or two sentences: the Naunas version, aimed at service-business owners, led by the problem, built from his own work and point of view.
- hook: one opening line for that Naunas version, in plain direct words.
Never copy their wording, never borrow their numbers, results or stories as his, and never invent results. If a post has nothing usable for this audience, say so in "angle" and leave "hook" empty.`;

const str = { type: 'string' };
const SCHEMA = {
  type: 'object', additionalProperties: false, required: ['cards'],
  properties: { cards: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['pattern', 'why', 'angle', 'hook'], properties: { pattern: str, why: str, angle: str, hook: str } } } },
};
