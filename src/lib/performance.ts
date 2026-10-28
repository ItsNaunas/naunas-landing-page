// Which posts actually bring people in (content engine Phase 6). Per post: tracked-link clicks per channel
// (/go/p-<id>-<li|ig|tt>, counted in stats/content.json), leads and deals from HubSpot (the site's
// attribution writes first_touch_campaign = post id), plus each platform's own numbers: Instagram insights and
// TikTok video stats pulled back by the daily cron, LinkedIn from the analytics export he uploads (no member
// stats API), matched to our posts by the post URL, else by the day it went out.

import { getIndex, CHANNEL_CODE, type IndexRow, type ChannelKey } from '@/lib/content';
import { getJSON, putJSON } from '@/lib/store';
import { crmSearch } from '@/lib/hubspot';
import { ig } from '@/lib/instagram';
import { FUNNEL } from '@/config/funnel';
import { dayIn } from '@/lib/slots';

export type Insights = { reach?: number; views?: number; likes?: number; comments?: number; saved?: number; shares?: number; at: string };
/** TikTok: views/likes/comments/shares. LinkedIn: impressions/engagements. */
export type ChannelStats = { views?: number; likes?: number; comments?: number; shares?: number; impressions?: number; engagements?: number; videoId?: string; at: string };
export type PostPerf = IndexRow & {
  clicks: Partial<Record<ChannelKey, number>>; totalClicks: number;
  leads: number; deals: number; insights?: Insights; tiktok?: ChannelStats; linkedin?: ChannelStats; score: number;
};

const DAY = 86_400_000;
const INSIGHTS = 'stats/content-insights.json';
const TT_STATS = 'stats/content-tiktok.json';
const LI_STATS = 'stats/content-linkedin.json';
const posted = (r: IndexRow) => Object.values(r.channels).includes('posted');

/** Posted posts in the window, ranked by leads, then deals, then clicks. */
export async function postPerformance(days = 120): Promise<{ rows: PostPerf[]; errors: string[] }> {
  const errors: string[] = [];
  const since = Date.now() - days * DAY;
  const rows = (await getIndex()).filter((r) => posted(r) && Date.parse(r.when) >= since).slice(0, 100);
  if (!rows.length) return { rows: [], errors };

  const [clicks, insights, tt, li] = await Promise.all([
    getJSON<Record<string, Record<string, number>>>('stats/content.json', {}),
    getJSON<Record<string, Insights>>(INSIGHTS, {}),
    getJSON<Record<string, ChannelStats>>(TT_STATS, {}),
    getJSON<Record<string, ChannelStats>>(LI_STATS, {}),
  ]);

  const leads: Record<string, { leads: number; deals: number }> = {};
  try {
    const res = await crmSearch('contacts', [{ propertyName: 'first_touch_campaign', operator: 'IN', values: rows.map((r) => r.id) }], ['first_touch_campaign', 'num_associated_deals']);
    for (const c of res.results) {
      const id = c.properties.first_touch_campaign ?? '';
      const row = (leads[id] ??= { leads: 0, deals: 0 });
      row.leads += 1;
      if (Number(c.properties.num_associated_deals ?? 0) > 0) row.deals += 1;
    }
  } catch (err) {
    errors.push(`HubSpot (leads per post): ${err instanceof Error ? err.message.slice(0, 120) : 'failed'}`);
  }

  const out = rows.map((r) => {
    const raw = clicks[r.id] ?? {};
    const byCh = Object.fromEntries((Object.keys(CHANNEL_CODE) as ChannelKey[]).map((c) => [c, raw[c] ?? 0])) as Record<ChannelKey, number>;
    const totalClicks = Object.values(byCh).reduce((a, b) => a + b, 0);
    const l = leads[r.id] ?? { leads: 0, deals: 0 };
    return { ...r, clicks: byCh, totalClicks, ...l, insights: insights[r.id], tiktok: tt[r.id], linkedin: li[r.id], score: l.deals * 100 + l.leads * 10 + totalClicks };
  });
  return { rows: out.sort((a, b) => b.score - a.score || b.when.localeCompare(a.when)), errors };
}

/** Old posts that already brought leads: worth posting again (new hook, same idea). */
export const evergreen = (rows: PostPerf[]) => rows.filter((r) => r.leads > 0 && Date.parse(r.when) < Date.now() - 90 * DAY).slice(0, 5);

async function mediaInsights(mediaId: string): Promise<Omit<Insights, 'at'>> {
  type R = { data: { name: string; values?: { value: number }[]; total_value?: { value: number } }[] };
  let res: R;
  try {
    res = await ig<R>(`/${mediaId}/insights?metric=reach,views,likes,comments,saved,shares`);
  } catch {
    res = await ig<R>(`/${mediaId}/insights?metric=reach,likes,comments,saved,shares`); // older media types reject "views"
  }
  return Object.fromEntries(res.data.map((m) => [m.name, m.total_value?.value ?? m.values?.[0]?.value ?? 0]));
}

/** Daily: Instagram insights and TikTok stats for posts from the last 30 days. Returns how many were refreshed. */
export async function refreshInsights(): Promise<number> {
  const tt = await refreshTikTokStats().catch((err) => { console.error('[performance] tiktok stats failed', err); return 0; });
  return tt + await refreshIgInsights();
}

async function refreshIgInsights(): Promise<number> {
  if (!process.env.IG_ACCESS_TOKEN) return 0;
  const since = Date.now() - 30 * DAY;
  const rows = (await getIndex()).filter((r) => r.igMediaId && r.channels.instagram === 'posted' && Date.parse(r.when) >= since).slice(0, 20);
  if (!rows.length) return 0;
  const store = await getJSON<Record<string, Insights>>(INSIGHTS, {});
  let n = 0;
  for (const r of rows) {
    try {
      store[r.id] = { ...(await mediaInsights(r.igMediaId!)), at: new Date().toISOString() };
      n += 1;
    } catch (err) {
      console.error('[performance] insights failed', r.id, err);
    }
  }
  await putJSON(INSIGHTS, store);
  return n;
}

/** TikTok: our publish id → the public video id (asked once, kept), then views etc. from the video list. */
async function refreshTikTokStats(): Promise<number> {
  const { tiktokConfigured, tiktokConnected, tiktokVideos, publishStatus } = await import('@/lib/tiktok');
  if (!tiktokConfigured() || !(await tiktokConnected())) return 0;
  const rows = (await getIndex()).filter((r) => r.channels.tiktok === 'posted' && Date.parse(r.when) >= Date.now() - 30 * DAY).slice(0, 20);
  if (!rows.length) return 0;
  const { getPost } = await import('@/lib/content');
  const store = await getJSON<Record<string, ChannelStats>>(TT_STATS, {});
  for (const r of rows) {
    if (store[r.id]?.videoId) continue;
    const publishId = (await getPost(r.id))?.channels.tiktok.publishId;
    const videoId = publishId ? (await publishStatus(publishId).catch(() => null))?.publicaly_available_post_id?.[0] : undefined;
    if (videoId) store[r.id] = { ...store[r.id], videoId: String(videoId), at: new Date().toISOString() };
  }
  const videos = new Map((await tiktokVideos(20)).map((v) => [v.id, v]));
  let n = 0;
  for (const r of rows) {
    const v = store[r.id]?.videoId ? videos.get(store[r.id].videoId!) : undefined;
    if (!v) continue;
    store[r.id] = { videoId: v.id, views: v.view_count, likes: v.like_count, comments: v.comment_count, shares: v.share_count, at: new Date().toISOString() };
    n += 1;
  }
  await putJSON(TT_STATS, store);
  return n;
}

// ---------------------------------------------------------------- LinkedIn analytics export

type LiRow = { url: string; date?: string; metrics: Record<string, number> };

const toNum = (v: string) => { const t = String(v).replace(/[,%\s]/g, ''); const n = Number(t); return t && Number.isFinite(n) ? n : undefined; };
/** "10/27/2026" (US, as LinkedIn exports it), "2026-10-27" or an Excel day serial → YYYY-MM-DD. */
function toDay(v: string): string | undefined {
  const t = String(v).trim();
  if (/^\d{5}(\.\d+)?$/.test(t)) return new Date((Number(t) - 25569) * DAY).toISOString().slice(0, 10);
  const us = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (us) return `${us[3]}-${us[1].padStart(2, '0')}-${us[2].padStart(2, '0')}`;
  return /^\d{4}-\d{2}-\d{2}/.test(t) ? t.slice(0, 10) : undefined;
}

/** Every "Post URL" table in every sheet (TOP POSTS has two side by side), merged per URL. */
export function linkedinExportRows(sheets: Record<string, string[][]>): LiRow[] {
  const byUrl = new Map<string, LiRow>();
  for (const rows of Object.values(sheets)) {
    const h = rows.findIndex((r) => r.some((c) => /^post url$/i.test(c.trim())));
    if (h < 0) continue;
    const head = rows[h].map((c) => c.trim());
    const starts = head.flatMap((c, i) => (/^post url$/i.test(c) ? [i] : []));
    for (const [k, j] of starts.entries()) {
      const end = starts[k + 1] ?? head.length;
      for (const r of rows.slice(h + 1)) {
        const url = (r[j] ?? '').trim();
        if (!/^https?:\/\//.test(url)) continue;
        const row = byUrl.get(url) ?? { url, metrics: {} };
        for (let i = j + 1; i < end && head[i]; i++) {
          if (/date/i.test(head[i])) row.date ??= toDay(r[i] ?? '');
          else { const n = toNum(r[i] ?? ''); if (n !== undefined) row.metrics[head[i].toLowerCase()] = n; }
        }
        byUrl.set(url, row);
      }
    }
  }
  return [...byUrl.values()];
}

/** Matches the export to posted LinkedIn posts (URL id, else the one post that went out that day) and saves it. */
export async function importLinkedInExport(buf: Buffer): Promise<{ matched: number; unmatched: number }> {
  const { readXlsx } = await import('@/lib/xlsx');
  const rows = linkedinExportRows(readXlsx(buf));
  if (!rows.length) throw new Error('No posts found. Upload the Content export from LinkedIn analytics (it has a TOP POSTS sheet).');
  const posts = (await getIndex()).filter((r) => r.channels.linkedin === 'posted');
  const idOf = (u?: string) => u?.match(/\d{15,}/)?.[0];
  const store = await getJSON<Record<string, ChannelStats>>(LI_STATS, {});
  let matched = 0;
  for (const row of rows) {
    const id = idOf(row.url);
    let hit = posts.find((p) => id && idOf(p.urls?.linkedin) === id);
    if (!hit && row.date) {
      const same = posts.filter((p) => [dayIn(new Date(p.when), FUNNEL.ownerTz), dayIn(new Date(p.when), 'UTC')].includes(row.date!));
      if (same.length === 1) hit = same[0];
    }
    if (!hit) continue;
    const m = row.metrics;
    store[hit.id] = { ...store[hit.id], impressions: m.impressions ?? store[hit.id]?.impressions, engagements: m.engagements ?? store[hit.id]?.engagements, at: new Date().toISOString() };
    matched += 1;
  }
  await putJSON(LI_STATS, store);
  return { matched, unmatched: rows.length - matched };
}
