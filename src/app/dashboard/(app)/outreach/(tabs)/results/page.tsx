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
    </>
  );
}
