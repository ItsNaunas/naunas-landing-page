import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { DASH_COOKIE, validSession } from '@/lib/dashAuth';
import { FUNNEL } from '@/config/funnel';
import { SideNav, BottomNav } from '@/components/dashboard/Nav';
import { RefreshButton } from '@/components/dashboard/client';
import { CommandPalette } from '@/components/dashboard/CommandPalette';
import { UndoBar } from '@/components/dashboard/UndoBar';
import { pendingUndo } from '@/lib/undo';
import { linkProps } from '@/components/dashboard/ui';
import { logout } from '../actions';
import { attention } from '@/lib/ops/attention';
import { connected } from '@/lib/ops/common';
import { AskNaunas, AskButton } from '@/components/dashboard/AskNaunas';

// Naunas Ops shell: grouped sidebar + top bar (search, refresh) on desktop; top bar + bottom tabs on mobile.
// The session is checked here as well as in the proxy, so nothing under (app) renders without it.

const Logo = () => (
  <a href="/dashboard" className="text-lg font-semibold tracking-tight whitespace-nowrap" style={{ fontFamily: 'var(--font-display)' }}>
    Naunas<span className="text-[#F2613F]">.</span> <span className="text-white/60 font-normal">Ops</span>
  </a>
);

// Ask Naunas answers can take a few tool calls; give dashboard server actions room.
export const maxDuration = 120;

export default async function OpsLayout({ children }: { children: React.ReactNode }) {
  if (!(await validSession((await cookies()).get(DASH_COOKIE)?.value))) redirect('/dashboard/login');
  const [a, undo] = await Promise.all([attention().catch(() => ({ content: 0, outreach: 0 })), pendingUndo().catch(() => null)]);
  // The contact list lives on Today now, so its count badges Today.
  const badges = { '/dashboard/content': a.content, '/dashboard': a.outreach };
  // Money needs a Stripe read key; until it's set the page is a setup card, so it stays out of the nav.
  const hide = connected.stripe() ? [] : ['/dashboard/money'];
  return (
    <div className="min-h-screen md:grid md:grid-cols-[236px_1fr]">
      <aside className="hidden md:flex flex-col gap-7 border-r border-white/[0.06] bg-[#0E0E0E] px-3 py-5 sticky top-0 h-screen overflow-y-auto">
        <div className="px-3"><Logo /></div>
        <SideNav badges={badges} hide={hide} />
        <div className="mt-auto flex flex-col gap-0.5 text-[13px]">
          <a href={FUNNEL.cockpitUrl} {...linkProps} className="rounded-lg px-3 py-2 text-white/60 hover:text-white hover:bg-white/[0.04]">Vault cockpit ↗</a>
          <a href="/" {...linkProps} className="rounded-lg px-3 py-2 text-white/60 hover:text-white hover:bg-white/[0.04]">naunas.co.uk ↗</a>
          <form action={logout}><button className="w-full text-left rounded-lg px-3 py-2 text-white/55 hover:text-white hover:bg-white/[0.04]">Sign out</button></form>
        </div>
      </aside>

      <div className="min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 bg-[#0C0C0C]/90 backdrop-blur border-b border-white/[0.06]">
          <div className="max-w-[1320px] px-4 md:px-8 py-3 flex items-center gap-3">
            <div className="md:hidden"><Logo /></div>
            <div className="flex-1 max-w-md ml-auto md:ml-0"><CommandPalette /></div>
            <div className="hidden md:flex items-center gap-2 ml-auto"><RefreshButton /><AskButton /></div>
          </div>
        </header>
        <main className="flex-1 max-w-[1320px] w-full px-4 md:px-8 pt-6 pb-28 md:pb-12 flex flex-col gap-6">{children}</main>
      </div>
      <BottomNav badges={badges} hide={hide} />
      <AskNaunas />
      {undo && <UndoBar label={undo.label} at={undo.at} external={undo.external} />}
    </div>
  );
}
