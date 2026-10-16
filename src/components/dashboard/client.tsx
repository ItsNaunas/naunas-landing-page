'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

/** Global search: name, email or Instagram handle → Leads. "/" or Ctrl/⌘+K focuses it. */
export function SearchBox({ defaultValue = '' }: { defaultValue?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const router = useRouter();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing)) {
        e.preventDefault();
        ref.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return (
    <form role="search" className="relative w-full"
      onSubmit={(e) => { e.preventDefault(); const q = ref.current?.value.trim(); router.push(q ? `/dashboard/leads?q=${encodeURIComponent(q)}` : '/dashboard/leads'); }}>
      <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-white/35" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
      <input ref={ref} name="q" defaultValue={defaultValue} placeholder="Search people…" aria-label="Search people by name, email or Instagram"
        className="w-full rounded-xl bg-white/[0.05] border border-white/[0.06] pl-9 pr-12 py-2 text-sm text-white placeholder:text-white/35 outline-none focus:border-[#F2613F]/60 focus:bg-white/[0.07]" />
      <kbd className="hidden md:block absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-white/35 border border-white/10 rounded px-1.5 py-0.5">Ctrl K</kbd>
    </form>
  );
}

/** Re-fetch the page's live data without a full reload. */
export function RefreshButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [at, setAt] = useState<string>('');
  useEffect(() => setAt(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })), []);
  return (
    <button type="button" onClick={() => start(() => { router.refresh(); setAt(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })); })}
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
