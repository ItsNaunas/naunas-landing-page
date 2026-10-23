'use client';

import { useEffect, useState } from 'react';
import { ActionForm } from './ActionForm';
import { undoLastAction } from '@/app/dashboard/actions';

/** "Done · Undo" for 60 seconds after a one-click action (lib/undo). Shown by the dashboard layout. */
export function UndoBar({ label, at, external }: { label: string; at: string; external?: boolean }) {
  const left = () => Math.max(0, 60 - Math.floor((Date.now() - Date.parse(at)) / 1000));
  // null until mounted: the countdown depends on the clock, so the server render shows no number (no hydration mismatch).
  const [secs, setSecs] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setSecs(left());
    const first = setTimeout(tick, 0);
    const t = setInterval(tick, 1000);
    return () => { clearTimeout(first); clearInterval(t); };
    // left() only depends on `at`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [at]);
  if (secs !== null && secs <= 0) return null;
  return (
    <div role="status" className="fixed z-40 left-1/2 -translate-x-1/2 bottom-24 md:bottom-6 flex items-center gap-3 rounded-xl border border-white/10 bg-[#1b1b1b] pl-4 pr-2 py-2 text-sm shadow-2xl shadow-black/60 max-w-[calc(100vw-2rem)]">
      <span className="min-w-0 truncate">{label}{external ? <span className="text-white/60"> · HubSpot changes stay</span> : null}</span>
      <ActionForm action={undoLastAction}>
        <button className="rounded-lg bg-white text-black px-3 py-1.5 text-xs font-medium">Undo{secs !== null && <span className="tabular-nums text-black/60"> {secs}s</span>}</button>
      </ActionForm>
    </div>
  );
}
