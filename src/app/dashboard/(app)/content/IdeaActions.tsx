'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { draftFromIdea, refreshMarketWatch } from '../../actions';

/** "Start a post": an idea card becomes a new draft, opened straight away. */
export function UseIdeaButton({ idea, label = 'Start a post →' }: { idea: string; label?: string }) {
  const [busy, start] = useTransition();
  const router = useRouter();
  return (
    <button type="button" disabled={busy || !idea.trim()}
      onClick={() => start(async () => { const r = await draftFromIdea(idea); if (r.id) router.push(`/dashboard/content/${r.id}`); })}
      className="shrink-0 rounded-lg bg-white/[0.08] hover:bg-white/[0.14] px-2.5 py-1.5 text-xs text-white/85 disabled:opacity-40">{busy ? 'Opening…' : label}</button>
  );
}

/** Pull the watch-list now instead of waiting for Monday. */
export function RefreshMarketButton() {
  const [busy, start] = useTransition();
  const [msg, setMsg] = useState('');
  const router = useRouter();
  return (
    <span className="flex items-center gap-2">
      {msg && <span className="text-[11px] text-white/60">{msg}</span>}
      <button type="button" disabled={busy} onClick={() => start(async () => {
        const r = await refreshMarketWatch();
        setMsg(r.error ?? (r.queued ? 'Pulling now: about 2 minutes. Refresh the page then.' : 'Updated.'));
        if (!r.error && !r.queued) router.refresh();
      })} className="text-xs text-white/60 hover:text-white disabled:opacity-40">{busy ? 'Pulling…' : 'Refresh ↻'}</button>
    </span>
  );
}
