import { todayData } from '@/lib/ops/tabs';
import { missing, type Flag } from '@/lib/ops/missing';
import { demoOn } from '@/lib/ops/demo';
import { Card, Kpi, Delta, Badge, Empty, Errors, compactGbp, linkProps } from '@/components/dashboard/ui';
import { Feed, SectionTitle, when, untilOrAgo, OWNER_TZ, SectionError, errFor } from '@/components/dashboard/kit';
import { Sparkline } from '@/components/dashboard/charts';

export const dynamic = 'force-dynamic';

// Overview = one list of what needs Naufal (calls, failing checks, promises, replies, stale deals, the outreach
// engine, content), four numbers, then what's happening. The day's written plan sits on Outreach → Today, which
// is where login lands. Nothing is listed twice.

type Tone = 'accent' | 'neutral' | 'bad' | 'good' | 'muted';
type Item = { rank: number; badge: string; tone: Tone; title: string; sub?: string; href?: string };

function greeting() {
  const h = Number(new Date().toLocaleString('en-GB', { hour: 'numeric', hour12: false, timeZone: OWNER_TZ }));
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

const ACTION: Record<string, { badge: string; tone: Tone; rank: number }> = {
  call: { badge: 'Call', tone: 'good', rank: 0 }, money: { badge: 'Money', tone: 'bad', rank: 1 }, system: { badge: 'Fix', tone: 'bad', rank: 1 },
  routine: { badge: 'Reply / send', tone: 'accent', rank: 3 }, stale: { badge: 'Follow up', tone: 'neutral', rank: 4 },
};
const LEVEL: Record<Flag['level'], { tone: Tone; rank: number }> = { high: { tone: 'bad', rank: 2 }, medium: { tone: 'accent', rank: 4 }, low: { tone: 'muted', rank: 5 } };

export default async function Today() {
  const [d, m] = await Promise.all([
    todayData(Date.now() - 86_400_000),
    demoOn() ? Promise.resolve({ flags: [] as Flag[] }) : missing().catch(() => ({ flags: [] as Flag[] })),
  ]);
  const k = d.kpis;
  const month = new Date().toLocaleDateString('en-GB', { month: 'long' });
  // The flags already cover deals going quiet (with better thresholds), so the queue's own stale-deal rows are dropped when flags exist.
  const items: Item[] = [
    ...d.actions.filter((a) => demoOn() || a.kind !== 'stale').map((a) => ({ ...ACTION[a.kind], title: a.title, sub: a.sub && /^\d{4}-/.test(a.sub) ? `${when(a.sub)} · ${untilOrAgo(a.sub)}` : a.sub, href: a.href })),
    ...m.flags.map((f) => ({ ...LEVEL[f.level], badge: f.area, title: f.title, sub: f.detail, href: f.href })),
  ].sort((a, b) => a.rank - b.rank);
  const top = items.slice(0, 8);

  return (
    <>
      <div>
        <h1 className="text-2xl md:text-[28px] font-semibold tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>{greeting()}, Naufal</h1>
        <p className="text-sm text-white/45 mt-1">
          {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: OWNER_TZ })}
          {' · '}{items.length ? `${items.length} thing${items.length === 1 ? '' : 's'} need${items.length === 1 ? 's' : ''} you` : 'nothing needs you right now'}
        </p>
      </div>
      <Errors errors={d.errors} />

      <div className="grid gap-3 md:gap-4">
        <Card title="Needs you" action={items.length ? <Badge tone="accent">{items.length}</Badge> : undefined} pad={false}>
          <div className="px-5"><SectionError errors={errFor(d.errors, 'Pipeline', 'Routine', 'Cal.com')} /></div>
          {items.length ? (
            <ul className="divide-y divide-white/[0.05]">
              {top.map((a, i) => {
                const inner = (
                  <>
                    <span className="w-[86px] shrink-0"><Badge tone={a.tone}>{a.badge}</Badge></span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm text-white/90">{a.title}</span>
                      {a.sub && <span className="block text-xs text-white/40 mt-0.5">{a.sub}</span>}
                    </span>
                    {a.href && <span className="text-white/25 group-hover:text-white/70 text-lg" aria-hidden>›</span>}
                  </>
                );
                return (
                  <li key={i}>
                    {a.href
                      ? <a href={a.href} {...(a.href.startsWith('http') ? linkProps : {})} className="group flex items-center gap-3 px-5 py-3 hover:bg-white/[0.025]">{inner}</a>
                      : <div className="flex items-center gap-3 px-5 py-3">{inner}</div>}
                  </li>
                );
              })}
            </ul>
          ) : <Empty>Nothing slipping. Calls, promises, replies without a next step, quiet deals and anything broken show up here.</Empty>}
          {items.length > top.length && (
            <details className="border-t border-white/[0.05]">
              <summary className="cursor-pointer px-5 py-2.5 text-xs text-white/50 hover:text-white">{items.length - top.length} more</summary>
              <ul className="px-5 pb-3 flex flex-col gap-1.5 text-[13px]">
                {items.slice(top.length).map((a, i) => <li key={i} className="flex items-start gap-2"><Badge tone={a.tone}>{a.badge}</Badge>{a.href ? <a href={a.href} className="hover:text-[#ff8a6d]">{a.title}</a> : a.title}</li>)}
              </ul>
            </details>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
        <Kpi label="New leads · 7 days" value={k.leads7} chart={<Sparkline values={d.spark} />} foot={<Delta now={k.leads7} prev={k.leadsPrev7} />} href="/dashboard/leads?range=7" />
        <Kpi label={d.agenda ? 'Calls coming up' : 'Calls booked'} value={k.calls} foot={<span className="text-xs text-white/40">{d.agenda ? 'from Cal.com' : 'deals in Audit booked'}</span>} href={d.agenda ? '/dashboard/pipeline/calls' : '/dashboard/pipeline'} />
        <Kpi label={`Won in ${month}`} value={compactGbp(k.wonMonth)} foot={<span className="text-xs text-white/40">{d.goal.pct}% of {compactGbp(d.goal.target)} goal</span>} href="/dashboard/pipeline" />
        <Kpi label="Open pipeline" value={compactGbp(k.openValue)} foot={<span className="text-xs text-white/40">{k.openCount} open deal{k.openCount === 1 ? '' : 's'}</span>} href="/dashboard/pipeline" />
      </div>
      <SectionError errors={errFor(d.errors, 'Leads', 'Won deals')} />

      <div className="grid lg:grid-cols-3 gap-3 md:gap-4">
        <div className="lg:col-span-2 flex flex-col gap-3 min-w-0">
          <SectionTitle action={<a href="/dashboard/system/automations" className="text-xs text-white/40 hover:text-white">All activity →</a>}>Live activity</SectionTitle>
          <Card><SectionError errors={errFor(d.errors, 'Activity')} /><Feed events={d.feed} /></Card>
        </div>
        <div className="flex flex-col gap-3 min-w-0">
          <SectionTitle action={d.agenda ? <a href="/dashboard/pipeline/calls" className="text-xs text-white/40 hover:text-white">Calls →</a> : undefined}>Coming up</SectionTitle>
          <Card>
            {d.agenda?.length ? (
              <ul className="flex flex-col divide-y divide-white/[0.05] -my-2">
                {d.agenda.slice(0, 5).map((b) => {
                  const a = b.attendees[0];
                  return (
                    <li key={b.uid} className="py-3">
                      <p className="text-sm font-medium">{a?.name ?? b.title}</p>
                      <p className="text-xs text-white/45 mt-0.5">{when(b.start)} your time · {untilOrAgo(b.start)}</p>
                      {a?.timeZone && <p className="text-[11px] text-white/30">{when(b.start, a.timeZone, false)} for them ({a.timeZone.split('/').pop()?.replace('_', ' ')})</p>}
                    </li>
                  );
                })}
              </ul>
            ) : <Empty>{d.agenda ? 'No calls booked.' : 'Connect Cal.com (System → Connections, CAL_API_KEY) to see call times here.'}</Empty>}
          </Card>
        </div>
      </div>
    </>
  );
}
