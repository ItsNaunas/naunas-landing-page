// Instagram API with Instagram Login (env IG_ACCESS_TOKEN: long-lived token for the business account,
// 60 days, refreshed by the health check). Only two calls: who sent a DM, and the one private reply
// Instagram allows to a comment.

const GRAPH = 'https://graph.instagram.com/v23.0';

async function ig<T>(path: string, init: RequestInit = {}): Promise<T> {
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

/** Whole-word, any-case keyword match ("leak", "LEAK!", "send me the map"). */
export function hasKeyword(text: string, keywords: readonly string[]) {
  return keywords.some((k) => new RegExp(`\\b${k}\\b`, 'i').test(text));
}
