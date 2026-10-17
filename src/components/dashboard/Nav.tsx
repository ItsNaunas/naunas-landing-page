'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const ICONS: Record<string, React.ReactNode> = {
  today: <path d="M4 5h16v15H4zM4 10h16M9 3v4M15 3v4" />,
  leads: <path d="M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM21 19v-1a4 4 0 0 0-3-3.9M15.5 3.1a3.5 3.5 0 0 1 0 6.8" />,
  pipeline: <path d="M4 5h4v14H4zM10 5h4v9h-4zM16 5h4v5h-4z" />,
  outreach: <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" />,
  calls: <path d="M12 7v5l3 2M21 12a9 9 0 1 1-9-9 9 9 0 0 1 9 9z" />,
  instagram: <path d="M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM17.5 6.5h.01" />,
  tiktok: <path d="M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5M14 3c.5 2.6 2.3 4.4 5 4.8" />,
  linkedin: <path d="M4 9h4v11H4zM6 3.5a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM10 9h4v1.6c.6-1 1.9-1.9 3.6-1.9C20.4 8.7 21 10.5 21 13v7h-4v-6.2c0-1.5-.5-2.4-1.8-2.4-1.4 0-2.2 1-2.2 2.4V20h-3z" />,
  email: <path d="M3 6h18v12H3zM3 7l9 6 9-6" />,
  content: <path d="M4 4h16v16H4zM4 15l4-4 4 4 3-3 5 5M15 8.5h.01" />,
  money: <path d="M12 3v18M17 7.5C17 5.6 14.8 4.5 12 4.5S7 5.6 7 7.5s2.2 2.8 5 3.5 5 1.6 5 3.5-2.2 3-5 3-5-1.1-5-3" />,
  automations: <path d="M12 3v3M12 18v3M4.2 6.2l2.1 2.1M17.7 15.7l2.1 2.1M3 12h3M18 12h3M4.2 17.8l2.1-2.1M17.7 8.3l2.1-2.1M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />,
  system: <path d="M3 12h4l2-5 4 10 2-5h6" />,
  more: <path d="M5 12h.01M12 12h.01M19 12h.01" />,
};

export const NAV_GROUPS: { label: string; items: { href: string; label: string; icon: string }[] }[] = [
  { label: 'Run the day', items: [
    { href: '/dashboard', label: 'Today', icon: 'today' },
    { href: '/dashboard/leads', label: 'Leads', icon: 'leads' },
    { href: '/dashboard/outreach', label: 'Outreach', icon: 'outreach' },
    { href: '/dashboard/pipeline', label: 'Pipeline', icon: 'pipeline' },
    { href: '/dashboard/calls', label: 'Calls', icon: 'calls' },
  ] },
  { label: 'Channels', items: [
    { href: '/dashboard/instagram', label: 'Instagram', icon: 'instagram' },
    { href: '/dashboard/tiktok', label: 'TikTok', icon: 'tiktok' },
    { href: '/dashboard/linkedin', label: 'LinkedIn', icon: 'linkedin' },
    { href: '/dashboard/email', label: 'Email', icon: 'email' },
    { href: '/dashboard/content', label: 'Content', icon: 'content' },
  ] },
  { label: 'Business', items: [
    { href: '/dashboard/money', label: 'Money', icon: 'money' },
    { href: '/dashboard/automations', label: 'Automations', icon: 'automations' },
    { href: '/dashboard/system', label: 'System', icon: 'system' },
  ] },
];
const ALL = NAV_GROUPS.flatMap((g) => g.items);
const BOTTOM = ['/dashboard', '/dashboard/leads', '/dashboard/outreach', '/dashboard/pipeline'];

function Icon({ name, size = 18 }: { name: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {ICONS[name]}
    </svg>
  );
}

const isActive = (path: string, href: string) => (href === '/dashboard' ? path === href : path.startsWith(href));

export function SideNav() {
  const path = usePathname();
  return (
    <nav className="flex flex-col gap-5" aria-label="Dashboard">
      {NAV_GROUPS.map((g) => (
        <div key={g.label} className="flex flex-col gap-0.5">
          <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/30">{g.label}</p>
          {g.items.map((n) => {
            const active = isActive(path, n.href);
            return (
              <Link key={n.href} href={n.href} aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${active ? 'bg-white/[0.08] text-white' : 'text-white/55 hover:text-white hover:bg-white/[0.04]'}`}>
                <span className={active ? 'text-[#F2613F]' : ''}><Icon name={n.icon} /></span>
                {n.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

/** Mobile: 4 main tabs + "More" sheet with everything else. */
export function BottomNav() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);
  const moreActive = !BOTTOM.some((h) => isActive(path, h));
  return (
    <>
      {open && (
        <div className="md:hidden fixed inset-0 z-40" role="dialog" aria-modal="true" aria-label="More pages">
          <button className="absolute inset-0 bg-black/60" aria-label="Close" onClick={() => setOpen(false)} />
          <div className="absolute bottom-[68px] inset-x-3 rounded-2xl bg-[#161616] border border-white/10 p-2 grid grid-cols-3 gap-1">
            {ALL.filter((n) => !BOTTOM.includes(n.href)).map((n) => (
              <Link key={n.href} href={n.href} className={`flex flex-col items-center gap-1.5 rounded-xl py-3 text-xs ${isActive(path, n.href) ? 'bg-white/[0.08] text-white' : 'text-white/60'}`}>
                <Icon name={n.icon} size={20} />{n.label}
              </Link>
            ))}
          </div>
        </div>
      )}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[#0E0E0E]/95 backdrop-blur border-t border-white/[0.08] grid grid-cols-5 pb-[env(safe-area-inset-bottom)]" aria-label="Dashboard">
        {BOTTOM.map((href) => {
          const n = ALL.find((x) => x.href === href)!;
          const active = isActive(path, href);
          return (
            <Link key={href} href={href} aria-current={active ? 'page' : undefined} className={`flex flex-col items-center gap-1 py-2.5 text-[10px] ${active ? 'text-white' : 'text-white/45'}`}>
              <span className={active ? 'text-[#F2613F]' : ''}><Icon name={n.icon} size={20} /></span>{n.label}
            </Link>
          );
        })}
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className={`flex flex-col items-center gap-1 py-2.5 text-[10px] ${moreActive || open ? 'text-white' : 'text-white/45'}`}>
          <span className={moreActive ? 'text-[#F2613F]' : ''}><Icon name="more" size={20} /></span>More
        </button>
      </nav>
    </>
  );
}
