// Instagram keyword campaigns: a comment (or DM) containing a keyword gets that campaign's message.
// Edited from /dashboard and stored in Blob, so a new campaign goes live without a deploy. The default
// campaign (FUNNEL.instagram) always exists in code, so the Leak Map DM keeps working if Blob is empty
// or down.

import { getJSON, putJSON, updateJSON } from '@/lib/store';
import { FUNNEL } from '@/config/funnel';

export type Channel = 'comment' | 'dm' | 'both';
export type Campaign = {
  /** Slug; also the utm_campaign and the /go/<id> link. */
  id: string;
  name: string;
  keywords: string[];
  channel: Channel;
  /** Instagram media ids this campaign is limited to; empty = every post. */
  postIds: string[];
  /** DM text; {link} becomes the tracked link. */
  message: string;
  url: string;
  active: boolean;
  /** ISO date; after it the campaign stops matching. */
  endsAt?: string;
};
export type CampaignStats = Record<string, { comments: number; dms: number; clicks: number }>;

const CAMPAIGNS = 'campaigns.json';
const STATS = 'stats/campaigns.json';

export const DEFAULT_CAMPAIGN: Campaign = {
  id: FUNNEL.instagram.defaultCampaign.id,
  name: FUNNEL.instagram.defaultCampaign.name,
  keywords: [...FUNNEL.instagram.keywords],
  channel: 'comment',
  postIds: [],
  message: FUNNEL.instagram.defaultCampaign.message,
  url: FUNNEL.instagram.defaultCampaign.url,
  active: true,
};

/** All campaigns; the default is always present (an edited copy in Blob wins over the code version). */
export async function getCampaigns(): Promise<Campaign[]> {
  const saved = await getJSON<Campaign[]>(CAMPAIGNS, []);
  return saved.some((c) => c.id === DEFAULT_CAMPAIGN.id) ? saved : [DEFAULT_CAMPAIGN, ...saved];
}

export async function saveCampaigns(list: Campaign[]) {
  await putJSON(CAMPAIGNS, list);
}

export const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);

const hasWord = (text: string, word: string) =>
  new RegExp(`(^|[^\\p{L}\\p{N}])${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^\\p{L}\\p{N}])`, 'iu').test(text);

/** Best active campaign for this text: one scoped to the post beats an all-posts one. */
export function matchCampaign(campaigns: Campaign[], text: string, via: 'comment' | 'dm', mediaId?: string): Campaign | undefined {
  const now = Date.now();
  const live = campaigns.filter((c) =>
    c.active && (c.channel === via || c.channel === 'both') && (!c.endsAt || Date.parse(c.endsAt) > now) &&
    c.keywords.some((k) => k.trim() && hasWord(text, k.trim())));
  return live.find((c) => mediaId && c.postIds.includes(mediaId)) ?? live.find((c) => c.postIds.length === 0);
}

export const trackedLink = (c: Campaign) => `${FUNNEL.site}/go/${c.id}`;
export const renderMessage = (c: Campaign) => c.message.replace(/\{link\}/g, trackedLink(c));

/** Destination with utm tags, for the /go/<id> redirect. */
export function destination(c: Campaign, medium: string) {
  const url = new URL(c.url);
  url.searchParams.set('utm_source', 'instagram');
  url.searchParams.set('utm_medium', medium);
  url.searchParams.set('utm_campaign', c.id);
  return url.toString();
}

export async function getStats(): Promise<CampaignStats> {
  return getJSON<CampaignStats>(STATS, {});
}

/** Count a comment/DM/click. Never throws: a stats hiccup must not cost a DM. */
export async function bump(id: string, field: 'comments' | 'dms' | 'clicks') {
  try {
    await updateJSON<CampaignStats>(STATS, {}, (s) => {
      const row = s[id] ?? { comments: 0, dms: 0, clicks: 0 };
      return { ...s, [id]: { ...row, [field]: row[field] + 1 } };
    });
  } catch (err) {
    console.warn('[campaigns] stats bump failed', id, field, err instanceof Error ? err.message : err);
  }
}
