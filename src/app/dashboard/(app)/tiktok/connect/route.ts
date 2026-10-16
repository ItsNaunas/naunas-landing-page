import { randomBytes } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { DASH_COOKIE, validSession } from '@/lib/dashAuth';
import { authorizeUrl, tiktokConfigured } from '@/lib/tiktok';

// "Connect TikTok": sends Naufal to TikTok's login with a one-time state, checked by /api/tiktok/callback.
// Behind the dashboard login (proxy + the check below).
const STATE_COOKIE = 'naunas_tt_state';

export async function GET(req: NextRequest) {
  if (!(await validSession(req.cookies.get(DASH_COOKIE)?.value))) return NextResponse.redirect(new URL('/dashboard/login', req.url));
  if (!tiktokConfigured()) return NextResponse.redirect(new URL('/dashboard/tiktok?error=not_configured', req.url));
  const state = randomBytes(24).toString('hex');
  const res = NextResponse.redirect(authorizeUrl(state));
  res.cookies.set(STATE_COOKIE, state, { httpOnly: true, secure: true, sameSite: 'lax', path: '/api/tiktok', maxAge: 600 });
  return res;
}
