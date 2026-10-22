import { ActionForm } from '@/components/dashboard/ActionForm';
import { STEP_DAYS, STEP_LABEL, emailHold, CHANNEL_LABEL, type Prospect } from '@/lib/outreach';
import { Timeline } from '@/app/dashboard/(app)/outreach/FirmTimeline';
import { Card, Empty } from '@/components/dashboard/ui';
import { when, untilOrAgo } from '@/components/dashboard/kit';
import { setProspect } from '@/app/dashboard/actions';

const EMAIL_STEPS = ['E1', 'E2', 'E3', 'E4'];

/** Prospects → In outreach (was the Sequences tab): every firm being worked, its steps, what's due next, Stop. */
export function SequencesTable({ inFlight, replied }: { inFlight: Prospect[]; replied: Prospect[] }) {
  return (
    <>
      <Card pad={false}>
        {inFlight.length ? (
          <div className="overflow-x-auto"><table className="w-full text-[13px] min-w-[560px]">
            <tbody>
              {inFlight.map((p) => {
                const step = p.sent?.length ?? 0;
                const due = p.startedAt && step < 4 ? new Date(Date.parse(p.startedAt) + STEP_DAYS[step] * 86_400_000).toISOString() : null;
                return (
                  <tr key={p.id} className="border-t border-white/[0.04] first:border-t-0">
                    <td className="px-5 py-3"><p className="font-medium"><a href={`/dashboard/outreach/firm/${encodeURIComponent(p.id)}`} className="hover:text-[#ff8a6d]">{p.firm}</a>{p.channel && <span className="ml-2 rounded-full bg-white/[0.06] px-2 py-0.5 text-[11px] font-normal text-white/60">{CHANNEL_LABEL[p.channel]}</span>}</p><p className="text-xs text-white/60">{p.email ?? (p.instagram ? `@${p.instagram}` : '')}</p><div className="mt-1.5"><Timeline p={p} /></div></td>
                    <td className="px-3 py-3">{(!p.channel || p.channel === 'email') && (
                      <div className="flex gap-1" aria-label={`${step} of 4 emails sent`}>
                        {EMAIL_STEPS.map((label, i) => <span key={label} className={`rounded px-1.5 py-0.5 text-[11px] tabular-nums ${i < step ? 'bg-emerald-400/15 text-emerald-300' : 'bg-white/[0.06] text-white/55'}`}>{label}{i < step ? ' ✓' : ''}</span>)}
                      </div>
                    )}</td>
                    <td className="px-3 py-3 text-xs text-white/60">{p.channel && p.channel !== 'email' ? `${CHANNEL_LABEL[p.channel]} only` : p.status === 'scheduled' ? (!p.email ? 'Instagram and LinkedIn only (no email)' : emailHold(p) ?? 'E1 in the next daily send') : due ? `${STEP_LABEL[step].split(' · ')[0]} ${untilOrAgo(due)}` : ''}</td>
                    <td className="px-5 py-3 text-right">
                      <ActionForm action={setProspect}><input type="hidden" name="ids" value={p.id} /><input type="hidden" name="status" value="stopped" /><button className="rounded-lg px-2 py-1 text-xs text-white/65 hover:text-rose-300 hover:bg-white/[0.04]">Stop</button></ActionForm>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table></div>
        ) : <Empty>Nothing in outreach yet. Start firms from Ready to start.</Empty>}
      </Card>
      {replied.length > 0 && <p className="text-xs text-white/60 -mt-2">{replied.length} replied (sequence stopped): {replied.map((p) => p.firm).join(', ')}. Last reply {when(replied[0].repliedAt ?? '')}.</p>}
    </>
  );
}
