import { outreachData } from '@/lib/ops/more';
import { ActionForm } from '@/components/dashboard/ActionForm';
import { STEP_DAYS, STEP_LABEL, emailHold, CHANNEL_LABEL } from '@/lib/outreach';
import { Timeline } from '@/app/dashboard/(app)/outreach/FirmTimeline';
import { TabIntro, Card, Empty } from '@/components/dashboard/ui';
import { SectionTitle, when, untilOrAgo } from '@/components/dashboard/kit';
import { setProspect } from '@/app/dashboard/actions';

export const dynamic = 'force-dynamic';

export default async function OutreachSequences() {
  const d = await outreachData();
  const q = d.queue;
  const inFlight = [...q.scheduled, ...q.active];

  return (
    <>
      <TabIntro sub="Every firm being worked, on whichever channel it was started, and what’s due next. A reply stops it; so does Stop." />
      <SectionTitle>In flight · {inFlight.length}</SectionTitle>
      <Card pad={false}>
        {inFlight.length ? (
          <div className="overflow-x-auto"><table className="w-full text-[13px] min-w-[560px]">
            <tbody>
              {inFlight.map((p) => {
                const step = p.sent?.length ?? 0;
                const due = p.startedAt && step < 4 ? new Date(Date.parse(p.startedAt) + STEP_DAYS[step] * 86_400_000).toISOString() : null;
                return (
                  <tr key={p.id} className="border-t border-white/[0.04] first:border-t-0">
                    <td className="px-5 py-3"><p className="font-medium"><a href={`/dashboard/outreach/firm/${encodeURIComponent(p.id)}`} className="hover:text-[#F2613F]">{p.firm}</a>{p.channel && <span className="ml-2 rounded-full bg-white/[0.06] px-2 py-0.5 text-[10.5px] font-normal text-white/55">{CHANNEL_LABEL[p.channel]}</span>}</p><p className="text-xs text-white/40">{p.email ?? (p.instagram ? `@${p.instagram}` : '')}</p><div className="mt-1.5"><Timeline p={p} /></div></td>
                    <td className="px-3 py-3">{(!p.channel || p.channel === 'email') && <div className="flex gap-1" aria-label={`${step} of 4 sent`}>{[0, 1, 2, 3].map((i) => <span key={i} className={`h-1.5 w-6 rounded-full ${i < step ? 'bg-[#F2613F]' : 'bg-white/10'}`} />)}</div>}</td>
                    <td className="px-3 py-3 text-xs text-white/55">{p.channel && p.channel !== 'email' ? `${CHANNEL_LABEL[p.channel]} only` : p.status === 'scheduled' ? (!p.email ? 'Instagram and LinkedIn only (no email)' : emailHold(p) ?? 'E1 in the next daily send') : due ? `${STEP_LABEL[step].split(' · ')[0]} ${untilOrAgo(due)}` : ''}</td>
                    <td className="px-5 py-3 text-right">
                      <ActionForm action={setProspect}><input type="hidden" name="ids" value={p.id} /><input type="hidden" name="status" value="stopped" /><button className="text-xs text-white/40 hover:text-rose-300">Stop</button></ActionForm>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table></div>
        ) : <Empty>Nothing in flight. Start firms from Prospects → Ready to start.</Empty>}
      </Card>
      {q.replied.length > 0 && <p className="text-xs text-white/40 -mt-2">{q.replied.length} replied (sequence stopped): {q.replied.map((p) => p.firm).join(', ')}. Last reply {when(q.replied[0].repliedAt ?? '')}.</p>}
    </>
  );
}
