import { NextResponse, type NextRequest } from 'next/server';
import { createFromStudio, studioAuthed } from '@/lib/studioDrop';
import type { Media } from '@/lib/content';

// Studio drop, step 2: the uploaded video becomes a draft post with captions and a suggested time
// (lib/studioDrop). Never schedules or posts.
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  if (!studioAuthed(req.headers.get('authorization'))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const b = (await req.json().catch(() => null)) as { media?: Partial<Media>; idea?: string; transcript?: string } | null;
  const m = b?.media;
  if (!m?.path?.startsWith('content/media/') || (m.kind !== 'video' && m.kind !== 'image') || !m.sizeBytes) {
    return NextResponse.json({ error: 'media.path (content/media/…), media.kind and media.sizeBytes are required' }, { status: 400 });
  }
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : undefined);
  const media: Media = { path: m.path, kind: m.kind, sizeBytes: m.sizeBytes, name: m.name?.slice(0, 120), durationSec: num(m.durationSec), width: num(m.width), height: num(m.height) };
  const out = await createFromStudio({ media, idea: b?.idea, transcript: b?.transcript });
  return NextResponse.json({ ok: true, ...out });
}
