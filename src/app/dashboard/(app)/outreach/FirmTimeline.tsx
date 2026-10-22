import type { Prospect } from '@/lib/outreach';

const DAY = 86_400_000;
const short = (t: number) => new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
/** Instagram + LinkedIn steps for one firm: done (✓ date), due (date), or not applicable. */
export function Timeline({ p }: { p: Prospect }) {
  if (p.channel === 'email') return <span className="text-[11px] text-white/60">Email only: E1 to E4</span>;
  if (!p.instagram && !p.drafts?.research?.ownerLinkedin) return <span className="text-[11px] text-white/55">No Instagram or LinkedIn: email only</span>;
  const dm = p.dmSentAt ? Date.parse(p.dmSentAt) : null;
  const steps: { label: string; done?: string; due?: number }[] = [
    ...(p.instagram && p.channel !== 'linkedin' ? [
      { label: 'Warm-up', done: p.warmedAt },
      { label: 'Opener', done: p.dmSentAt, due: p.warmedAt ? Date.parse(p.warmedAt) + DAY : undefined },
      { label: 'Day 5', done: p.fu1At, due: dm ? dm + 3 * DAY : undefined },
      { label: 'Day 9', done: p.fu2At, due: dm ? dm + 7 * DAY : undefined },
    ] : []),
    ...(p.drafts?.research?.ownerLinkedin && p.channel !== 'instagram' ? [
      { label: 'LI engage', done: p.liEngagedAt, due: dm ? dm + DAY : undefined },
      { label: 'LI connect', done: p.liAt, due: p.liEngagedAt ? Date.parse(p.liEngagedAt) + DAY : undefined },
      { label: 'LI DM', done: p.liDmAt, due: p.liAt ? Date.parse(p.liAt) + 2 * DAY : undefined },
      { label: 'LI follow-up', done: p.liFuAt, due: p.liDmAt ? Date.parse(p.liDmAt) + 5 * DAY : undefined },
    ] : []),
  ];
  if (p.igRepliedAt) return <span className="text-[11px] text-emerald-300">Replied on Instagram {short(Date.parse(p.igRepliedAt))}</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {steps.map((st) => (
        <span key={st.label} title={st.label} className={`rounded-full px-2 py-0.5 text-[11px] whitespace-nowrap ${st.done ? 'bg-emerald-500/15 text-emerald-300' : st.due && st.due <= Date.now() ? 'bg-[#F2613F]/15 text-[#ff8a6d]' : 'bg-white/[0.05] text-white/60'}`}>
          {st.label} {st.done ? `✓ ${short(Date.parse(st.done))}` : st.due ? short(st.due) : ''}
        </span>
      ))}
    </div>
  );
}

