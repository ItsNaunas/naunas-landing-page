// "What's working out there" (2026-10-31): once a week, the latest TikToks from a watch-list of creators who
// sell what Naunas sells (or talk to its buyers) are pulled through Apify (clockworks/tiktok-scraper, about
// $0.30 a run, hard-capped). Each video is scored against its own creator's typical views, so a breakout from a
// small account beats an average video from a big one. The AI turns the top few into idea cards: the pattern,
// why it works, and a Naunas angle. It never copies their content and never uses their numbers as ours.

import { getJSON, putJSON } from '@/lib/store';

const WATCH = 'content/watchlist.json';
const OUT = 'content/market.json';
const ACTOR = 'clockworks~tiktok-scraper';

/** Seeded from the 2026-10-31 research (see PROGRESS): close to the offer, or inside the buyers' world. */
export const DEFAULT_WATCH = [
  'initiatearchitecture', 'studio.mcgee', 'curatedbykramer_', 'juliejonesdesigns', 'therealbillycox',
  'theryankeip', 'bennettspooner', 'jaredrhod', 'quamob_',
];

export type MarketIdea = {
  creator: string; followers: number; url: string; postedAt: string; views: number; likes: number; saves: number; comments: number;
  /** Views ÷ the creator's median views in this pull: 3 = three times their usual. */
  lift: number; caption: string;
  pattern: string; why: string; angle: string; hook: string;
};
export type Market = { at: string; creators: number; videos: number; items: MarketIdea[]; error?: string };

export const getWatchlist = () => getJSON<string[]>(WATCH, DEFAULT_WATCH);
export const getMarket = () => getJSON<Market | null>(OUT, null);

export async function saveWatchlist(raw: string): Promise<string[]> {
  const list = [...new Set(raw.split(/[\s,]+/).map((s) => s.replace(/^@/, '').replace(/^https?:\/\/(www\.)?tiktok\.com\/@/, '').replace(/[/?].*$/, '').trim().toLowerCase()).filter((s) => /^[\w.]{2,40}$/.test(s)))].slice(0, 20);
  await putJSON(WATCH, list);
  return list;
}

type Video = {
  text?: string; webVideoUrl?: string; createTimeISO?: string; playCount?: number; diggCount?: number; collectCount?: number; commentCount?: number;
  isPinned?: boolean; authorMeta?: { name?: string; fans?: number };
};

const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : 0; };

/** The weekly pull. Without APIFY_TOKEN it does nothing; without OPENAI_API_KEY the cards keep the raw videos only. */
export async function runMarketWatch(): Promise<Market | null> {
  const token = process.env.APIFY_TOKEN;
  if (!token) return null;
  const profiles = await getWatchlist();
  if (!profiles.length) return null;
  const input = { profiles, profileSorting: 'latest', resultsPerPage: 8, excludePinnedPosts: true };
  const res = await fetch(`https://api.apify.com/v2/acts/${ACTOR}/run-sync-get-dataset-items?maxTotalChargeUsd=0.6&timeout=240`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(input), cache: 'no-store',
  });
  if (!res.ok) {
    const market: Market = { at: new Date().toISOString(), creators: profiles.length, videos: 0, items: (await getMarket())?.items ?? [], error: `Apify ${res.status}` };
    await putJSON(OUT, market);
    return market;
  }
  const videos = ((await res.json()) as Video[]).filter((v) => v.webVideoUrl && v.authorMeta?.name && !v.isPinned);

  const byCreator = new Map<string, Video[]>();
  for (const v of videos) byCreator.set(v.authorMeta!.name!, [...(byCreator.get(v.authorMeta!.name!) ?? []), v]);
  const scored = [...byCreator.values()].flatMap((list) => {
    const mid = Math.max(median(list.map((v) => v.playCount ?? 0)), 500);
    return list.map((v) => ({ v, lift: (v.playCount ?? 0) / mid }));
  });
  // Breakouts first; one per creator so one account can't fill the feed.
  const seen = new Set<string>();
  const top = scored.filter((s) => (s.v.playCount ?? 0) >= 2000).sort((a, b) => b.lift - a.lift)
    .filter((s) => (seen.has(s.v.authorMeta!.name!) ? false : (seen.add(s.v.authorMeta!.name!), true))).slice(0, 6);

  let cards: { pattern: string; why: string; angle: string; hook: string }[] = [];
  const { aiReady, aiJSON } = await import('@/lib/ai');
  if (aiReady() && top.length) {
    try {
      cards = (await aiJSON<{ cards: typeof cards }>(SYSTEM, top.map((s, i) => `#${i + 1} @${s.v.authorMeta!.name} (${s.lift.toFixed(1)}x their usual views)\nCaption: ${(s.v.text ?? '').slice(0, 600) || '(no caption)'}`).join('\n\n'), 'market_ideas', SCHEMA)).cards;
    } catch { /* the videos still show; the cards fill in next week */ }
  }
  const items: MarketIdea[] = top.map((s, i) => ({
    creator: s.v.authorMeta!.name!, followers: s.v.authorMeta!.fans ?? 0, url: s.v.webVideoUrl!, postedAt: s.v.createTimeISO ?? '',
    views: s.v.playCount ?? 0, likes: s.v.diggCount ?? 0, saves: s.v.collectCount ?? 0, comments: s.v.commentCount ?? 0,
    lift: Math.round(s.lift * 10) / 10, caption: (s.v.text ?? '').slice(0, 300),
    pattern: cards[i]?.pattern ?? '', why: cards[i]?.why ?? '', angle: cards[i]?.angle ?? '', hook: cards[i]?.hook ?? '',
  }));
  const market: Market = { at: new Date().toISOString(), creators: byCreator.size, videos: videos.length, items };
  await putJSON(OUT, market);
  return market;
}

const SYSTEM = `You study short videos that are outperforming for other creators and turn each into a content idea for Naunas.
Naunas (Naufal) builds client systems for US high-ticket project businesses, interior design studios first: enquiry capture, fast follow-up, booking, proposals, onboarding, client portals. His proof: real builds (a client portal, an events dashboard, a payments platform).
For each video, in order, give:
- pattern: the format in a few words (e.g. "walkthrough of my own system", "script for an awkward client moment").
- why: one sentence on why it likely worked, from the caption and its lift.
- angle: one or two sentences: the Naunas version, aimed at design-studio owners, built from his own work and point of view.
- hook: one opening line for that Naunas version, in plain direct words.
Never copy their wording, never borrow their numbers, results or stories as his, and never invent results. If a video has nothing usable for this audience, say so in "angle" and leave "hook" empty.`;

const str = { type: 'string' };
const SCHEMA = {
  type: 'object', additionalProperties: false, required: ['cards'],
  properties: { cards: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['pattern', 'why', 'angle', 'hook'], properties: { pattern: str, why: str, angle: str, hook: str } } } },
};
