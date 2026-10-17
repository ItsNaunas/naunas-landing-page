import { randomBytes } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { DASH_COOKIE, validSession } from '@/lib/dashAuth';
import { authorizeUrl, linkedinConfigured } from '@/lib/linkedin';

// "Connect LinkedIn": sends Naufal to LinkedIn's login with a one-time state, checked by /api/linkedin/callback.
const STATE_COOKIE = 'naunas_li_state';

export async function GET(req: NextRequest) {
  if (!(await validSession(req.cookies.get(DASH_COOKIE)?.value))) return NextResponse.redirect(new URL('/dashboard/login', req.url));
  if (!linkedinConfigured()) return NextResponse.redirect(new URL('/dashboard/linkedin?error=not_configured', req.url));
  const state = randomBytes(24).toString('hex');
  const res = NextResponse.redirect(authorizeUrl(state));
  res.cookies.set(STATE_COOKIE, state, { httpOnly: true, secure: true, sameSite: 'lax', path: '/api/linkedin', maxAge: 600 });
  return res;
}
