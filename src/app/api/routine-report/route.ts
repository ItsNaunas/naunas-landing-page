import { NextRequest, NextResponse } from 'next/server';
import { putJSON, listJSON, storeReady } from '@/lib/store';
import type { RoutineReport } from '@/lib/dashboard';

// The Claude "funnel operator" routine POSTs a summary here at the end of every run (even an empty one),
// so /dashboard can show what it did and warn when it stops running. Bearer ROUTINE_REPORT_SECRET.
// Keeps the latest 30 reports.

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '');

export async function POST(req: NextRequest) {
  const secret = process.env.ROUTINE_REPORT_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!storeReady()) return NextResponse.json({ error: 'Blob store not connected' }, { status: 503 });

  const body = (await req.json().catch(() => null)) as Partial<RoutineReport> | null;
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Expected JSON' }, { status: 400 });

  const counts = Object.fromEntries(
    (['replies', 'calls', 'proposals', 'retention', 'content'] as const).map((k) => [k, Math.max(0, Math.floor(Number(body.counts?.[k] ?? 0)) || 0)]),
  ) as RoutineReport['counts'];
  const report: RoutineReport = {
    runAt: new Date().toISOString(),
    nextRunAt: str(body.nextRunAt, 40) || undefined,
    counts,
    needsYou: (Array.isArray(body.needsYou) ? body.needsYou : []).slice(0, 20).map((n) => str(n, 300)).filter(Boolean),
    items: (Array.isArray(body.items) ? body.items : []).slice(0, 40).map((i) => ({
      job: str(i?.job, 20) || 'other',
      title: str(i?.title, 200),
      detail: str(i?.detail, 4000) || undefined,
      link: /^https:\/\//.test(str(i?.link, 500)) ? str(i?.link, 500) : undefined,
    })).filter((i) => i.title),
  };
  await putJSON(`routine/runs/${report.runAt.replace(/[:.]/g, '-')}.json`, report);
  await listJSON('routine/runs/', 0, 30); // prune to the latest 30
  return NextResponse.json({ ok: true, runAt: report.runAt });
}
