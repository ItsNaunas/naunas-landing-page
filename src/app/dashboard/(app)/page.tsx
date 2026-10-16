import { overviewData, SOURCE_LABEL, LOST_LABEL } from '@/lib/dashboard';
import { hubspotUrl } from '@/lib/hubspot';
import { FUNNEL } from '@/config/funnel';
import { Card, Kpi, Delta, Badge, PageHeader, Empty, Errors, gbp, compactGbp, ago, linkProps } from '@/components/dashboard/ui';
import { Sparkline, BarSeries, Funnel, Ring, HBars } from '@/components/dashboard/charts';

export const dynamic = 'force-dynamic';

export default async function Overview() {
  const d = await overviewData();
  const k = d.kpis;
  const goalPct = Math.round((d.goal.wonMonth / d.goal.target) * 100);
  const month = new Date().toLocaleDateString('en-GB', { month: 'long' });
  const needs: { t: string; tag: string; href?: string }[] = [
    ...(d.lastRun?.needsYou ?? []).map((t) => ({ t, tag: 'Routine' })),
    ...d.booked.map((b) => ({ t: `Prep for your call with ${b.name}`, tag: 'Call', href: hubspotUrl.deal(b.id) })),
    ...(d.goal.coverage !== null && d.goal.coverage < d.goal.coverageTarget
      ? [{ t: `Pipeline covers ${d.goal.coverage.toFixed(1)}× the gap to ${gbp(d.goal.target)}: get more deals in play`, tag: 'Goal' }] : []),
  ];

  return (
    <>
      <PageHeader
        title="Overview"
        sub={`Live from HubSpot · ${new Date().toLocaleString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: FUNNEL.ownerTz })}`}
      />
      <Errors errors={d.errors} />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
        <Kpi label="New leads · 7 days" value={k.leads7} chart={<Sparkline values={d.series.slice(-14).map((s) => s.count)} />} foot={<Delta now={k.leads7} prev={k.leadsPrev7} />} />
        <Kpi label="Calls booked" value={k.booked} foot={<span className="text-xs text-white/40">Audit booked, not yet held</span>} href="/dashboard/pipeline" />
        <Kpi label={`Won in ${month}`} value={compactGbp(k.wonMonth)} foot={<span className="text-xs text-white/40">{k.wonMonthCount} deal{k.wonMonthCount === 1 ? '' : 's'} · {goalPct}% of goal</span>} />
        <Kpi label="Open pipeline" value={compactGbp(k.openValue)} foot={<span className="text-xs text-white/40">{k.openCount} open deal{k.openCount === 1 ? '' : 's'}</span>} href="/dashboard/pipeline" />
      </div>

      <div className="grid lg:grid-cols-3 gap-3 md:gap-4">
        <Card title="Leads per day · last 30 days" className="lg:col-span-2" action={<span className="text-xs text-white/35 tabular-nums">{d.funnel[0].value} total</span>}>
          <BarSeries data={d.series} />
        </Card>
        <Card title={`${month} goal`}>
          <div className="flex items-center gap-5 flex-1">
            <Ring pct={goalPct} label={<div><p className="text-xl font-semibold tabular-nums" style={{ fontFamily: 'var(--font-display)' }}>{goalPct}%</p><p className="text-[10px] text-white/40">of {compactGbp(d.goal.target)}</p></div>} />
            <dl className="flex flex-col gap-2.5 text-[13px] min-w-0">
              <div><dt className="text-white/40 text-xs">Won</dt><dd className="tabular-nums">{gbp(d.goal.wonMonth)}</dd></div>
              <div><dt className="text-white/40 text-xs">Still to close</dt><dd className="tabular-nums">{d.goal.gap ? gbp(d.goal.gap) : 'Target hit 🎉'}</dd></div>
              <div>
                <dt className="text-white/40 text-xs">Pipeline coverage</dt>
                <dd className="tabular-nums">
                  {d.goal.coverage === null ? '—' : `${d.goal.coverage.toFixed(1)}×`}{' '}
                  {d.goal.coverage !== null && <Badge tone={d.goal.coverage >= d.goal.coverageTarget ? 'good' : 'bad'}>aim {d.goal.coverageTarget}×</Badge>}
                </dd>
              </div>
            </dl>
          </div>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">
        <Card title="Funnel · now">
          <Funnel steps={d.funnel} />
          <p className="text-[11px] text-white/30 mt-4">Leads and wins over 30 days; middle stages are where deals sit right now.</p>
        </Card>
        <Card title="Where leads come from · 30 days">
          {d.bySource.length ? <HBars rows={d.bySource.map(([s, n]): [string, number] => [SOURCE_LABEL[s] ?? s, n])} /> : <Empty>No leads in the last 30 days yet.</Empty>}
          {d.lostWhy.length > 0 && (
            <div className="mt-5 pt-4 border-t border-white/[0.06]">
              <p className="text-xs text-white/40 mb-2.5">Why deals were lost</p>
              <HBars rows={d.lostWhy.map(([s, n]): [string, number] => [LOST_LABEL[s] ?? s, n])} />
            </div>
          )}
        </Card>
        <Card title="Needs you" action={needs.length ? <Badge tone="accent">{needs.length}</Badge> : undefined} className="md:col-span-2 xl:col-span-1">
          {needs.length ? (
            <ul className="flex flex-col divide-y divide-white/[0.05] -my-2">
              {needs.slice(0, 7).map((n, i) => (
                <li key={i} className="py-2.5 flex items-start gap-3 text-[13px]">
                  <Badge tone={n.tag === 'Call' ? 'accent' : 'neutral'}>{n.tag}</Badge>
                  {n.href ? <a href={n.href} {...linkProps} className="text-white/80 hover:text-white">{n.t} ↗</a> : <span className="text-white/80">{n.t}</span>}
                </li>
              ))}
            </ul>
          ) : <Empty>All clear. Nothing waiting on you.</Empty>}
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-3 md:gap-4">
        <Card title="Latest leads" className="lg:col-span-2" pad={false}
          action={<a href={hubspotUrl.contacts()} {...linkProps} className="text-xs text-white/40 hover:text-white">All contacts ↗</a>}>
          {d.recent.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead><tr className="text-left text-xs text-white/35"><th className="font-normal px-5 py-2">Name</th><th className="font-normal px-3 py-2">Source</th><th className="font-normal px-5 py-2 text-right">When</th></tr></thead>
                <tbody>
                  {d.recent.map((r) => (
                    <tr key={r.id} className="border-t border-white/[0.05] hover:bg-white/[0.02]">
                      <td className="px-5 py-2.5"><a href={hubspotUrl.contact(r.id)} {...linkProps} className="hover:text-[#F2613F]">{r.name}</a></td>
                      <td className="px-3 py-2.5"><Badge>{SOURCE_LABEL[r.source] ?? r.source}</Badge></td>
                      <td className="px-5 py-2.5 text-right text-white/45 tabular-nums whitespace-nowrap">{ago(r.at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <Empty>No leads yet. They appear here the moment someone signs up, books or DMs.</Empty>}
        </Card>
        <Card title="Routine · last run" action={<a href="/dashboard/routine" className="text-xs text-white/40 hover:text-white">History →</a>}>
          {d.lastRun ? (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-white/60">{ago(d.lastRun.runAt)}</p>
              <div className="grid grid-cols-3 gap-3">
                {(['replies', 'calls', 'proposals', 'retention', 'content'] as const).map((key) => (
                  <div key={key}>
                    <p className="text-xl font-semibold tabular-nums" style={{ fontFamily: 'var(--font-display)' }}>{d.lastRun!.counts[key] ?? 0}</p>
                    <p className="text-[11px] text-white/40 capitalize">{key}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : <Empty>No runs logged yet. The operator runs daily at 13:00 Zanzibar.</Empty>}
        </Card>
      </div>
    </>
  );
}
