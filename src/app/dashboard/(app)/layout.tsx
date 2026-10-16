import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { DASH_COOKIE, validSession } from '@/lib/dashAuth';
import { FUNNEL } from '@/config/funnel';
import { SideNav, TabNav } from '@/components/dashboard/Nav';
import { linkProps } from '@/components/dashboard/ui';
import { logout } from '../actions';

// Naunas Ops shell: sidebar (desktop) / tabs (mobile). The session is checked here as well as in the
// proxy, so no page under (app) renders without it.

const Logo = () => (
  <a href="/dashboard" className="text-lg font-semibold tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
    Naunas<span className="text-[#F2613F]">.</span> <span className="text-white/45 font-normal">Ops</span>
  </a>
);

export default async function OpsLayout({ children }: { children: React.ReactNode }) {
  if (!(await validSession((await cookies()).get(DASH_COOKIE)?.value))) redirect('/dashboard/login');
  return (
    <div className="min-h-screen md:grid md:grid-cols-[232px_1fr]">
      <aside className="hidden md:flex flex-col gap-8 border-r border-white/[0.06] bg-[#0E0E0E] px-4 py-6 sticky top-0 h-screen">
        <div className="px-3"><Logo /></div>
        <SideNav alerts={0} />
        <div className="mt-auto flex flex-col gap-1 text-sm">
          <a href={FUNNEL.cockpitUrl} {...linkProps} className="rounded-lg px-3 py-2 text-white/55 hover:text-white hover:bg-white/[0.04]">Vault cockpit ↗</a>
          <a href="/" {...linkProps} className="rounded-lg px-3 py-2 text-white/55 hover:text-white hover:bg-white/[0.04]">naunas.co.uk ↗</a>
          <form action={logout}><button className="w-full text-left rounded-lg px-3 py-2 text-white/35 hover:text-white hover:bg-white/[0.04]">Sign out</button></form>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="md:hidden sticky top-0 z-10 bg-[#0C0C0C]/90 backdrop-blur border-b border-white/[0.06] px-4 pt-4 pb-3 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <Logo />
            <form action={logout}><button className="text-xs text-white/40">Sign out</button></form>
          </div>
          <TabNav />
        </header>
        <main className="px-4 md:px-8 py-6 md:py-8 max-w-[1280px] flex flex-col gap-6">{children}</main>
      </div>
    </div>
  );
}
