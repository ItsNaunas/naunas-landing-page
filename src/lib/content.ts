// Content engine ("Post everywhere", docs/content-engine/PLAN.md): one post, written once, published to
// LinkedIn, Instagram and TikTok in each channel's own format. Posts live in the private Blob store.
// Each channel publishes independently: one failing (or TikTok waiting for app approval) never stops the
// others. Nothing goes out without Naufal pressing Publish or Schedule.

import { getJSON, putJSON } from '@/lib/store';
import { FUNNEL } from '@/config/funnel';
import { strayNumbers } from '@/lib/adapt';

export type ChannelKey = 'linkedin' | 'instagram' | 'tiktok';
export const CHANNELS: ChannelKey[] = ['linkedin', 'instagram', 'tiktok'];
export const CHANNEL_LABEL: Record<ChannelKey, string> = { linkedin: 'LinkedIn', instagram: 'Instagram', tiktok: 'TikTok' };
export const CHANNEL_CODE: Record<ChannelKey, string> = { linkedin: 'li', instagram: 'ig', tiktok: 'tt' };

export type ChannelStatus = 'off' | 'ready' | 'scheduled' | 'publishing' | 'posted' | 'failed' | 'held';
export type PostStatus = 'draft' | 'scheduled' | 'publishing' | 'done' | 'partial';

type Common = { enabled: boolean; status: ChannelStatus; url?: string; error?: string; attempts: number; postedAt?: string };
export type LinkedInChannel = Common & { text: string; visibility: 'PUBLIC' | 'CONNECTIONS'; firstComment: string; urn?: string };
export type InstagramChannel = Common & { caption: string; campaignId?: string; mediaId?: string };
export type TikTokChannel = Common & {
  caption: string; privacy: string; allowComment: boolean; allowDuet: boolean; allowStitch: boolean;
  yourBrand: boolean; brandedContent: boolean; publishId?: string;
};

export type Media = { path: string; kind: 'video' | 'image'; durationSec?: number; width?: number; height?: number; sizeBytes: number; name?: string };

export type ContentPost = {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: PostStatus;
  master: { idea: string; media?: Media; transcript?: string };
  scheduledFor?: string;
  qstashMessageId?: string;
  channels: { linkedin: LinkedInChannel; instagram: InstagramChannel; tiktok: TikTokChannel };
  flags: string[];
  newsletterBlurb?: string;
  /** Made by the studio drop (lib/studioDrop), with the next free day suggested; nothing runs until he schedules. */
  source?: 'studio';
  suggestedFor?: string;
};

export type IndexRow = { id: string; createdAt: string; when: string; status: PostStatus; idea: string; kind?: 'video' | 'image'; channels: Partial<Record<ChannelKey, ChannelStatus>>;
  /** Live post links and the Instagram media id, for the leaderboard and newsletter without loading every post. */
  urls?: Partial<Record<ChannelKey, string>>; igMediaId?: string;
  /** For Content → Plan's "Waiting for you": studio drafts, their suggested time and a thumbnail. */
  source?: 'studio'; suggestedFor?: string; media?: string };

const postPath = (id: string) => `content/posts/${id}.json`;
const INDEX = 'content/index.json';

export function newPost(idea = ''): ContentPost {
  const now = new Date();
  const id = `p${now.toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).slice(2, 6)}`;
  const base = { enabled: false, status: 'off' as ChannelStatus, attempts: 0 };
  return {
    id, createdAt: now.toISOString(), updatedAt: now.toISOString(), status: 'draft', master: { idea }, flags: [],
    channels: {
      linkedin: { ...base, text: '', visibility: 'PUBLIC', firstComment: '' },
      instagram: { ...base, caption: '' },
      tiktok: { ...base, caption: '', privacy: '', allowComment: false, allowDuet: false, allowStitch: false, yourBrand: false, brandedContent: false },
    },
  };
}

export const getPost = (id: string) => getJSON<ContentPost | null>(postPath(id), null);
export const getIndex = () => getJSON<IndexRow[]>(INDEX, []);

/** Overall status from the channels (never touches draft/scheduled posts that haven't run). */
export function rollUp(p: ContentPost): PostStatus {
  const on = CHANNELS.map((c) => p.channels[c]).filter((c) => c.enabled);
  if (on.some((c) => c.status === 'publishing')) return 'publishing';
  if (on.length && on.every((c) => c.status === 'posted')) return 'done';
  if (on.some((c) => c.status === 'posted' || c.status === 'failed' || c.status === 'held')) return 'partial';
  return p.scheduledFor && on.some((c) => c.status === 'scheduled') ? 'scheduled' : 'draft';
}

export async function savePost(p: ContentPost) {
  p.updatedAt = new Date().toISOString();
  await putJSON(postPath(p.id), p);
  const row: IndexRow = {
    id: p.id, createdAt: p.createdAt, idea: p.master.idea.slice(0, 140), status: p.status, kind: p.master.media?.kind,
    when: CHANNELS.map((c) => p.channels[c].postedAt).filter(Boolean).sort()[0] ?? p.scheduledFor ?? p.createdAt,
    channels: Object.fromEntries(CHANNELS.map((c) => [c, p.channels[c].enabled ? p.channels[c].status : 'off'])),
    urls: Object.fromEntries(CHANNELS.filter((c) => p.channels[c].url).map((c) => [c, p.channels[c].url])),
    igMediaId: p.channels.instagram.mediaId,
    source: p.source, suggestedFor: p.suggestedFor, media: p.master.media?.path,
  };
  const idx = await getIndex();
  await putJSON(INDEX, [row, ...idx.filter((r) => r.id !== p.id)].sort((a, b) => b.when.localeCompare(a.when)).slice(0, 1000));
}

export async function deletePost(id: string) {
  const idx = await getIndex();
  await putJSON(INDEX, idx.filter((r) => r.id !== id));
  await putJSON(postPath(id), null);
}

/** Tracked link for a channel: /go/p-<postId>-<li|ig|tt> → linkUrl with utm tags (lib/campaigns-style). */
export const trackedLink = (postId: string, ch: ChannelKey) => `${FUNNEL.site}/go/p-${postId}-${CHANNEL_CODE[ch]}`;

export function parseTracked(id: string): { postId: string; ch: ChannelKey } | null {
  const m = /^p-(p\d{8}-[a-z0-9]{4})-(li|ig|tt)$/.exec(id);
  if (!m) return null;
  const ch = (Object.entries(CHANNEL_CODE).find(([, v]) => v === m[2])?.[0] ?? 'linkedin') as ChannelKey;
  return { postId: m[1], ch };
}

export function destinationFor(postId: string, ch: ChannelKey) {
  const url = new URL(FUNNEL.content.linkUrl);
  url.searchParams.set('utm_source', ch);
  url.searchParams.set('utm_medium', 'social');
  url.searchParams.set('utm_campaign', postId);
  return url.toString();
}

// ---------------------------------------------------------------- pre-flight
export type Issue = { ch: ChannelKey | 'post'; level: 'block' | 'warn'; text: string };

const LIMITS = { linkedin: 3000, instagram: 2200, tiktok: 2200 };

export function preflight(p: ContentPost, ctx: { linkedinDaysLeft?: number | null; tiktokApproved: boolean; keywords: string[] }): Issue[] {
  const out: Issue[] = [];
  const m = p.master.media;
  const { linkedin: li, instagram: ig, tiktok: tt } = p.channels;
  const vertical = m?.width && m?.height ? m.height / m.width : undefined;
  const isVertical = vertical !== undefined && vertical > 1.7 && vertical < 1.85;

  if (!CHANNELS.some((c) => p.channels[c].enabled)) out.push({ ch: 'post', level: 'block', text: 'Tick at least one channel.' });

  if (li.enabled) {
    if (!li.text.trim()) out.push({ ch: 'linkedin', level: 'block', text: 'Write the LinkedIn post.' });
    if (li.text.length > LIMITS.linkedin) out.push({ ch: 'linkedin', level: 'block', text: `Over LinkedIn's 3,000 characters (${li.text.length}).` });
    if (/https?:\/\//i.test(li.text)) out.push({ ch: 'linkedin', level: 'warn', text: 'There’s a link in the post. LinkedIn shows those to fewer people; put it in the first comment instead.' });
    if (ctx.linkedinDaysLeft == null) out.push({ ch: 'linkedin', level: 'block', text: 'LinkedIn isn’t connected (LinkedIn tab → Connect).' });
    else if (ctx.linkedinDaysLeft <= 7) out.push({ ch: 'linkedin', level: 'warn', text: `LinkedIn connection expires in ${ctx.linkedinDaysLeft} days. Reconnect soon.` });
    if (m?.kind === 'video' && m.durationSec && (m.durationSec < 3 || m.durationSec > 1800)) out.push({ ch: 'linkedin', level: 'block', text: 'LinkedIn videos must be 3 seconds to 30 minutes.' });
  }

  if (ig.enabled) {
    if (!m) out.push({ ch: 'instagram', level: 'block', text: 'Instagram needs a video or image.' });
    if (ig.caption.length > LIMITS.instagram) out.push({ ch: 'instagram', level: 'block', text: `Over Instagram's 2,200 characters (${ig.caption.length}).` });
    if (m?.kind === 'video' && !isVertical) out.push({ ch: 'instagram', level: 'warn', text: 'Reels look best at 9:16 (vertical). This video isn’t.' });
    if (m?.kind === 'video' && m.durationSec && (m.durationSec < 3 || m.durationSec > 900)) out.push({ ch: 'instagram', level: 'block', text: 'Reels must be 3 seconds to 15 minutes.' });
    if (ctx.keywords.length && !ctx.keywords.some((k) => new RegExp(`\\b${k}\\b`, 'i').test(ig.caption))) out.push({ ch: 'instagram', level: 'warn', text: `No keyword call to action (e.g. “Comment ${ctx.keywords[0]}”), so this post won’t bring DM leads.` });
  }

  if (tt.enabled) {
    if (m?.kind !== 'video') out.push({ ch: 'tiktok', level: 'block', text: 'TikTok posts need a video.' });
    if (tt.caption.length > LIMITS.tiktok) out.push({ ch: 'tiktok', level: 'block', text: `Over TikTok's 2,200 characters (${tt.caption.length}).` });
    if (!tt.privacy) out.push({ ch: 'tiktok', level: 'block', text: 'Choose who can see the TikTok.' });
    if (tt.brandedContent && tt.privacy === 'SELF_ONLY') out.push({ ch: 'tiktok', level: 'block', text: 'Branded content can’t be private on TikTok.' });
    if (m?.kind === 'video' && !isVertical) out.push({ ch: 'tiktok', level: 'warn', text: 'TikTok is vertical (9:16). This video isn’t.' });
    if (!ctx.tiktokApproved) out.push({ ch: 'tiktok', level: 'warn', text: 'TikTok refused the last post (app not audited yet), so this waits in the held tray until Send all gets one through.' });
  }

  // Guardrail: a number in a caption that isn't in the idea or transcript might be made up (AI or memory).
  const source = `${p.master.idea}\n${p.master.transcript ?? ''}`;
  const texts: [ChannelKey, string][] = [['linkedin', li.text], ['instagram', ig.caption], ['tiktok', tt.caption]];
  for (const [c, t] of texts) {
    if (!p.channels[c].enabled) continue;
    const stray = strayNumbers(t, source);
    if (stray.length) out.push({ ch: c, level: 'warn', text: `Mentions ${stray.join(', ')}, which isn’t in your idea or transcript. Check it’s true.` });
  }
  return out;
}
