import { NextResponse, type NextRequest } from 'next/server';
import { studioAuthed } from '@/lib/studioDrop';
import { saveVault } from '@/lib/assistantData';

// The laptop's vault summary (scripts/vault-sync.mjs, twice a day): client and project status, next steps,
// blockers and open tasks, so Ask Naunas knows where every engagement stands. Same bearer token as the
// studio drop (STUDIO_DROP_TOKEN): both are "my laptop is talking to the site".
export async function POST(req: NextRequest) {
  if (!studioAuthed(req.headers.get('authorization'))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const raw = await req.text();
  if (raw.length > 400_000) return NextResponse.json({ error: 'Too large' }, { status: 413 });
  try {
    const saved = await saveVault(JSON.parse(raw));
    return NextResponse.json({ ok: true, saved });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
