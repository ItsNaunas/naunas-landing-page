import { NextResponse, type NextRequest } from 'next/server';
import { DASH_COOKIE, validSession } from '@/lib/dashAuth';

// Optimistic gate for /dashboard: no valid session cookie → the login page. The dashboard page and its
// server actions check the session again themselves (the proxy is not the only lock).
export async function proxy(req: NextRequest) {
  if (req.nextUrl.pathname === '/dashboard/login') return NextResponse.next();
  if (await validSession(req.cookies.get(DASH_COOKIE)?.value)) return NextResponse.next();
  return NextResponse.redirect(new URL('/dashboard/login', req.url));
}

export const config = { matcher: ['/dashboard', '/dashboard/:path*'] };
