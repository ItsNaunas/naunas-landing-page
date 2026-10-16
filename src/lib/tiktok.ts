// TikTok (Login Kit + Display API + Content Posting API), env TIKTOK_CLIENT_KEY / TIKTOK_CLIENT_SECRET.
// Naufal connects the Naunas account once from /dashboard/tiktok (OAuth); the tokens live in the private
// Blob store, AES-GCM encrypted with a key derived from the client secret, and refresh themselves
// (access token 24h, refresh token ~1 year). Posting only ever happens when he presses Publish.
// While the app is unaudited (sandbox), TikTok only allows SELF_ONLY (private) posts.

import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { getJSON, putJSON, storeReady } from '@/lib/store';
import { FUNNEL } from '@/config/funnel';

const API = 'https://open.tiktokapis.com/v2';
const TOKEN_PATH = 'tiktok/token.json';
const POSTS_PATH = 'tiktok/posts.json';
export const REDIRECT_URI = `${FUNNEL.site}/api/tiktok/callback`;
// Must match the scopes on the TikTok app exactly (every scope requested has to be added there).
export const SCOPES = (process.env.TIKTOK_SCOPES ?? 'user.info.basic,user.info.stats,video.list,video.upload,video.publish').split(',').map((s) => s.trim());

export const tiktokConfigured = () => !!process.env.TIKTOK_CLIENT_KEY && !!process.env.TIKTOK_CLIENT_SECRET && storeReady();

type Token = { access_token: string; refresh_token: string; open_id: string; scope: string; expires_at: number; refresh_expires_at: number };

// ---------------------------------------------------------------- token storage (encrypted)
const key = () => createHash('sha256').update(`naunas-tiktok:${process.env.TIKTOK_CLIENT_SECRET}`).digest();

function seal(t: Token): string {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', key(), iv);
  const body = Buffer.concat([c.update(JSON.stringify(t), 'utf8'), c.final()]);
  return [iv, c.getAuthTag(), body].map((b) => b.toString('base64')).join('.');
}

function open(s: string): Token | null {
  try {
    const [iv, tag, body] = s.split('.').map((p) => Buffer.from(p, 'base64'));
    const d = createDecipheriv('aes-256-gcm', key(), iv);
    d.setAuthTag(tag);
    return JSON.parse(Buffer.concat([d.update(body), d.final()]).toString('utf8')) as Token;
  } catch { return null; }
}

const loadToken = async () => {
  const s = await getJSON<{ sealed?: string }>(TOKEN_PATH, {});
  return s.sealed ? open(s.sealed) : null;
};
const saveToken = (t: Token) => putJSON(TOKEN_PATH, { sealed: seal(t), savedAt: new Date().toISOString() });

async function tokenRequest(params: Record<string, string>): Promise<Token> {
  const res = await fetch(`${API}/oauth/token/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Cache-Control': 'no-cache' },
    body: new URLSearchParams({ client_key: process.env.TIKTOK_CLIENT_KEY!, client_secret: process.env.TIKTOK_CLIENT_SECRET!, ...params }),
  });
  const b = await res.json() as { access_token?: string; refresh_token?: string; open_id?: string; scope?: string; expires_in?: number; refresh_expires_in?: number; error?: string; error_description?: string };
  if (!res.ok || !b.access_token) throw new Error(`TikTok token → ${res.status}: ${b.error ?? ''} ${b.error_description ?? ''}`.trim());
  const now = Date.now();
  return {
    access_token: b.access_token, refresh_token: b.refresh_token!, open_id: b.open_id!, scope: b.scope ?? '',
    expires_at: now + (b.expires_in ?? 86400) * 1000, refresh_expires_at: now + (b.refresh_expires_in ?? 31536000) * 1000,
  };
}

/** The TikTok login page Naufal is sent to from "Connect TikTok". */
export function authorizeUrl(state: string) {
  const q = new URLSearchParams({ client_key: process.env.TIKTOK_CLIENT_KEY!, scope: SCOPES.join(','), response_type: 'code', redirect_uri: REDIRECT_URI, state });
  return `https://www.tiktok.com/v2/auth/authorize/?${q}`;
}

export async function connectWithCode(code: string) {
  await saveToken(await tokenRequest({ code, grant_type: 'authorization_code', redirect_uri: REDIRECT_URI }));
}

/** A valid access token, refreshed when it has under 10 minutes left. Null when not connected. */
async function accessToken(): Promise<Token | null> {
  const t = await loadToken();
  if (!t) return null;
  if (t.expires_at - Date.now() > 10 * 60_000) return t;
  if (t.refresh_expires_at < Date.now()) throw new Error('TikTok connection expired: press Connect TikTok again');
  const next = await tokenRequest({ grant_type: 'refresh_token', refresh_token: t.refresh_token });
  await saveToken(next);
  return next;
}

export async function tiktokConnected() {
  return tiktokConfigured() && !!(await loadToken());
}

export async function disconnect() {
  const t = await loadToken();
  if (t) {
    await fetch(`${API}/oauth/revoke/`, {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_key: process.env.TIKTOK_CLIENT_KEY!, client_secret: process.env.TIKTOK_CLIENT_SECRET!, token: t.access_token }),
    }).catch(() => {});
  }
  await putJSON(TOKEN_PATH, {});
}

// ---------------------------------------------------------------- API calls
async function tt<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const t = await accessToken();
  if (!t) throw new Error('TikTok not connected');
  const res = await fetch(`${API}${path}`, {
    method: init.method ?? 'GET',
    headers: { Authorization: `Bearer ${t.access_token}`, 'Content-Type': 'application/json; charset=UTF-8' },
    ...(init.body ? { body: JSON.stringify(init.body) } : {}),
  });
  const b = await res.json().catch(() => ({})) as { data?: T; error?: { code?: string; message?: string } };
  if (!res.ok || (b.error?.code && b.error.code !== 'ok')) throw new Error(`TikTok ${path.split('?')[0]} → ${res.status}: ${b.error?.code ?? ''} ${b.error?.message ?? ''}`.trim());
  return b.data as T;
}

export type TikTokUser = {
  open_id: string; display_name?: string; avatar_url?: string; username?: string; profile_deep_link?: string;
  follower_count?: number; following_count?: number; likes_count?: number; video_count?: number;
};

export async function tiktokUser(): Promise<TikTokUser> {
  const fields = ['open_id', 'avatar_url', 'display_name', 'follower_count', 'following_count', 'likes_count', 'video_count'];
  if (SCOPES.includes('user.info.profile')) fields.push('username', 'profile_deep_link');
  return (await tt<{ user: TikTokUser }>(`/user/info/?fields=${fields.join(',')}`)).user;
}

export type TikTokVideo = {
  id: string; title?: string; video_description?: string; create_time: number; cover_image_url?: string; share_url?: string;
  duration?: number; view_count?: number; like_count?: number; comment_count?: number; share_count?: number;
};

export async function tiktokVideos(max = 20): Promise<TikTokVideo[]> {
  const fields = 'id,title,video_description,create_time,cover_image_url,share_url,duration,view_count,like_count,comment_count,share_count';
  return (await tt<{ videos: TikTokVideo[] }>(`/video/list/?fields=${fields}`, { method: 'POST', body: { max_count: max } })).videos ?? [];
}

export type CreatorInfo = {
  creator_avatar_url?: string; creator_username?: string; creator_nickname?: string;
  privacy_level_options: string[]; comment_disabled: boolean; duet_disabled: boolean; stitch_disabled: boolean;
  max_video_post_duration_sec: number;
};

/** Required before every post (TikTok's content-sharing guidelines): who is posting, allowed privacy levels, limits. */
export const creatorInfo = () => tt<CreatorInfo>('/post/publish/creator_info/query/', { method: 'POST' });

export type PostOptions = {
  caption: string; privacy: string; allowComment: boolean; allowDuet: boolean; allowStitch: boolean;
  yourBrand: boolean; brandedContent: boolean;
};

/** Direct Post by FILE_UPLOAD: init, then PUT the bytes in TikTok's chunk sizes (5–64 MB, last chunk takes the rest). */
export async function publishVideo(video: Buffer, o: PostOptions): Promise<string> {
  const size = video.length;
  const MB = 1024 * 1024;
  const chunk = size <= 64 * MB ? size : 10 * MB;
  const count = Math.floor(size / chunk);
  const init = await tt<{ publish_id: string; upload_url: string }>('/post/publish/video/init/', {
    method: 'POST',
    body: {
      post_info: {
        title: o.caption, privacy_level: o.privacy,
        disable_comment: !o.allowComment, disable_duet: !o.allowDuet, disable_stitch: !o.allowStitch,
        brand_organic_toggle: o.yourBrand, brand_content_toggle: o.brandedContent,
      },
      source_info: { source: 'FILE_UPLOAD', video_size: size, chunk_size: chunk, total_chunk_count: count },
    },
  });
  for (let i = 0; i < count; i++) {
    const start = i * chunk;
    const end = i === count - 1 ? size - 1 : start + chunk - 1;
    const res = await fetch(init.upload_url, {
      method: 'PUT',
      headers: { 'Content-Type': 'video/mp4', 'Content-Length': String(end - start + 1), 'Content-Range': `bytes ${start}-${end}/${size}` },
      body: new Uint8Array(video.subarray(start, end + 1)),
    });
    if (!res.ok) throw new Error(`TikTok upload chunk ${i + 1}/${count} → ${res.status}: ${await res.text()}`);
  }
  return init.publish_id;
}

export type PublishStatus = { status: string; fail_reason?: string; publicaly_available_post_id?: string[] };
export const publishStatus = (publishId: string) =>
  tt<PublishStatus>('/post/publish/status/fetch/', { method: 'POST', body: { publish_id: publishId } });

// ---------------------------------------------------------------- our post log (what was published from the dashboard)
export type PostRecord = { publishId: string; caption: string; privacy: string; at: string; status: string; failReason?: string };
export const getPosts = () => getJSON<PostRecord[]>(POSTS_PATH, []);
export const savePosts = (p: PostRecord[]) => putJSON(POSTS_PATH, p.slice(0, 50));

/** Health check: the stored connection still works. */
export async function checkTikTok() {
  const u = await tiktokUser();
  return u.display_name ?? u.open_id;
}
