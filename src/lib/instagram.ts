// Instagram API with Instagram Login (env IG_ACCESS_TOKEN: long-lived token for the business account,
// 60 days, refreshed by the health check). Only two calls: who sent a DM, and the one private reply
// Instagram allows to a comment.

const GRAPH = 'https://graph.instagram.com/v23.0';

export async function ig<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = process.env.IG_ACCESS_TOKEN;
  if (!token) throw new Error('Missing IG_ACCESS_TOKEN');
  const res = await fetch(`${GRAPH}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`Instagram ${init.method ?? 'GET'} ${path} → ${res.status}: ${await res.text()}`);
  return (await res.json()) as T;
}

/** Username and display name of someone who messaged the account (by their Instagram-scoped id). */
export function igProfile(igsid: string) {
  return ig<{ username?: string; name?: string }>(`/${igsid}?fields=username,name`);
}

/** The single private DM Instagram lets a business send in reply to a comment (within 7 days of it). */
export function privateReply(commentId: string, text: string) {
  return ig('/me/messages', { method: 'POST', body: JSON.stringify({ recipient: { comment_id: commentId }, message: { text } }) });
}

/** A normal DM, only as a reply to someone who messaged us (Instagram's 24-hour window). */
export function sendDm(igsid: string, text: string) {
  return ig('/me/messages', { method: 'POST', body: JSON.stringify({ recipient: { id: igsid }, message: { text } }) });
}

/** Public link of one of our posts (for reporting which post a lead came from). */
export function igMedia(mediaId: string) {
  return ig<{ permalink?: string; caption?: string }>(`/${mediaId}?fields=permalink,caption`);
}

/** Health check: the token still works. */
export function igMe() {
  return ig<{ username: string }>('/me?fields=username');
}

/** Extends the long-lived token another 60 days (allowed once it is 24h old). */
export async function refreshIgToken(): Promise<{ changed: boolean; expiresInDays: number }> {
  const token = process.env.IG_ACCESS_TOKEN;
  if (!token) throw new Error('Missing IG_ACCESS_TOKEN');
  const res = await fetch(`https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(token)}`);
  if (!res.ok) throw new Error(`Instagram token refresh → ${res.status}: ${await res.text()}`);
  const body = (await res.json()) as { access_token: string; expires_in: number };
  return { changed: body.access_token !== token, expiresInDays: Math.round(body.expires_in / 86400) };
}

// ---------------------------------------------------------------- publishing (needs instagram_business_content_publish)
// Instagram fetches the file itself, so `mediaUrl` is a short-lived /m/ link (lib/mediaLink.ts). Flow: create a
// container → wait until Instagram has processed it → publish → read the permalink.

async function igUserId() {
  return (await ig<{ user_id?: string; id: string }>('/me?fields=user_id')).user_id ?? (await ig<{ id: string }>('/me?fields=id')).id;
}

export async function publishToInstagram(kind: 'video' | 'image', mediaUrl: string, caption: string, maxWaitMs = 240_000) {
  const uid = await igUserId();
  const body = kind === 'video'
    ? { media_type: 'REELS', video_url: mediaUrl, caption, share_to_feed: true }
    : { image_url: mediaUrl, caption };
  const { id: container } = await ig<{ id: string }>(`/${uid}/media`, { method: 'POST', body: JSON.stringify(body) });
  const until = Date.now() + maxWaitMs;
  for (;;) {
    const s = await ig<{ status_code?: string; status?: string }>(`/${container}?fields=status_code,status`);
    if (s.status_code === 'FINISHED' || (kind === 'image' && !s.status_code)) break;
    if (s.status_code === 'ERROR' || s.status_code === 'EXPIRED') throw new Error(`Instagram couldn't process the ${kind}: ${s.status ?? s.status_code}`);
    if (Date.now() > until) throw new Error('Instagram is still processing the video. Press Retry in a few minutes.');
    await new Promise((r) => setTimeout(r, 5000));
  }
  const { id: mediaId } = await ig<{ id: string }>(`/${uid}/media_publish`, { method: 'POST', body: JSON.stringify({ creation_id: container }) });
  const { permalink } = await igMedia(mediaId).catch(() => ({ permalink: undefined }));
  return { mediaId, permalink };
}

/** Whole-word, any-case keyword match ("leak", "LEAK!", "send me the map"). */
export function hasKeyword(text: string, keywords: readonly string[]) {
  return keywords.some((k) => new RegExp(`\\b${k}\\b`, 'i').test(text));
}

/** Health: proves the token may publish (instagram_business_content_publish) without posting anything. */
export async function checkIgPublish() {
  const uid = await igUserId();
  try {
    const r = await ig<{ data: { quota_usage?: number; config?: { quota_total?: number } }[] }>(`/${uid}/content_publishing_limit?fields=quota_usage,config`);
    const q = r.data[0];
    return `allowed · ${q?.quota_usage ?? 0}/${q?.config?.quota_total ?? 100} posts used today`;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(/permission|scope|#10\b|#200\b|OAuth/i.test(msg)
      ? 'token has no publish permission: add instagram_business_content_publish, generate a NEW token, replace IG_ACCESS_TOKEN'
      : msg.slice(0, 160));
  }
}
