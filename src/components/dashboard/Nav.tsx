'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ICONS: Record<string, React.ReactNode> = {
  overview: <path d="M3 13h8V3H3zM13 21h8V11h-8zM3 21h8v-6H3zM13 3v6h8V3z" />,
  pipeline: <path d="M4 5h4v14H4zM10 5h4v9h-4zM16 5h4v5h-4z" />,
  campaigns: <path d="M4 5h16v10H8l-4 4zM8 9h8M8 12h5" />,
  content: <path d="M4 4h16v16H4zM4 15l4-4 4 4 3-3 5 5M15 8.5h.01" />,
  routine: <path d="M12 7v5l3 2M21 12a9 9 0 1 1-9-9 9 9 0 0 1 9 9z" />,
  health: <path d="M3 12h4l2-5 4 10 2-5h6" />,
};

export const NAV = [
  { href: '/dashboard', label: 'Overview', icon: 'overview' },
  { href: '/dashboard/pipeline', label: 'Pipeline', icon: 'pipeline' },
  { href: '/dashboard/campaigns', label: 'Campaigns', icon: 'campaigns' },
  { href: '/dashboard/content', label: 'Content', icon: 'content' },
  { href: '/dashboard/routine', label: 'Routine', icon: 'routine' },
  { href: '/dashboard/health', label: 'Health', icon: 'health' },
];

function Icon({ name }: { name: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {ICONS[name]}
    </svg>
  );
}

export function SideNav({ alerts = 0 }: { alerts?: number }) {
  const path = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {NAV.map((n) => {
        const active = n.href === '/dashboard' ? path === n.href : path.startsWith(n.href);
        return (
          <Link key={n.href} href={n.href} aria-current={active ? 'page' : undefined}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${active ? 'bg-white/[0.07] text-white' : 'text-white/55 hover:text-white hover:bg-white/[0.04]'}`}>
            <span className={active ? 'text-[#F2613F]' : ''}><Icon name={n.icon} /></span>
            {n.label}
            {n.icon === 'health' && alerts > 0 && <span className="ml-auto rounded-full bg-rose-500/20 text-rose-300 text-[11px] px-1.5">{alerts}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

export function TabNav() {
  const path = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto -mx-4 px-4 pb-1 [scrollbar-width:none]">
      {NAV.map((n) => {
        const active = n.href === '/dashboard' ? path === n.href : path.startsWith(n.href);
        return (
          <Link key={n.href} href={n.href}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm ${active ? 'bg-white text-black font-medium' : 'text-white/60 bg-white/[0.05]'}`}>
            {n.label}
          </Link>
        );
      })}
    </nav>
  );
}
