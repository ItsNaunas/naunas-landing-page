// Exact-time scheduling through Upstash QStash (free tier), env QSTASH_TOKEN + QSTASH_CURRENT_SIGNING_KEY +
// QSTASH_NEXT_SIGNING_KEY (QSTASH_URL if the account is on a regional endpoint). Vercel Hobby crons only run
// once a day, so QStash calls /api/content/fire at the chosen minute. No SDK: plain fetch + Web Crypto.

import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { FUNNEL } from '@/config/funnel';

const BASE = () => (process.env.QSTASH_URL ?? 'https://qstash.upstash.io').replace(/\/$/, '');
export const FIRE_URL = `${FUNNEL.site}/api/content/fire`;
export const qstashReady = () => !!process.env.QSTASH_TOKEN && !!process.env.QSTASH_CURRENT_SIGNING_KEY;

async function q(path: string, init: RequestInit = {}) {
  const res = await fetch(`${BASE()}${path}`, { ...init, headers: { Authorization: `Bearer ${process.env.QSTASH_TOKEN}`, ...(init.headers ?? {}) } });
  if (!res.ok) throw new Error(`QStash ${init.method ?? 'GET'} ${path.split('?')[0].slice(0, 40)} → ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res;
}

/** Calls FIRE_URL with `body` at `at` (no retries: publishing isn't safe to repeat blindly). Returns the message id. */
export async function scheduleAt(at: Date, body: Record<string, string>): Promise<string> {
  const res = await q(`/v2/publish/${FIRE_URL}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Upstash-Not-Before': String(Math.floor(at.getTime() / 1000)), 'Upstash-Retries': '0' },
    body: JSON.stringify(body),
  });
  return ((await res.json()) as { messageId: string }).messageId;
}

export async function cancelScheduled(messageId: string) {
  await q(`/v2/messages/${encodeURIComponent(messageId)}`, { method: 'DELETE' }).catch((err) => {
    // Already delivered or gone: the fire route re-checks the post's status anyway.
    if (!String(err).includes('404')) throw err;
  });
}

/** Health check: the token works. */
export async function checkQStash() {
  await q('/v2/schedules');
}

/** Verifies the Upstash-Signature JWT (HS256) against the current or next signing key, and the body hash. */
export function verifyQStash(signature: string | null, body: string): boolean {
  if (!signature) return false;
  const [h, p, s] = signature.split('.');
  if (!h || !p || !s) return false;
  const keys = [process.env.QSTASH_CURRENT_SIGNING_KEY, process.env.QSTASH_NEXT_SIGNING_KEY].filter(Boolean) as string[];
  const ok = keys.some((k) => {
    const want = Buffer.from(createHmac('sha256', k).update(`${h}.${p}`).digest('base64url'));
    const got = Buffer.from(s);
    return want.length === got.length && timingSafeEqual(want, got);
  });
  if (!ok) return false;
  try {
    const claims = JSON.parse(Buffer.from(p, 'base64url').toString('utf8')) as { iss?: string; sub?: string; exp?: number; nbf?: number; body?: string };
    const now = Date.now() / 1000;
    if (claims.iss !== 'Upstash' || (claims.exp && claims.exp < now - 60) || (claims.nbf && claims.nbf > now + 60)) return false;
    if (claims.sub && claims.sub !== FIRE_URL) return false;
    const bodyHash = createHash('sha256').update(body).digest('base64url');
    return (claims.body ?? '').replace(/=+$/, '') === bodyHash;
  } catch { return false; }
}
