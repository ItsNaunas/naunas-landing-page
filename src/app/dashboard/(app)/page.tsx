import { cookies } from 'next/headers';
import { todayData } from '@/lib/ops/tabs';
import { Card, Kpi, Delta, Badge, Empty, Errors, compactGbp, gbp, linkProps } from '@/components/dashboard/ui';
import { Feed, EVENT_META, SectionTitle, when, untilOrAgo, OWNER_TZ } from '@/components/dashboard/kit';
import { Sparkline, Ring } from '@/components/dashboard/charts';
import { MarkSeen } from '@/components/dashboard/client';

export const dynamic = 'force-dynamic';
const SEEN = 'naunas_dash_seen';

const ACTION_STYLE: Record<string, { label: string; tone: 'accent' | 'neutral' | 'bad' | 'good' }> = {
  call: { label: 'Call', tone: 'good' }, routine: { label: 'Reply / send', tone: 'accent' }, stale: { label: 'Follow up', tone: 'neutral' },
  money: { label: 'Money', tone: 'bad' }, system: { label: 'Fix', tone: 'bad' },
};

function greeting() {
  const h = Number(new Date().toLocaleString('en-GB', { hour: 'numeric', hour12: false, timeZone: OWNER_TZ }));
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

export default async function Today() {
  const seen = Number((await cookies()).get(SEEN)?.value) || Date.now() - 86_400_000;
  const d = await todayData(seen);
  const k = d.kpis;
  const month = new Date().toLocaleDateString('en-GB', { month: 'long' });
  const bad = d.health.total - d.health.ok;

  return (
    <>
      <MarkSeen cookie={SEEN} />
      <div>
        <h1 className="text-2xl md:text-[28px] font-semibold tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>{greeting()}, Naufal</h1>
        <p className="text-sm text-white/45 mt-1">
          {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: OWNER_TZ })}
          {' · '}{d.actions.length ? `${d.actions.length} thing${d.actions.length === 1 ? '' : 's'} need${d.actions.length === 1 ? 's' : ''} you` : 'nothing needs you right now'}
        </p>
      </div>
      <Errors errors={d.errors} />

      {d.since.count > 0 && (
        <div className="rounded-2xl border border-[#F2613F]/25 bg-[#F2613F]/[0.06] px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <span className="font-medium">Since you last looked ({untilOrAgo(new Date(d.since.lastVisit).toISOString())})</span>
          {Object.entries(d.since.counts).map(([kind, n]) => (
            <span key={kind} className="text-white/75"><b className="font-semibold text-white">{n}</b> {(EVENT_META[kind]?.label ?? kind).toLowerCase()}</span>
          ))}
          <a href="/dashboard/automations" className="sm:ml-auto text-xs text-[#ff8a6d] hover:text-white">See activity →</a>
        </div>
      )}

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
        <Kpi label="New leads · 7 days" value={k.leads7} chart={<Sparkline values={d.spark} />} foot={<Delta now={k.leads7} prev={k.leadsPrev7} />} href="/dashboard/leads?range=7" />
        <Kpi label={d.agenda ? 'Calls coming up' : 'Calls booked'} value={k.calls} foot={<span className="text-xs text-white/40">{d.agenda ? 'from Cal.com' : 'deals in Audit booked'}</span>} href="/dashboard/calls" />
        <Kpi label={`Won in ${month}`} value={compactGbp(k.wonMonth)} foot={<span className="text-xs text-white/40">{d.goal.pct}% of {compactGbp(d.goal.target)} goal</span>} href="/dashboard/money" />
        <Kpi label="Open pipeline" value={compactGbp(k.openValue)} foot={<span className="text-xs text-white/40">{k.openCount} open deal{k.openCount === 1 ? '' : 's'}</span>} href="/dashboard/pipeline" />
      </div>

      <div className="grid lg:grid-cols-3 gap-3 md:gap-4">
        <Card title="Your queue" className="lg:col-span-2" action={d.actions.length ? <Badge tone="accent">{d.actions.length}</Badge> : undefined} pad={false}>
          {d.actions.length ? (
            <ul className="divide-y divide-white/[0.05]">
              {d.actions.map((a, i) => {
                const s = ACTION_STYLE[a.kind];
                const inner = (
                  <>
                    <span className="w-[86px] shrink-0"><Badge tone={s.tone}>{s.label}</Badge></span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm text-white/90">{a.title}</span>
                      {a.sub && <span className="block text-xs text-white/40 mt-0.5">{/^\d{4}-/.test(a.sub) ? `${when(a.sub)} · ${untilOrAgo(a.sub)}` : a.sub}</span>}
                    </span>
                    {a.href && <span className="text-white/25 group-hover:text-white/70 text-lg" aria-hidden>›</span>}
                  </>
                );
                return (
                  <li key={i}>
                    {a.href
                      ? <a href={a.href} {...(a.href.startsWith('http') ? linkProps : {})} className="group flex items-center gap-3 px-5 py-3.5 hover:bg-white/[0.025]">{inner}</a>
                      : <div className="flex items-center gap-3 px-5 py-3.5">{inner}</div>}
                  </li>
                );
              })}
            </ul>
          ) : <Empty>Inbox zero. Calls, replies to send, quiet deals and anything broken show up here.</Empty>}
        </Card>

        <div className="flex flex-col gap-3 md:gap-4 min-w-0">
          <Card title={`${month} goal`}>
            <div className="flex items-center gap-5">
              <Ring pct={d.goal.pct} size={96} label={<p className="text-lg font-semibold tabular-nums" style={{ fontFamily: 'var(--font-display)' }}>{d.goal.pct}%</p>} />
              <div className="text-[13px] flex flex-col gap-1.5">
                <p><span className="text-white/40">Won </span>{gbp(d.goal.wonMonth)}</p>
                <p><span className="text-white/40">Target </span>{gbp(d.goal.target)}</p>
                <p><span className="text-white/40">To go </span>{gbp(Math.max(0, d.goal.target - d.goal.wonMonth))}</p>
              </div>
            </div>
          </Card>
          <a href="/dashboard/system" className="block rounded-2xl border border-white/[0.07] bg-[#121212] p-5 hover:border-white/15 transition-colors">
            <div className="flex items-center gap-3">
              <span className={`size-2.5 rounded-full ${bad ? 'bg-rose-400 shadow-[0_0_10px] shadow-rose-400/60' : 'bg-emerald-400 shadow-[0_0_10px] shadow-emerald-400/60'}`} />
              <div className="text-sm">
                <p className="font-medium">{bad ? `${bad} system problem${bad > 1 ? 's' : ''}` : 'All systems working'}</p>
                <p className="text-xs text-white/40">{d.health.ok}/{d.health.total} checks passing</p>
              </div>
              <span className="ml-auto text-white/25 text-lg" aria-hidden>›</span>
            </div>
          </a>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-3 md:gap-4">
        <div className="lg:col-span-2 flex flex-col gap-3 min-w-0">
          <SectionTitle action={<a href="/dashboard/automations" className="text-xs text-white/40 hover:text-white">All activity →</a>}>Live activity</SectionTitle>
          <Card><Feed events={d.feed} /></Card>
        </div>
        <div className="flex flex-col gap-3 min-w-0">
          <SectionTitle action={<a href="/dashboard/calls" className="text-xs text-white/40 hover:text-white">Calls →</a>}>Coming up</SectionTitle>
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
            ) : <Empty>{d.agenda ? 'No calls booked.' : 'Connect Cal.com on the Calls tab to see call times here.'}</Empty>}
          </Card>
        </div>
      </div>
    </>
  );
}
