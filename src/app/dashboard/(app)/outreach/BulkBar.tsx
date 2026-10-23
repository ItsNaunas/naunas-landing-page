'use client';

import { useEffect, useState, useTransition } from 'react';
import { setProspect } from '@/app/dashboard/actions';

/**
 * Prospects → Review: tick firms, then Approve or Skip them in one go. The checkboxes are plain inputs in the
 * server-rendered list (input[data-bulk]); this bar reads them, so the list itself stays a server component.
 * The same setProspect action runs, so the Undo bar covers a bulk change too.
 */
export function BulkBar({ group }: { group: string }) {
  const [ids, setIds] = useState<string[]>([]);
  const [pending, start] = useTransition();
  const boxes = () => [...document.querySelectorAll<HTMLInputElement>(`input[data-bulk="${group}"]`)];
  useEffect(() => {
    const read = () => setIds(boxes().filter((b) => b.checked).map((b) => b.value));
    document.addEventListener('change', read);
    return () => document.removeEventListener('change', read);
    // boxes() only depends on `group`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group]);
  const setAll = (on: boolean) => { boxes().forEach((b) => { b.checked = on; }); setIds(on ? boxes().map((b) => b.value) : []); };
  const run = (status: 'approved' | 'rejected') => start(async () => {
    const f = new FormData(); f.set('ids', ids.join(',')); f.set('status', status);
    await setProspect(f);
    window.location.reload();
  });
  return (
    <div className="px-5 py-2.5 border-b border-white/[0.06] flex flex-wrap items-center gap-2 text-xs" aria-busy={pending}>
      <label className="flex items-center gap-2 text-white/70 cursor-pointer">
        <input type="checkbox" className="size-4 accent-[#F2613F]" checked={ids.length > 0 && ids.length === boxes().length} onChange={(e) => setAll(e.target.checked)} aria-label="Select all firms" />
        {ids.length ? `${ids.length} selected` : 'Select all'}
      </label>
      {ids.length > 0 && (
        <span className="ml-auto flex gap-2">
          <button disabled={pending} onClick={() => run('approved')} className="rounded-full bg-white text-black font-medium px-3 py-1.5 disabled:opacity-50">Approve {ids.length}</button>
          <button disabled={pending} onClick={() => run('rejected')} className="rounded-full border border-white/15 px-3 py-1.5 text-white/70 hover:text-white disabled:opacity-50">Skip {ids.length}</button>
          <button disabled={pending} onClick={() => setAll(false)} className="px-2 py-1.5 text-white/60 hover:text-white">Clear</button>
        </span>
      )}
    </div>
  );
}
