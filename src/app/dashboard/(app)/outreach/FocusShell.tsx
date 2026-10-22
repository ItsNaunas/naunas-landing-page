'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const FOCUS = 'naunas-focus';
const SKIPPED = 'naunas-focus-skipped';
const read = <T,>(store: Storage | undefined, key: string, fallback: T): T => { try { const v = store?.getItem(key); return v ? (JSON.parse(v) as T) : fallback; } catch { return fallback; } };
const save = (store: Storage | undefined, key: string, v: unknown) => { try { store?.setItem(key, JSON.stringify(v)); } catch { /* private mode: fine */ } };

/**
 * Focus mode for Today's list: one item at a time, full width. "Skip" moves on for this session; ticking an
 * item reloads the page and the next one shows. Remembered per browser.
 */
export function FocusShell({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [focus, setFocus] = useState(false);
  const [pos, setPos] = useState({ at: 0, total: 0 });

  const apply = useCallback(() => {
    const root = ref.current;
    if (!root) return;
    const items = [...root.querySelectorAll<HTMLElement>('[data-item]')];
    const skipped = new Set(read<string[]>(typeof window === 'undefined' ? undefined : sessionStorage, SKIPPED, []));
    const order = [...items.filter((el) => !skipped.has(el.dataset.item!)), ...items.filter((el) => skipped.has(el.dataset.item!))];
    const current = focus ? order[0] : undefined;
    items.forEach((el) => { el.hidden = focus && el !== current; });
    root.querySelectorAll<HTMLElement>('[data-group]').forEach((g) => { g.hidden = focus && !g.querySelector('[data-item]:not([hidden])'); });
    setPos({ at: current ? items.length - order.length + 1 : 0, total: items.length });
  }, [focus]);

  useEffect(() => { setFocus(read(typeof window === 'undefined' ? undefined : localStorage, FOCUS, false)); }, []);
  useEffect(() => { apply(); }, [apply]);

  const toggle = () => { const next = !focus; setFocus(next); save(localStorage, FOCUS, next); };
  const skip = () => {
    const current = ref.current?.querySelector<HTMLElement>('[data-item]:not([hidden])')?.dataset.item;
    if (!current) return;
    const list = read<string[]>(sessionStorage, SKIPPED, []).filter((x) => x !== current);
    save(sessionStorage, SKIPPED, [...list, current]);
    apply();
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <button type="button" onClick={toggle} aria-pressed={focus}
          className={`rounded-full px-3 py-1.5 text-xs border ${focus ? 'bg-[#F2613F] border-[#F2613F] text-white' : 'border-white/15 text-white/70 hover:border-white/30'}`}>
          {focus ? 'Focus mode on' : 'Focus mode: one at a time'}
        </button>
        {focus && pos.total > 1 && <button type="button" onClick={skip} className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-white/70 hover:border-white/30">Skip for now ›</button>}
        {focus && pos.total > 0 && <span className="text-xs text-white/60">{pos.total} left today</span>}
      </div>
      <div ref={ref} className={focus ? '[&_[data-item]]:py-5 [&_[data-item]_p]:text-base' : ''}>{children}</div>
    </div>
  );
}

/** Opens the chat in a new tab and puts the message on the clipboard in the same click. */
export function OpenCopy({ href, text, label }: { href: string; text: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      onClick={() => { navigator.clipboard?.writeText(text).catch(() => {}); setDone(true); setTimeout(() => setDone(false), 2500); }}
      className="shrink-0 rounded-full bg-[#F2613F] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#ff7553]">
      {done ? 'Copied, paste it ↗' : `${label} ↗`}
    </a>
  );
}
