import { NextResponse, type NextRequest } from 'next/server';
import { connectWithCode } from '@/lib/linkedin';
import { logEvent } from '@/lib/events';

// LinkedIn sends Naufal back here after he approves (redirect URL registered on the LinkedIn app). Only a
// request carrying the state cookie set by /dashboard/linkedin/connect in the last 10 minutes is accepted.
const STATE_COOKIE = 'naunas_li_state';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const back = (p: string) => {
    const res = NextResponse.redirect(new URL(`/dashboard/linkedin?${p}`, req.url));
    res.cookies.delete({ name: STATE_COOKIE, path: '/api/linkedin' });
    return res;
  };
  const state = req.cookies.get(STATE_COOKIE)?.value;
  if (!state || state !== q.get('state')) return back('error=state');
  if (q.get('error')) return back(`error=${encodeURIComponent(q.get('error_description') || q.get('error')!)}`);
  const code = q.get('code');
  if (!code) return back('error=no_code');
  try {
    await connectWithCode(code);
  } catch (err) {
    console.error('[linkedin] connect failed', err);
    return back(`error=${encodeURIComponent(err instanceof Error ? err.message.slice(0, 200) : 'connect_failed')}`);
  }
  await logEvent('linkedin', 'LinkedIn connected', '/dashboard/linkedin');
  return back('connected=1');
}
