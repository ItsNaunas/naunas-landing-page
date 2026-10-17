// Runs a content post's channels. Each channel is independent: they run in parallel, each result is saved
// the moment it lands (so a timeout on one can't lose another), and a failure only marks that channel.
// TikTok waits in "held" until the app is approved (env TIKTOK_APPROVED=1): unaudited apps can only post
// to private accounts. Called only from Naufal's Publish click or a schedule he set.

import { get, del } from '@vercel/blob';
import { getPost, savePost, rollUp, trackedLink, preflight, CHANNELS, CHANNEL_LABEL, type ChannelKey, type ContentPost } from '@/lib/content';
import { publishPost as linkedinPost, commentOnPost, postUrl } from '@/lib/linkedin';
import { publishVideo as tiktokPost } from '@/lib/tiktok';
import { publishToInstagram } from '@/lib/instagram';
import { getCampaigns, saveCampaigns } from '@/lib/campaigns';
import { mediaLink } from '@/lib/mediaLink';
import { notify, line } from '@/lib/alert';
import { logEvent } from '@/lib/events';
import { FUNNEL } from '@/config/funnel';

export const tiktokApproved = () => process.env.TIKTOK_APPROVED === '1';

type Outcome = { status: 'posted' | 'failed' | 'held'; url?: string; error?: string; patch?: Record<string, unknown> };

async function mediaBuffer(p: ContentPost): Promise<Buffer> {
  const m = p.master.media;
  if (!m) throw new Error('No media on this post');
  const blob = await get(m.path, { access: 'private', useCache: false });
  if (!blob || blob.statusCode !== 200) throw new Error('The uploaded file has gone. Upload it again.');
  return Buffer.from(await new Response(blob.stream).arrayBuffer());
}

async function runLinkedIn(p: ContentPost, buf: () => Promise<Buffer>): Promise<Outcome> {
  const c = p.channels.linkedin;
  const m = p.master.media;
  const media = m ? { kind: m.kind, data: await buf(), title: c.text.split('\n')[0].slice(0, 100) } : undefined;
  const urn = await linkedinPost(c.text, c.visibility, media);
  let error: string | undefined;
  if (urn && c.firstComment.trim()) {
    const text = c.firstComment.replace('{link}', trackedLink(p.id, 'linkedin'));
    await commentOnPost(urn, text).catch((err) => { error = `Posted, but the first comment failed: ${err instanceof Error ? err.message : err}`; });
  }
  return { status: 'posted', url: urn ? postUrl(urn) : undefined, error, patch: { urn } };
}

async function runInstagram(p: ContentPost): Promise<Outcome> {
  const c = p.channels.instagram;
  const m = p.master.media;
  if (!m) throw new Error('Instagram needs a video or image');
  const { mediaId, permalink } = await publishToInstagram(m.kind, mediaLink(m.path), c.caption.replace('{link}', trackedLink(p.id, 'instagram')));
  // Point the chosen keyword campaign at this post so comment→DM (and its lead attribution) works here.
  if (c.campaignId) {
    const list = await getCampaigns();
    const camp = list.find((x) => x.id === c.campaignId);
    if (camp && camp.postIds.length) { camp.postIds = [...new Set([...camp.postIds, mediaId])]; await saveCampaigns(list); }
  }
  return { status: 'posted', url: permalink, patch: { mediaId } };
}

async function runTikTok(p: ContentPost, buf: () => Promise<Buffer>): Promise<Outcome> {
  if (!tiktokApproved()) return { status: 'held' };
  const c = p.channels.tiktok;
  try {
    const publishId = await tiktokPost(await buf(), {
      caption: c.caption, privacy: c.privacy, allowComment: c.allowComment, allowDuet: c.allowDuet, allowStitch: c.allowStitch,
      yourBrand: c.yourBrand, brandedContent: c.brandedContent,
    });
    return { status: 'posted', patch: { publishId } };
  } catch (err) {
    if (String(err).includes('unaudited_client')) return { status: 'held' };
    throw err;
  }
}

/** Pre-flight with live context (LinkedIn token age, TikTok approval, Instagram keywords). */
export async function checkPost(p: ContentPost) {
  const { linkedinAccount } = await import('@/lib/linkedin');
  const [li, campaigns] = await Promise.all([linkedinAccount().catch(() => null), getCampaigns()]);
  const camp = campaigns.find((c) => c.id === p.channels.instagram.campaignId);
  const keywords = camp ? camp.keywords : [...FUNNEL.instagram.keywords];
  return preflight(p, { linkedinDaysLeft: li && !li.expired ? li.daysLeft : null, tiktokApproved: tiktokApproved(), keywords });
}

/**
 * Publish the given channels of a post (default: every enabled one that isn't already posted).
 * `expectScheduled`: only run if the post is still scheduled (the QStash fire route), so a cancelled or
 * already-published schedule does nothing.
 */
export async function runPost(id: string, opts: { only?: ChannelKey[]; expectScheduled?: boolean } = {}) {
  const p = await getPost(id);
  if (!p) throw new Error('Post not found');
  if (opts.expectScheduled && p.status !== 'scheduled') return { skipped: true as const, post: p };

  const targets = (opts.only ?? CHANNELS).filter((c) => p.channels[c].enabled && p.channels[c].status !== 'posted');
  if (!targets.length) return { skipped: true as const, post: p };
  for (const c of targets) Object.assign(p.channels[c], { status: 'publishing', error: undefined });
  p.status = 'publishing';
  if (!opts.only) { p.scheduledFor = undefined; p.qstashMessageId = undefined; }
  await savePost(p);

  // One download shared by the channels that need the bytes.
  let cached: Promise<Buffer> | undefined;
  const buf = () => (cached ??= mediaBuffer(p));

  // Saves are chained so parallel channels never overwrite each other's results.
  let saving = Promise.resolve();
  const record = (c: ChannelKey, o: Outcome) => {
    const ch = p.channels[c];
    Object.assign(ch, o.patch ?? {}, { status: o.status, url: o.url ?? ch.url, error: o.error, attempts: ch.attempts + 1 });
    if (o.status === 'posted') ch.postedAt = new Date().toISOString();
    p.status = rollUp(p);
    saving = saving.then(() => savePost(p)).catch((err) => console.error('[publish] save failed', err));
    return saving;
  };

  const runners: Record<ChannelKey, () => Promise<Outcome>> = {
    linkedin: () => runLinkedIn(p, buf),
    instagram: () => runInstagram(p),
    tiktok: () => runTikTok(p, buf),
  };
  await Promise.all(targets.map(async (c) => {
    try { await record(c, await runners[c]()); } catch (err) {
      await record(c, { status: 'failed', error: (err instanceof Error ? err.message : String(err)).slice(0, 400) });
    }
  }));
  await saving;

  // Our copy of the media is only needed while something may still be sent (failed → Retry, held → later).
  const pending = CHANNELS.some((c) => p.channels[c].enabled && ['failed', 'held', 'ready', 'scheduled'].includes(p.channels[c].status));
  if (!pending && p.master.media) await del(p.master.media.path).catch(() => {});

  const results = targets.map((c) => ({ c, ...p.channels[c] }));
  const posted = results.filter((r) => r.status === 'posted').length;
  const icon = { posted: '✅', failed: '❌', held: '⏳' } as Record<string, string>;
  await logEvent('content', `Posted ${posted}/${results.length}: ${p.master.idea.slice(0, 60) || p.id}`, `/dashboard/content?post=${p.id}`);
  await notify({
    level: results.some((r) => r.status === 'failed') ? 'error' : 'ok',
    title: `Posted ${posted}/${results.length}${results.some((r) => r.status === 'held') ? ' · TikTok held' : ''}`,
    lines: results.map((r) => line(icon[r.status] ?? '•', CHANNEL_LABEL[r.c], r.status === 'held' ? 'waiting for TikTok approval' : r.error ?? (r.url ? 'live' : r.status))),
    quote: p.master.idea.slice(0, 200) || undefined,
    buttons: [
      ...results.filter((r) => r.url).map((r) => ({ text: `Open on ${CHANNEL_LABEL[r.c]}`, url: r.url! })),
      { text: 'Open in dashboard', url: `${FUNNEL.site}/dashboard/content?post=${p.id}` },
    ],
  });
  return { skipped: false as const, post: p };
}
