'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export type Tab = { href: string; label: string; badge?: number };

/** Section title + tabs. Each tab is a real page (own URL, own data), so back/bookmarks/Telegram links work. */
export function SectionHeader({ title, tabs, action }: { title: string; tabs: Tab[]; action?: React.ReactNode }) {
  const path = usePathname();
  // Longest matching href wins, so /dashboard/content/performance doesn't also light up "Plan".
  const active = tabs.filter((t) => path === t.href || path.startsWith(t.href + '/')).sort((a, b) => b.href.length - a.href.length)[0]?.href;
  return (
    <div className="flex flex-col gap-3 -mb-1">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl md:text-[28px] font-semibold tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>{title}</h1>
        {action}
      </div>
      <nav className="flex gap-1 overflow-x-auto border-b border-white/[0.07] -mx-4 px-4 md:mx-0 md:px-0 [scrollbar-width:none]" aria-label={`${title} sections`}>
        {tabs.map((t) => {
          const on = t.href === active;
          return (
            <Link key={t.href} href={t.href} aria-current={on ? 'page' : undefined}
              className={`relative shrink-0 px-3 py-2.5 text-sm whitespace-nowrap transition-colors ${on ? 'text-white' : 'text-white/50 hover:text-white/80'}`}>
              {t.label}
              {!!t.badge && <span className="ml-1.5 rounded-full bg-[#F2613F] px-1.5 py-px text-[10px] font-semibold text-white tabular-nums">{t.badge}</span>}
              {on && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-[#F2613F]" />}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
