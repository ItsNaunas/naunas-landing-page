'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { newContentPost, refreshBriefing, refreshOps } from '@/app/dashboard/actions';
import { openAsk } from './AskNaunas';
import type { Hit } from '@/app/dashboard/(app)/search/route';

// Ctrl+K (or /): go to any page, do the common actions, find people, firms, posts and proposals.
// "g" then a letter jumps straight to a page (g t Today, g l Leads ...). "?" lists the shortcuts.

type Cmd = { id: string; group: 'Go to' | 'Do' | 'Find'; title: string; sub?: string; keys?: string; run: () => void };

const PAGES: { title: string; href: string; key?: string; words?: string }[] = [
  { title: 'Today', href: '/dashboard', key: 't', words: 'home overview needs you contact list plan' },
  { title: 'Leads', href: '/dashboard/leads', key: 'l', words: 'people contacts enquiries' },
  { title: 'Outreach · Prospects', href: '/dashboard/outreach/prospects', key: 'o', words: 'firms review start research' },
  { title: 'Outreach · In outreach', href: '/dashboard/outreach/prospects?step=outreach', words: 'sequences in flight cadence stop' },
  { title: 'Outreach · Results', href: '/dashboard/outreach/results', words: 'reply rate channels opener reps' },
  { title: 'Pipeline · Deals', href: '/dashboard/pipeline', key: 'p', words: 'board stages win rate' },
  { title: 'Pipeline · Proposals', href: '/dashboard/pipeline/proposals', words: 'quotes scope deposit accept' },
  { title: 'Pipeline · Calls', href: '/dashboard/pipeline/calls', words: 'cal.com bookings audits' },
  { title: 'Content · Plan', href: '/dashboard/content', key: 'c', words: 'posts week schedule ideas hooks' },
  { title: 'Content · Performance', href: '/dashboard/content/performance', words: 'leaderboard clicks instagram tiktok video' },
  { title: 'Content · Email', href: '/dashboard/content/newsletter', words: 'newsletter mailerlite sequences' },
  { title: 'Content · Keyword DMs', href: '/dashboard/content/keywords', words: 'campaigns comments instagram' },
  { title: 'Clients', href: '/dashboard/clients', key: 'k', words: 'won onboarding checklist handover retainers notes' },
  { title: 'Money', href: '/dashboard/money', key: 'm', words: 'stripe payments invoices revenue retainers' },
  { title: 'System · Health & connections', href: '/dashboard/system', key: 's', words: 'checks problems keys accounts connect' },
  { title: 'System · Activity', href: '/dashboard/system/automations', words: 'log events automations webhooks' },
  { title: 'LinkedIn connection', href: '/dashboard/linkedin', words: 'connect post' },
  { title: 'TikTok connection', href: '/dashboard/tiktok', words: 'connect post' },
];

const typing = (t: EventTarget | null) => t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t instanceof HTMLSelectElement || (t instanceof HTMLElement && t.isContentEditable);

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const [, start] = useTransition();
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);

  const close = () => { setOpen(false); setQ(''); setHits([]); setActive(0); };
  const go = (href: string) => { close(); router.push(href); };

  // Global keys: Ctrl+K or / opens, ? shows shortcuts, g + letter jumps to a page.
  useEffect(() => {
    let g = 0;
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); setOpen((o) => !o); return; }
      if (typing(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === '/') { e.preventDefault(); setOpen(true); return; }
      if (e.key === '?') { e.preventDefault(); setQ('?'); setOpen(true); return; }
      if (e.key === 'g') { g = Date.now(); return; }
      if (g && Date.now() - g < 1200) {
        const page = PAGES.find((p) => p.key === e.key.toLowerCase());
        g = 0;
        if (page) { e.preventDefault(); router.push(page.href); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [router]);


  // Live search, debounced.
  useEffect(() => {
    const term = q.trim();
    if (!open || term.length < 2 || term === '?') { setHits([]); setLoading(false); return; }
    setLoading(true);
    const ctl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/dashboard/search?q=${encodeURIComponent(term)}`, { signal: ctl.signal })
        .then((r) => r.json()).then((d: { hits?: Hit[] }) => { setHits(d.hits ?? []); setLoading(false); })
        .catch(() => setLoading(false));
    }, 200);
    return () => { clearTimeout(t); ctl.abort(); };
  }, [q, open]);

  const cmds = useMemo<Cmd[]>(() => {
    const term = q.trim().toLowerCase();
    const match = (...s: (string | undefined)[]) => !term || term === '?' || s.some((x) => x?.toLowerCase().includes(term));
    const out: Cmd[] = [];
    if (term && term !== '?') {
      out.push({ id: 'ask', group: 'Do', title: `Ask Naunas: “${q.trim()}”`, sub: 'Answers from your dashboard and HubSpot', keys: 'Ctrl J', run: () => { close(); openAsk(q.trim()); } });
      out.push({ id: 'leads', group: 'Do', title: `Search leads for “${q.trim()}”`, run: () => go(`/dashboard/leads?q=${encodeURIComponent(q.trim())}`) });
    }
    const actions: Cmd[] = [
      { id: 'post', group: 'Do', title: 'New post', sub: 'Opens the post editor', run: () => { close(); start(() => { void newContentPost(); }); } },
      { id: 'proposal', group: 'Do', title: 'New proposal', sub: 'On Pipeline, or from a lead page', run: () => go('/dashboard/pipeline/proposals#new-proposal') },
      { id: 'plan', group: 'Do', title: 'Write today’s plan', sub: 'The written plan at the top of Today', run: () => { close(); start(async () => { await refreshBriefing(); window.location.assign('/dashboard'); }); } },
      { id: 'refresh', group: 'Do', title: 'Refresh data', sub: 'Re-read HubSpot, Stripe and the rest', run: () => { close(); start(async () => { await refreshOps(); router.refresh(); }); } },
      { id: 'askopen', group: 'Do', title: 'Ask Naunas', keys: 'Ctrl J', run: () => { close(); openAsk(); } },
    ];
    out.push(...actions.filter((a) => match(a.title, a.sub)));
    out.push(...PAGES.filter((p) => match(p.title, p.words)).map((p) => ({ id: p.href, group: 'Go to' as const, title: p.title, keys: p.key ? `g ${p.key}` : undefined, run: () => go(p.href) })));
    out.push(...hits.map((h, i) => ({ id: `hit-${i}`, group: 'Find' as const, title: h.title, sub: `${h.kind}${h.sub ? ` · ${h.sub}` : ''}`, run: () => go(h.href) })));
    return out;
    // close/go/start are stable enough for this list; re-deriving on q and hits is what matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, hits]);

  useEffect(() => { setActive(0); }, [q, hits.length]);
  useEffect(() => { list.current?.querySelector(`[data-i="${active}"]`)?.scrollIntoView({ block: 'nearest' }); }, [active]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(cmds.length - 1, a + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); cmds[active]?.run(); }
  };

  let i = -1;
  const groups = (['Find', 'Do', 'Go to'] as const).map((g) => ({ g, items: cmds.filter((c) => c.group === g) })).filter((x) => x.items.length);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label="Search or jump to (Ctrl+K)"
        className="w-full flex items-center gap-2 rounded-xl bg-white/[0.05] border border-white/[0.06] pl-3 pr-2 py-2 text-sm text-white/60 hover:text-white/80 hover:bg-white/[0.07] text-left">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
        <span className="flex-1 truncate">Search or jump to…</span>
        <kbd className="rounded border border-white/15 px-1.5 text-[11px] font-mono text-white/60">Ctrl K</kbd>
      </button>
      {/* Portal: the trigger sits in the blurred sticky header, which would trap a fixed overlay inside it. */}
      {open && createPortal(
        <div className="fixed inset-0 z-50 grid place-items-start justify-center px-4 pt-[12vh]" role="dialog" aria-modal="true" aria-label="Command palette">
          <button className="absolute inset-0 bg-black/60" aria-label="Close" onClick={close} />
          <div className="relative w-full max-w-[600px] rounded-2xl border border-white/10 bg-[#1b1b1b] shadow-2xl shadow-black/60 overflow-hidden" onKeyDown={onKeyDown}>
            <div className="flex items-center gap-3 border-b border-white/[0.08] px-4">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/60 shrink-0" aria-hidden><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
              <input ref={input} autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search people, firms, posts, proposals, or type a page or action…"
                role="combobox" aria-expanded="true" aria-controls="cmd-list" aria-activedescendant={cmds[active] ? `cmd-${active}` : undefined}
                className="min-w-0 flex-1 bg-transparent py-4 text-base text-white placeholder:text-white/50 outline-none focus-visible:outline-none" />
              {loading && <span className="text-[11px] text-white/55">Searching…</span>}
              <kbd className="rounded border border-white/15 px-1.5 text-[11px] font-mono text-white/60">Esc</kbd>
            </div>
            {q.trim() === '?' ? (
              <div className="p-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                {[['Ctrl K or /', 'Open this palette'], ['Ctrl J', 'Ask Naunas'], ['↑ ↓ then Enter', 'Pick a result'], ['Esc', 'Close'],
                  ...PAGES.filter((p) => p.key).map((p) => [`g ${p.key}`, p.title] as [string, string])].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between gap-3 border-b border-white/[0.05] py-1.5">
                    <span className="text-white/75">{v}</span><kbd className="rounded border border-white/15 px-1.5 text-[11px] font-mono text-white/70">{k}</kbd>
                  </div>
                ))}
              </div>
            ) : (
              <ul id="cmd-list" ref={list} role="listbox" className="max-h-[min(60vh,460px)] overflow-y-auto py-2">
                {groups.map(({ g, items }) => (
                  <li key={g} role="presentation">
                    <p className="px-4 pt-2 pb-1 text-[11px] font-medium uppercase tracking-[0.08em] text-white/55">{g}</p>
                    <ul role="presentation">
                      {items.map((c) => {
                        i += 1;
                        const n = i;
                        return (
                          <li key={c.id} id={`cmd-${n}`} data-i={n} role="option" aria-selected={n === active}
                            onMouseMove={() => setActive(n)} onClick={() => c.run()}
                            className={`mx-2 flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 ${n === active ? 'bg-white/[0.08]' : ''}`}>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm text-white/90">{c.title}</span>
                              {c.sub && <span className="block truncate text-xs text-white/60">{c.sub}</span>}
                            </span>
                            {c.keys && <kbd className="rounded border border-white/15 px-1.5 text-[11px] font-mono text-white/60">{c.keys}</kbd>}
                          </li>
                        );
                      })}
                    </ul>
                  </li>
                ))}
                {!cmds.length && <li className="px-4 py-6 text-center text-sm text-white/60">Nothing matches “{q}”. Try a name, a firm or a page.</li>}
              </ul>
            )}
            <div className="flex items-center justify-between gap-4 border-t border-white/[0.08] px-4 py-2 text-[11px] text-white/55">
              <span>↑↓ to move · Enter to open · ? for shortcuts</span>
              <span className="hidden sm:inline">g then t, l, o, p, c, m, s jumps to a page</span>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
