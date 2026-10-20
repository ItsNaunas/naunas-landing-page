import { outreachData } from '@/lib/ops/more';
import { STEP_DAYS, STEP_LABEL } from '@/lib/outreach';
import { TabIntro, Errors, Badge, Card, Kpi, Empty, ago, linkProps } from '@/components/dashboard/ui';
import { SectionTitle, ConnectCard, Meter, when, untilOrAgo, SectionError, errFor } from '@/components/dashboard/kit';
import { Funnel } from '@/components/dashboard/charts';
import { setProspect, markDmSent, setOutreachSending, refreshProspectSearches, bumpRepCount, markWarmed } from '@/app/dashboard/actions';
import { SearchForm, DraftEditor, CopyText } from '@/app/dashboard/(app)/outreach/OutreachClient';

export const dynamic = 'force-dynamic';

const FIT_TONE = (f: number) => (f >= 6 ? 'good' : f >= 4 ? 'accent' : 'muted') as 'good' | 'accent' | 'muted';

export default async function OutreachResults() {
  const d = await outreachData();
  const q = d.queue;
  const inFlight = [...q.scheduled, ...q.active];
  const goodOnes = q.review.filter((p) => p.fit >= 5).map((p) => p.id);

  return (
    <>
      <TabIntro sub="How all outreach converts, from first email to a deal." />
      <div className="flex flex-col gap-3 max-w-2xl">
        <div className="flex flex-col gap-3 min-w-0">
          <SectionTitle>Results · all outreach</SectionTitle>
          <Card>
            <Funnel steps={[
              { label: 'Emailed', value: d.stats.emailed },
              { label: 'Replied', value: d.stats.replied },
              { label: 'Interested', value: d.stats.positive },
              { label: 'Has a deal', value: d.stats.withDeal },
            ]} />
          </Card>
        </div>
      </div>
      <SectionTitle>Instagram opener test</SectionTitle>
      <Card pad={false}>
        {d.ig.styles.length ? (
          <table className="w-full text-[13px]">
            <thead><tr className="text-left text-[11px] text-white/40"><th className="font-normal px-5 py-2.5">Opener style</th><th className="font-normal px-3 py-2.5 text-right">Sent</th><th className="font-normal px-3 py-2.5 text-right">Replied</th><th className="font-normal px-5 py-2.5 text-right">Reply rate</th></tr></thead>
            <tbody>
              {d.ig.styles.map((r, i) => (
                <tr key={r.style} className="border-t border-white/[0.05]">
                  <td className="px-5 py-2.5">{r.style}{i === 0 && d.ig.styles.length > 1 && r.sent >= 40 ? <span className="ml-2 text-[11px] text-white/40">enough to judge</span> : null}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{r.sent}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{r.replied}</td>
                  <td className={`px-5 py-2.5 text-right tabular-nums font-medium ${r.rate >= 8 ? 'text-emerald-300' : ''}`}>{r.rate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <Empty>Once openers go out, each style’s reply rate shows here. About 40 firms per style before you drop the weakest; under 3 replies from 120 means change the opener, not the volume.</Empty>}
      </Card>
    </>
  );
}
