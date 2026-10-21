import { outreachData } from '@/lib/ops/more';
import { ActionForm } from '@/components/dashboard/ActionForm';
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
      {/* Today's reps: the daily checklist (vault daily brief) with the tally kept for you */}
      <SectionTitle action={<span className="text-xs text-white/45">Channel outreach counts itself at the top</span>}>Daily reps and the last 7 days</SectionTitle>
      <div className="grid lg:grid-cols-[1fr_300px] gap-3 md:gap-4">
        <Card pad={false}>
          <ul className="divide-y divide-white/[0.05]">
            {([
              ['Posts', d.reps2.today.auto.posts, d.reps2.targets.posts, 'Published from Content'],
            ] as const).map(([label, done, target, hint]) => (
              <li key={label} className="px-5 py-3 flex items-center gap-3">
                <span className={`size-5 rounded-full grid place-items-center text-[11px] shrink-0 ${done >= target ? 'bg-emerald-500/90 text-white' : 'bg-white/[0.08] text-white/40'}`}>{done >= target ? '✓' : ''}</span>
                <span className="flex-1 min-w-0"><span className="block text-[13.5px]">{label}</span><span className="block text-[11px] text-white/40">{hint} · counts itself</span></span>
                <span className="tabular-nums text-sm w-14 text-right">{done}<span className="text-white/35">/{target}</span></span>
                <span className="w-[68px]" />
              </li>
            ))}
            {d.reps2.today.manual.filter((r) => r.key === 'list' || r.key === 'zanzibar').map((r) => (
              <li key={r.key} className="px-5 py-3 flex items-center gap-3">
                <span className={`size-5 rounded-full grid place-items-center text-[11px] shrink-0 ${r.done >= r.target ? 'bg-emerald-500/90 text-white' : 'bg-white/[0.08] text-white/40'}`}>{r.done >= r.target ? '✓' : ''}</span>
                <span className="flex-1 min-w-0"><span className="block text-[13.5px]">{r.label}</span><span className="block text-[11px] text-white/40">{r.hint}</span></span>
                <span className="tabular-nums text-sm w-14 text-right">{r.done}<span className="text-white/35">/{r.target}</span></span>
                <span className="flex gap-1 w-[68px] justify-end">
                  <ActionForm action={bumpRepCount}><input type="hidden" name="key" value={r.key} /><input type="hidden" name="delta" value="-1" /><button aria-label={`One less ${r.label}`} className="size-7 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-white/60">−</button></ActionForm>
                  <ActionForm action={bumpRepCount}><input type="hidden" name="key" value={r.key} /><input type="hidden" name="delta" value="1" /><button aria-label={`One more ${r.label}`} className="size-7 rounded-lg bg-white text-black font-medium">+</button></ActionForm>
                </span>
              </li>
            ))}
          </ul>
        </Card>
        <div className="flex flex-col gap-3 min-w-0">
          <Card title="Last 7 days">
            <div className="flex items-end gap-1.5 h-20">
              {d.reps2.week.map((w) => {
                const max = Math.max(1, ...d.reps2.week.map((x) => x.touches));
                return (
                  <div key={w.day} className="flex-1 flex flex-col items-center gap-1 h-full justify-end" title={`${w.day}: ${w.touches} touches`}>
                    <div className={`w-full rounded-t ${w.day === d.reps2.today.day ? 'bg-[#F2613F]' : 'bg-white/20'}`} style={{ height: `${Math.max(4, (w.touches / max) * 100)}%` }} />
                    <span className="text-[10px] text-white/35">{new Date(w.day + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'narrow' })}</span>
                  </div>
                );
              })}
            </div>
            <p className="text-sm mt-3"><b className="tabular-nums">{d.reps2.weekTouches}</b> <span className="text-white/50">touches →</span> <b className="tabular-nums">{d.reps2.weekReplies}</b> <span className="text-white/50">replies this week</span></p>
            <p className="text-[11px] text-white/35 mt-1">Touches = emails, DMs, warm-ups, follow-ups and LinkedIn connects. This replaces the day-close tally line.</p>
          </Card>
        </div>
      </div>

    </>
  );
}
