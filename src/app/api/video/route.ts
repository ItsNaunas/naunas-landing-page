import { NextRequest, NextResponse } from 'next/server';
import { countVideoEvents, VIDEO_EVENTS, type VideoEvent } from '@/lib/videoWatch';

// Beacon from the landing-page video (play, quarter marks, end) and the end-of-video pop-up (shown,
// signed up). Anonymous counters only; anything unexpected is ignored.
export async function POST(req: NextRequest) {
  let raw: unknown = '';
  try { ({ e: raw = '' } = (await req.json()) as { e?: unknown }); } catch { /* not JSON */ }
  const events = (Array.isArray(raw) ? raw : [raw]).filter((x): x is VideoEvent => (VIDEO_EVENTS as readonly string[]).includes(x as string)).slice(0, 7);
  if (!events.length) return NextResponse.json({ ok: false }, { status: 400 });
  await countVideoEvents(events).catch(() => undefined);
  return NextResponse.json({ ok: true });
}
