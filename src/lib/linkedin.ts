// LinkedIn (self-serve products: "Sign In with LinkedIn using OpenID Connect" + "Share on LinkedIn"),
// env LINKEDIN_CLIENT_ID / LINKEDIN_CLIENT_SECRET. Naufal connects his own profile from /dashboard/linkedin;
// the token is stored encrypted (lib/sealed.ts). Self-serve apps get no refresh token: it lasts 60 days,
// then he presses Connect again (the health check warns 7 days ahead). Posts only on his Publish click.
// Stats on personal posts aren't available to self-serve apps (r_member_social is closed).
// Docs: learn.microsoft.com/linkedin (Posts, Images, Videos APIs).

import { storeReady, getJSON, putJSON } from '@/lib/store';
import { sealedStore } from '@/lib/sealed';
import { FUNNEL } from '@/config/funnel';

const REST = 'https://api.linkedin.com/rest';
// Monthly versions, each supported for at least a year. Bump yearly (or set LINKEDIN_API_VERSION).
const VERSION = process.env.LINKEDIN_API_VERSION ?? '202609';
export const REDIRECT_URI = `${FUNNEL.site}/api/linkedin/callback`;
export const SCOPES = ['openid', 'profile', 'w_member_social'];
const POSTS_PATH = 'linkedin/posts.json';

type Token = { access_token: string; expires_at: number; scope: string; sub: string; name?: string; picture?: string };

const clientId = () => process.env.LINKEDIN_CLIENT_ID?.trim() ?? '';
const clientSecret = () => process.env.LINKEDIN_CLIENT_SECRET?.trim() ?? '';
export const linkedinConfigured = () => !!clientId() && !!clientSecret() && storeReady();

const tokens = sealedStore<Token>('linkedin', 'linkedin/token.json', clientSecret);

export function authorizeUrl(state: string) {
  const q = new URLSearchParams({ response_type: 'code', client_id: clientId(), redirect_uri: REDIRECT_URI, state, scope: SCOPES.join(' ') });
  return `https://www.linkedin.com/oauth/v2/authorization?${q}`;
}

export async function connectWithCode(code: string) {
  const res = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: REDIRECT_URI, client_id: clientId(), client_secret: clientSecret() }),
  });
  const b = await res.json() as { access_token?: string; expires_in?: number; scope?: string; error?: string; error_description?: string };
  if (!res.ok || !b.access_token) throw new Error(`LinkedIn token → ${res.status}: ${b.error ?? ''} ${b.error_description ?? ''}`.trim());
  const me = await fetch('https://api.linkedin.com/v2/userinfo', { headers: { Authorization: `Bearer ${b.access_token}` } });
  const u = await me.json() as { sub?: string; name?: string; picture?: string };
  if (!me.ok || !u.sub) throw new Error(`LinkedIn userinfo → ${me.status}`);
  await tokens.save({ access_token: b.access_token, expires_at: Date.now() + (b.expires_in ?? 5184000) * 1000, scope: b.scope ?? '', sub: u.sub, name: u.name, picture: u.picture });
}

/** The stored connection (null when not connected or expired). */
export async function linkedinAccount() {
  if (!linkedinConfigured()) return null;
  const t = await tokens.load();
  if (!t) return null;
  return { name: t.name, picture: t.picture, expiresAt: new Date(t.expires_at).toISOString(), daysLeft: Math.floor((t.expires_at - Date.now()) / 86_400_000), expired: t.expires_at <= Date.now() };
}

export async function disconnect() {
  const t = await tokens.load();
  if (t) {
    await fetch('https://www.linkedin.com/oauth/v2/revoke', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: clientId(), client_secret: clientSecret(), token: t.access_token }),
    }).catch(() => {});
  }
  await tokens.clear();
}

async function token(): Promise<Token> {
  const t = await tokens.load();
  if (!t) throw new Error('LinkedIn not connected');
  if (t.expires_at <= Date.now()) throw new Error('LinkedIn connection expired: press Connect LinkedIn again');
  return t;
}

async function rest(path: string, t: Token, body?: unknown) {
  const res = await fetch(`${REST}${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { Authorization: `Bearer ${t.access_token}`, 'Linkedin-Version': VERSION, 'X-Restli-Protocol-Version': '2.0.0', 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (!res.ok) throw new Error(`LinkedIn ${path.split('?')[0]} → ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return res;
}

/** Post text is LinkedIn "little text": these characters must be escaped or the text gets cut. # stays, so hashtags work. */
export const escapeLittle = (s: string) => s.replace(/[\\|{}@[\]()<>*_~]/g, (c) => `\\${c}`);

async function uploadImage(t: Token, owner: string, file: Buffer) {
  const init = await (await rest('/images?action=initializeUpload', t, { initializeUploadRequest: { owner } })).json() as { value: { uploadUrl: string; image: string } };
  const put = await fetch(init.value.uploadUrl, { method: 'PUT', headers: { Authorization: `Bearer ${t.access_token}` }, body: new Uint8Array(file) });
  if (!put.ok) throw new Error(`LinkedIn image upload → ${put.status}`);
  return init.value.image;
}

async function uploadVideo(t: Token, owner: string, file: Buffer) {
  const init = await (await rest('/videos?action=initializeUpload', t, {
    initializeUploadRequest: { owner, fileSizeBytes: file.length, uploadCaptions: false, uploadThumbnail: false },
  })).json() as { value: { video: string; uploadToken: string; uploadInstructions: { uploadUrl: string; firstByte: number; lastByte: number }[] } };
  const etags: string[] = [];
  for (const part of init.value.uploadInstructions) {
    const put = await fetch(part.uploadUrl, { method: 'PUT', headers: { 'Content-Type': 'application/octet-stream' }, body: new Uint8Array(file.subarray(part.firstByte, part.lastByte + 1)) });
    if (!put.ok) throw new Error(`LinkedIn video upload → ${put.status}`);
    etags.push(put.headers.get('etag') ?? '');
  }
  await rest('/videos?action=finalizeUpload', t, { finalizeUploadRequest: { video: init.value.video, uploadToken: init.value.uploadToken, uploadedPartIds: etags } });
  // Wait (up to ~2 min) for processing so the post doesn't go out with a broken video.
  for (let i = 0; i < 24; i++) {
    const v = await (await rest(`/videos/${encodeURIComponent(init.value.video)}`, t)).json() as { status?: string; processingFailureReason?: string };
    if (v.status === 'AVAILABLE') return init.value.video;
    if (v.status === 'PROCESSING_FAILED') throw new Error(`LinkedIn couldn't process the video: ${v.processingFailureReason ?? 'unknown reason'}`);
    await new Promise((r) => setTimeout(r, 5000));
  }
  throw new Error('LinkedIn is still processing the video. Try publishing again in a few minutes.');
}

export type Media = { kind: 'image' | 'video'; data: Buffer; title?: string; alt?: string };

/** Publishes to Naufal's profile. Returns the post URN (urn:li:share:… or urn:li:ugcPost:…). */
export async function publishPost(text: string, visibility: 'PUBLIC' | 'CONNECTIONS', media?: Media): Promise<string> {
  const t = await token();
  const author = `urn:li:person:${t.sub}`;
  let content: Record<string, unknown> | undefined;
  if (media?.kind === 'image') content = { media: { id: await uploadImage(t, author, media.data), ...(media.alt ? { altText: media.alt } : {}) } };
  if (media?.kind === 'video') content = { media: { id: await uploadVideo(t, author, media.data), title: media.title || 'Video' } };
  const res = await rest('/posts', t, {
    author, commentary: escapeLittle(text), visibility,
    distribution: { feedDistribution: 'MAIN_FEED', targetEntities: [], thirdPartyDistributionChannels: [] },
    ...(content ? { content } : {}),
    lifecycleState: 'PUBLISHED', isReshareDisabledByAuthor: false,
  });
  return res.headers.get('x-restli-id') ?? '';
}

export const postUrl = (urn: string) => `https://www.linkedin.com/feed/update/${urn}/`;

/** Comment on one of Naufal's own posts (used for the first-comment link). */
export async function commentOnPost(postUrn: string, text: string) {
  const t = await token();
  await rest(`/socialActions/${encodeURIComponent(postUrn)}/comments`, t, { actor: `urn:li:person:${t.sub}`, object: postUrn, message: { text } });
}

// ---------------------------------------------------------------- our post log
export type PostRecord = { urn: string; text: string; visibility: string; media?: 'image' | 'video'; at: string };
export const getPosts = () => getJSON<PostRecord[]>(POSTS_PATH, []);
export const savePosts = (p: PostRecord[]) => putJSON(POSTS_PATH, p.slice(0, 50));

/** Health check: connected and not about to lapse (no refresh tokens on self-serve apps). */
export async function checkLinkedIn() {
  const a = await linkedinAccount();
  if (!a) throw new Error('not connected');
  if (a.expired) throw new Error('connection expired: press Connect LinkedIn on /dashboard/linkedin');
  if (a.daysLeft <= 7) throw new Error(`connection expires in ${a.daysLeft} day${a.daysLeft === 1 ? '' : 's'}: press Connect LinkedIn on /dashboard/linkedin`);
  return `${a.name ?? 'connected'} · ${a.daysLeft} days left`;
}
