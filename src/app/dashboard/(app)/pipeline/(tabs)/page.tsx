import { pipelineData } from '@/lib/ops/tabs';
import { SOURCE_LABEL, LOST_LABEL } from '@/lib/ops/common';
import { hubspotUrl } from '@/lib/hubspot';
import { TabIntro, Errors, Badge, Card, Kpi, Empty, gbp, compactGbp, linkProps } from '@/components/dashboard/ui';
import { SectionTitle, SectionError, RangeChips, errFor } from '@/components/dashboard/kit';
import { Funnel, HBars } from '@/components/dashboard/charts';

export const dynamic = 'force-dynamic';

function Idle({ days }: { days: number }) {
  if (days >= 14) return <Badge tone="bad">{days}d quiet</Badge>;
  if (days >= 7) return <Badge tone="accent">{days}d quiet</Badge>;
  return <span className="text-[11px] text-white/35">{days ? `${days}d ago` : 'today'}</span>;
}

const RANGES = [['30', '30 days'], ['90', '90 days'], ['180', '6 months'], ['365', '12 months']] as const;

export default async function Pipeline({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const range = (await searchParams).range ?? '90';
  const days = Number(range) || 90;
  const d = await pipelineData(days);
  const span = RANGES.find(([v]) => v === range)?.[1] ?? `${days} days`;

  return (
    <>
      <TabIntro sub="Every open deal, how long it’s been quiet, and how deals convert."
        action={<a href={hubspotUrl.contacts().replace('/objects/0-1/', '/objects/0-3/')} {...linkProps} className="text-sm rounded-full border border-white/10 px-4 py-2 text-white/70 hover:text-white hover:border-white/25">Open in HubSpot ↗</a>}
      />
      <Errors errors={d.errors} />
      <RangeChips path="/dashboard/pipeline" param="range" value={range} options={RANGES} />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
        <Kpi label="Open deals" value={d.totals.open} foot={<span className="text-xs text-white/40">{compactGbp(d.totals.value)} in play</span>} />
        <Kpi label="Gone quiet (7d+)" value={d.totals.stale} foot={<span className="text-xs text-white/40">need a nudge</span>} />
        <Kpi label={`Win rate · ${span}`} value={d.winRate === null ? '—' : `${d.winRate}%`} foot={<span className="text-xs text-white/40">won ÷ (won + lost)</span>} />
        <Kpi label={`Won · ${span}`} value={compactGbp(d.wonValue)} />
      </div>

      <SectionTitle>Board · open now</SectionTitle>
      <SectionError errors={errFor(d.errors, 'Open deals')} />
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 snap-x">
        {d.stages.map((st) => (
          <div key={st.id} className="snap-start shrink-0 w-[78vw] sm:w-[260px] md:flex-1 md:w-auto md:min-w-[200px] rounded-2xl bg-[#101010] border border-white/[0.06] flex flex-col">
            <div className="px-4 pt-4 pb-3 flex items-center justify-between gap-2 border-b border-white/[0.05]">
              <p className="text-[13px] font-medium">{st.label} <span className="text-white/35 tabular-nums ml-1">{st.deals.length}</span></p>
              {st.value > 0 && <span className="text-xs text-white/40 tabular-nums">{compactGbp(st.value)}</span>}
            </div>
            <div className="p-2.5 flex flex-col gap-2 min-h-[140px]">
              {st.deals.length ? st.deals.map((dl) => (
                <a key={dl.id} href={hubspotUrl.deal(dl.id)} {...linkProps}
                  className={`group rounded-xl bg-[#161616] border p-3 flex flex-col gap-2 hover:border-[#F2613F]/50 transition-colors ${dl.idle >= 14 ? 'border-rose-400/25' : 'border-white/[0.06]'}`}>
                  <p className="text-[13px] font-medium leading-snug">{dl.name}</p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {dl.amount > 0 && <Badge tone="good">{gbp(dl.amount)}</Badge>}
                    {dl.priority === 'high' && <Badge tone="accent">High value</Badge>}
                    {dl.source && <Badge tone="muted">{SOURCE_LABEL[dl.source] ?? dl.source}</Badge>}
                  </div>
                  <Idle days={dl.idle} />
                </a>
              )) : <p className="text-xs text-white/25 text-center py-8">Empty</p>}
            </div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">
        <Card title={`Conversion · deals created in the last ${span}`}>
          <SectionError errors={errFor(d.errors, 'New deals')} />
          <Funnel steps={d.conversion} />
          <p className="text-[11px] text-white/30 mt-4">How far deals got, step by step. The % is versus the step before.</p>
        </Card>
        <Card title={`Win rate by source · ${span}`} pad={false}>
          <div className="px-5"><SectionError errors={errFor(d.errors, 'Closed deals')} /></div>
          {d.bySource.length ? (
            <table className="w-full text-[13px]">
              <thead><tr className="text-left text-xs text-white/35"><th className="font-normal px-5 py-2">Source</th><th className="font-normal px-3 py-2 text-right">Closed</th><th className="font-normal px-3 py-2 text-right">Won</th><th className="font-normal px-5 py-2 text-right">£</th></tr></thead>
              <tbody>
                {d.bySource.map((s) => (
                  <tr key={s.source} className="border-t border-white/[0.04]">
                    <td className="px-5 py-2.5">{SOURCE_LABEL[s.source] ?? s.source}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-white/60">{s.closed}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{s.won} <span className="text-white/35 text-xs">{Math.round((s.won / s.closed) * 100)}%</span></td>
                    <td className="px-5 py-2.5 text-right tabular-nums">{compactGbp(s.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <Empty>No deals closed in this period.</Empty>}
        </Card>
        <Card title={`Why deals were lost · ${span}`} className="md:col-span-2 xl:col-span-1">
          {d.lostWhy.length ? <HBars rows={d.lostWhy.map(([k, n]): [string, number] => [LOST_LABEL[k] ?? k, n])} /> : <Empty>Nothing lost in this period. Set “Lost reason” in HubSpot when you close one lost.</Empty>}
        </Card>
      </div>
    </>
  );
}
