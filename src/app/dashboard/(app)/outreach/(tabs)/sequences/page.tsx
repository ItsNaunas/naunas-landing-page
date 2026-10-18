import { outreachData } from '@/lib/ops/more';
import { STEP_DAYS, STEP_LABEL } from '@/lib/outreach';
import { TabIntro, Errors, Badge, Card, Kpi, Empty, ago, linkProps } from '@/components/dashboard/ui';
import { SectionTitle, ConnectCard, Meter, when, untilOrAgo, SectionError, errFor } from '@/components/dashboard/kit';
import { Funnel } from '@/components/dashboard/charts';
import { setProspect, markDmSent, setOutreachSending, refreshProspectSearches, bumpRepCount, markWarmed } from '@/app/dashboard/actions';
import { SearchForm, DraftEditor, CopyText } from '@/app/dashboard/(app)/outreach/OutreachClient';

export const dynamic = 'force-dynamic';

const FIT_TONE = (f: number) => (f >= 6 ? 'good' : f >= 4 ? 'accent' : 'muted') as 'good' | 'accent' | 'muted';

export default async function OutreachSequences() {
  const d = await outreachData();
  const q = d.queue;
  const inFlight = [...q.scheduled, ...q.active];
  const goodOnes = q.review.filter((p) => p.fit >= 5).map((p) => p.id);

  return (
    <>
      <TabIntro sub="Firms getting the E1 to E4 emails. A reply stops a sequence on its own." />
      {/* In flight */}
      <SectionTitle>Sequences in flight · {inFlight.length}</SectionTitle>
      <Card pad={false}>
        {inFlight.length ? (
          <div className="overflow-x-auto"><table className="w-full text-[13px] min-w-[560px]">
            <tbody>
              {inFlight.map((p) => {
                const step = p.sent?.length ?? 0;
                const due = p.startedAt && step < 4 ? new Date(Date.parse(p.startedAt) + STEP_DAYS[step] * 86_400_000).toISOString() : null;
                return (
                  <tr key={p.id} className="border-t border-white/[0.04] first:border-t-0">
                    <td className="px-5 py-3"><p className="font-medium">{p.firm}</p><p className="text-xs text-white/40">{p.email}</p></td>
                    <td className="px-3 py-3"><div className="flex gap-1" aria-label={`${step} of 4 sent`}>{[0, 1, 2, 3].map((i) => <span key={i} className={`h-1.5 w-6 rounded-full ${i < step ? 'bg-[#F2613F]' : 'bg-white/10'}`} />)}</div></td>
                    <td className="px-3 py-3 text-xs text-white/55">{p.status === 'scheduled' ? 'E1 in the next daily send' : due ? `${STEP_LABEL[step].split(' · ')[0]} ${untilOrAgo(due)}` : ''}</td>
                    <td className="px-5 py-3 text-right">
                      <form action={setProspect}><input type="hidden" name="ids" value={p.id} /><input type="hidden" name="status" value="stopped" /><button className="text-xs text-white/40 hover:text-rose-300">Stop</button></form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table></div>
        ) : <Empty>No sequences running. Approve and schedule drafts above.</Empty>}
      </Card>
      {q.replied.length > 0 && <p className="text-xs text-white/40 -mt-2">{q.replied.length} replied (sequence stopped): {q.replied.map((p) => p.firm).join(', ')}. Last reply {when(q.replied[0].repliedAt ?? '')}.</p>}
      <p className="text-xs text-white/30">The 5 wave-1 firms that were mid-sequence before this page existed are finished by the vault engine and show up here as replies or under Leads → Cold email.</p>
    </>
  );
}
