'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { refreshOps } from '@/app/dashboard/actions';

/** Re-fetch the page's live data without a full reload. */
export function RefreshButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [at, setAt] = useState<string>('');
  useEffect(() => setAt(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })), []);
  return (
    <button type="button" onClick={() => start(async () => { await refreshOps(); router.refresh(); setAt(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })); })}
      className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] px-3 py-2 text-xs text-white/60 hover:text-white hover:border-white/20" aria-label="Refresh data">
      <svg className={pending ? 'animate-spin' : ''} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M21 12a9 9 0 1 1-2.6-6.4M21 4v5h-5" /></svg>
      <span className="hidden sm:inline">{pending ? 'Refreshing…' : at ? `Updated ${at}` : 'Refresh'}</span>
    </button>
  );
}

export function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button type="button" onClick={async () => { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); }}
      className="rounded-lg border border-white/10 px-2.5 py-1 text-xs text-white/60 hover:text-white hover:border-white/25">
      {done ? 'Copied ✓' : label}
    </button>
  );
}

/** Remembers when you last opened Today, for "since you last looked". */
export function MarkSeen({ cookie }: { cookie: string }) {
  useEffect(() => {
    const t = setTimeout(() => { document.cookie = `${cookie}=${Date.now()}; path=/dashboard; max-age=31536000; samesite=lax; secure`; }, 4000);
    return () => clearTimeout(t);
  }, [cookie]);
  return null;
}
