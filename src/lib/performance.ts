// Which posts actually bring people in (content engine Phase 6). Per post: tracked-link clicks per channel
// (/go/p-<id>-<li|ig|tt>, counted in stats/content.json), leads and deals from HubSpot (the site's
// attribution writes first_touch_campaign = post id), and Instagram insights pulled back by the daily cron.
// LinkedIn has no stats API for members, so its numbers come from clicks and leads only.

import { getIndex, CHANNEL_CODE, type IndexRow, type ChannelKey } from '@/lib/content';
import { getJSON, putJSON } from '@/lib/store';
import { crmSearch } from '@/lib/hubspot';
import { ig } from '@/lib/instagram';

export type Insights = { reach?: number; views?: number; likes?: number; comments?: number; saved?: number; shares?: number; at: string };
export type PostPerf = IndexRow & {
  clicks: Partial<Record<ChannelKey, number>>; totalClicks: number;
  leads: number; deals: number; insights?: Insights; score: number;
};

const DAY = 86_400_000;
const INSIGHTS = 'stats/content-insights.json';
const posted = (r: IndexRow) => Object.values(r.channels).includes('posted');

/** Posted posts in the window, ranked by leads, then deals, then clicks. */
export async function postPerformance(days = 120): Promise<{ rows: PostPerf[]; errors: string[] }> {
  const errors: string[] = [];
  const since = Date.now() - days * DAY;
  const rows = (await getIndex()).filter((r) => posted(r) && Date.parse(r.when) >= since).slice(0, 100);
  if (!rows.length) return { rows: [], errors };

  const [clicks, insights] = await Promise.all([
    getJSON<Record<string, Record<string, number>>>('stats/content.json', {}),
    getJSON<Record<string, Insights>>(INSIGHTS, {}),
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
    return { ...r, clicks: byCh, totalClicks, ...l, insights: insights[r.id], score: l.deals * 100 + l.leads * 10 + totalClicks };
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

/** Daily: pull Instagram insights for posts from the last 30 days. Returns how many were refreshed. */
export async function refreshInsights(): Promise<number> {
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
