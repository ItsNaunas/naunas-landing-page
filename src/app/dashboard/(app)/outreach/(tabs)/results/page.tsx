import { outreachData } from '@/lib/ops/more';
import { ActionForm } from '@/components/dashboard/ActionForm';
import { CHANNEL_LABEL, getProspects, type Prospect, type OutreachChannel } from '@/lib/outreach';
import { demoOn } from '@/lib/ops/demo';
import { TabIntro, Card, Empty } from '@/components/dashboard/ui';
import { SectionTitle } from '@/components/dashboard/kit';
import { Funnel } from '@/components/dashboard/charts';
import { bumpRepCount } from '@/app/dashboard/actions';

export const dynamic = 'force-dynamic';

/** Reply rates mean little under this many sends. */
const MIN_SENDS = 10;

export default async function OutreachResults() {
  const d = await outreachData();
  // One source for every number on this page: the firms themselves (won/lost synced back from HubSpot deals).
  const firms: Prospect[] = demoOn() ? (Object.values(d.queue).flat() as Prospect[]) : await getProspects().catch(() => [] as Prospect[]);
  const started = firms.filter((p) => p.scheduledAt || p.startedAt || p.warmedAt || p.liEngagedAt);
  const replied = (p: Prospect) => !!(p.igRepliedAt || p.repliedAt || p.bookedAt);
  const byChannel = (['instagram', 'linkedin', 'email'] as OutreachChannel[]).map((c) => {
    const f = started.filter((p) => p.channel === c);
    return { c, started: f.length, replied: f.filter(replied).length, booked: f.filter((p) => p.bookedAt).length, won: f.filter((p) => p.wonAt).length, lost: f.filter((p) => p.lostAt).length };
  });
  const lostReasons = Object.entries(firms.filter((p) => p.lostAt).reduce<Record<string, number>>((acc, p) => { const k = p.lostReason ?? 'No reason given'; acc[k] = (acc[k] ?? 0) + 1; return acc; }, {})).sort((a, b) => b[1] - a[1]);

  return (
    <>
      <TabIntro sub="How cold outreach converts, across every channel: started → replied → booked → won. Won and Lost come from the HubSpot deal." />
      <div className="grid lg:grid-cols-[1fr_1.4fr] gap-3 md:gap-4 items-start">
        <div className="flex flex-col gap-3 min-w-0">
          <SectionTitle>All channels</SectionTitle>
          <Card>
            <Funnel steps={[
              { label: 'Started', value: started.length },
              { label: 'Replied', value: started.filter(replied).length },
              { label: 'Booked a call', value: started.filter((p) => p.bookedAt).length },
              { label: 'Won', value: started.filter((p) => p.wonAt).length },
            ]} />
          </Card>
        </div>
        <div className="flex flex-col gap-3 min-w-0">
          <SectionTitle>By channel</SectionTitle>
          <Card pad={false}>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px] tabular-nums">
                <thead><tr className="text-left text-[11px] text-white/60"><th className="px-5 py-2.5 font-normal">Channel</th><th className="px-3 font-normal">Started</th><th className="px-3 font-normal">Replied</th><th className="px-3 font-normal">Booked</th><th className="px-3 font-normal">Won</th><th className="px-3 font-normal">Lost</th></tr></thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {byChannel.map((r) => (
                    <tr key={r.c}><td className="px-5 py-2.5">{CHANNEL_LABEL[r.c]}</td><td className="px-3">{r.started}</td>
                      <td className="px-3">{r.replied}{r.started >= MIN_SENDS ? <span className="text-white/55"> · {Math.round((r.replied / r.started) * 100)}%</span> : ''}</td>
                      <td className="px-3">{r.booked}</td><td className="px-3 text-emerald-300">{r.won}</td><td className="px-3 text-white/65">{r.lost}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="px-5 py-3 text-xs text-white/60 border-t border-white/[0.06]">{lostReasons.length ? `Lost because: ${lostReasons.map(([k, n]) => `${k} (${n})`).join(' · ')}` : `Reply rates show once a channel has ${MIN_SENDS} firms started.`}</p>
          </Card>
        </div>
      </div>

      <SectionTitle>Instagram opener test</SectionTitle>
      <Card pad={false}>
        {d.ig.styles.length ? (
          <>
            <table className="w-full text-[13px]">
              <thead><tr className="text-left text-[11px] text-white/60"><th className="font-normal px-5 py-2.5">Opener style</th><th className="font-normal px-3 py-2.5 text-right">Sent</th><th className="font-normal px-3 py-2.5 text-right">Replied</th><th className="font-normal px-5 py-2.5 text-right">Reply rate</th></tr></thead>
              <tbody>
                {d.ig.styles.map((r) => (
                  <tr key={r.style} className="border-t border-white/[0.05]">
                    <td className="px-5 py-2.5">{r.style}{r.sent >= 40 ? <span className="ml-2 text-[11px] text-white/60">enough to judge</span> : null}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{r.sent}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{r.replied}</td>
                    <td className={`px-5 py-2.5 text-right tabular-nums font-medium ${r.sent >= MIN_SENDS && r.rate >= 8 ? 'text-emerald-300' : ''}`}>{r.sent >= MIN_SENDS ? `${r.rate}%` : <span className="text-white/55">too early</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="px-5 py-3 text-xs text-white/60 border-t border-white/[0.06]">About 40 firms per style before dropping the weakest. Under 3 replies from 120 means change the opener, not the volume.</p>
          </>
        ) : <Empty>Once openers go out, each style’s reply rate shows here. About 40 firms per style before you drop the weakest; under 3 replies from 120 means change the opener, not the volume.</Empty>}
      </Card>

      <SectionTitle action={<span className="text-xs text-white/60">Emails, DMs and posts count themselves</span>}>Daily reps and the last 7 days</SectionTitle>
      <div className="grid lg:grid-cols-[1fr_300px] gap-3 md:gap-4">
        <Card pad={false}>
          <ul className="divide-y divide-white/[0.05]">
            {([
              ['Posts', d.reps2.today.auto.posts, d.reps2.targets.posts, 'Published from Content'],
            ] as const).map(([label, done, target, hint]) => (
              <li key={label} className="px-5 py-3 flex items-center gap-3">
                <span className={`size-5 rounded-full grid place-items-center text-[11px] shrink-0 ${done >= target ? 'bg-emerald-500/90 text-white' : 'bg-white/[0.08] text-white/60'}`}>{done >= target ? '✓' : ''}</span>
                <span className="flex-1 min-w-0"><span className="block text-sm">{label}</span><span className="block text-[11px] text-white/60">{hint} · counts itself</span></span>
                <span className="tabular-nums text-sm w-14 text-right">{done}<span className="text-white/55">/{target}</span></span>
                <span className="w-[68px]" />
              </li>
            ))}
            {d.reps2.today.manual.filter((r) => r.key === 'list' || r.key === 'zanzibar').map((r) => (
              <li key={r.key} className="px-5 py-3 flex items-center gap-3">
                <span className={`size-5 rounded-full grid place-items-center text-[11px] shrink-0 ${r.done >= r.target ? 'bg-emerald-500/90 text-white' : 'bg-white/[0.08] text-white/60'}`}>{r.done >= r.target ? '✓' : ''}</span>
                <span className="flex-1 min-w-0"><span className="block text-sm">{r.label}</span><span className="block text-[11px] text-white/60">{r.hint}</span></span>
                <span className="tabular-nums text-sm w-14 text-right">{r.done}<span className="text-white/55">/{r.target}</span></span>
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
                    <span className="text-[11px] text-white/55">{new Date(w.day + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'narrow' })}</span>
                  </div>
                );
              })}
            </div>
            <p className="text-sm mt-3"><b className="tabular-nums">{d.reps2.weekTouches}</b> <span className="text-white/65">touches →</span> <b className="tabular-nums">{d.reps2.weekReplies}</b> <span className="text-white/65">replies this week</span></p>
            <p className="text-[11px] text-white/55 mt-1">Touches = emails, DMs, warm-ups, follow-ups and LinkedIn connects.</p>
          </Card>
        </div>
      </div>
    </>
  );
}
