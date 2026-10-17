// Short-lived public links to private Blob media, for platforms that fetch the file themselves (Instagram
// Reels/images). /m/<token>: token = base64url(path).expiry.hmac, valid 1 hour, only for content/media/*.
// Key derived from DASHBOARD_PASSWORD (as lib/dashAuth.ts), so rotating it kills every outstanding link.

import { createHmac, timingSafeEqual } from 'node:crypto';
import { FUNNEL } from '@/config/funnel';

const PREFIX = 'content/media/';
const key = () => createHmac('sha256', process.env.DASHBOARD_PASSWORD ?? '').update('naunas-media-link-v1').digest();
const sign = (payload: string) => createHmac('sha256', key()).update(payload).digest('base64url');

export function mediaLink(path: string, ttlSec = 3600): string {
  if (!path.startsWith(PREFIX)) throw new Error('Only content media can be shared');
  const payload = `${Buffer.from(path).toString('base64url')}.${Math.floor(Date.now() / 1000) + ttlSec}`;
  return `${FUNNEL.site}/m/${payload}.${sign(payload)}`;
}

/** The Blob path for a valid, unexpired token; null otherwise. */
export function readMediaToken(token: string): string | null {
  const [p, exp, sig] = token.split('.');
  if (!p || !exp || !sig || !process.env.DASHBOARD_PASSWORD) return null;
  const want = Buffer.from(sign(`${p}.${exp}`));
  const got = Buffer.from(sig);
  if (want.length !== got.length || !timingSafeEqual(want, got)) return null;
  if (Number(exp) < Date.now() / 1000) return null;
  const path = Buffer.from(p, 'base64url').toString('utf8');
  return path.startsWith(PREFIX) && !path.includes('..') ? path : null;
}
