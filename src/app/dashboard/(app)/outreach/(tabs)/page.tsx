import { outreachData } from '@/lib/ops/more';
import { ActionForm } from '@/components/dashboard/ActionForm';
import { STEP_DAYS, STEP_LABEL } from '@/lib/outreach';
import { TabIntro, Errors, Badge, Card, Kpi, Empty, ago, linkProps } from '@/components/dashboard/ui';
import { SectionTitle, ConnectCard, Meter, when, untilOrAgo, SectionError, errFor } from '@/components/dashboard/kit';
import { Funnel } from '@/components/dashboard/charts';
import { setProspect, markDmSent, setOutreachSending, refreshProspectSearches, bumpRepCount, markWarmed, markIgFollowup, markIgReplied } from '@/app/dashboard/actions';
import { SearchForm, DraftEditor, CopyText } from '@/app/dashboard/(app)/outreach/OutreachClient';

export const dynamic = 'force-dynamic';

const FIT_TONE = (f: number) => (f >= 6 ? 'good' : f >= 4 ? 'accent' : 'muted') as 'good' | 'accent' | 'muted';

import { warmLeads, dueCheckins, getTouches, getCheckinDrafts, type WarmLead } from '@/lib/checkins';
import { repDay } from '@/lib/reps';
import { TodayList } from '../TodayList';
import { ChannelBoard } from '../ChannelBoard';
import { syncIgPosts, getIgPosts } from '@/lib/igPosts';
import { FUNNEL } from '@/config/funnel';
import { getOwed, needsYou, dueAt, nudgeAt } from '@/lib/owed';
import { demoOn } from '@/lib/ops/demo';
import { addOwedAsset, markOwedSent, closeOwed } from '@/app/dashboard/actions';
export default async function OutreachToday() {
  const d = await outreachData();
  const q = d.queue;
  const inFlight = [...q.scheduled, ...q.active];
  const goodOnes = q.review.filter((p) => p.fit >= 5).map((p) => p.id);
  const owedAll = demoOn() ? [{ id: 'o1', who: 'Laurence Grant', what: 'Loom teardown', channel: 'LinkedIn', owedAt: new Date(Date.now() - 18 * 3_600_000).toISOString() }] : await getOwed().catch(() => []);
  const owed = needsYou(owedAll);
  const warmOn = FUNNEL.outreach.warmCheckins;
  // Latest Instagram posts + comment ideas for today's warm-ups (fetched through Apify in the background).
  if (!demoOn()) await syncIgPosts(d.ig.warm.map((p: { instagram?: string }) => p.instagram ?? '').filter(Boolean)).catch((err) => console.error('[outreach] ig posts', err));
  const igPosts = demoOn() ? {} : await getIgPosts().catch(() => ({}));
  const [leads, touches, drafts] = !warmOn ? [[] as WarmLead[], {}, {}] : demoOn() ? [[{ id: '1', name: 'Josh Yarwood', status: 'interested', source: 'instagram_dm', instagram: 'josh.yarw', channel: 'Instagram', href: 'https://ig.me/m/josh.yarw' }, { id: '2', name: 'Laurence Grant', status: 'interested', source: 'linkedin', channel: 'LinkedIn', href: 'https://www.linkedin.com/in/laurencegrant/' }] as WarmLead[], {}, { '1': { text: 'Hey Josh, it’s been a while since our call in April. How did things settle on your side, and is anything still slipping between enquiry and booking?', at: '' } }] : await Promise.all([
    warmLeads().catch(() => [] as WarmLead[]), getTouches().catch(() => ({})), getCheckinDrafts().catch(() => ({})),
  ]);
  const checkins = dueCheckins(leads, touches);
  const today = repDay();
  const isToday = (t?: string) => !!t && repDay(t) === today;
  const everyone = Object.values(d.queue).flat();
  const doneToday = owedAll.filter((o) => isToday(o.sentAt) || isToday(o.closedAt)).length
    + Object.values(touches).filter((t) => t.outcome !== 'dropped' && isToday(t.at)).length
    + everyone.reduce((n, p) => n + [p.warmedAt, p.dmSentAt, p.fu1At, p.fu2At, p.igRepliedAt].filter(isToday).length, 0);

  return (
    <>
      <TabIntro sub="Work the list top to bottom: who to contact, what to do, the message to send. Tick each one off." />
      <Errors errors={d.errors} />
      {!d.settings.sending && (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/70">
          Sending is <b>off</b>, so nothing goes out. When it’s on, the daily send at 14:00 UTC (US morning) sends up to <b>{d.settings.dailyNew}</b> new first emails plus due follow-ups from contact@, only between 7am and 8pm in their time zone.
        </div>
      )}

      <ChannelBoard channels={d.channels} />

      <TodayList owed={owed} replies={d.replies} checkins={checkins} drafts={drafts} ig={d.ig} posts={igPosts} doneToday={doneToday} />

      <SectionTitle>Someone said yes to a Loom or PDF?</SectionTitle>
      <Card pad={false}>
        <ActionForm action={addOwedAsset} className="px-5 py-3.5 flex flex-wrap items-end gap-2 ">
          <label className="flex flex-col gap-1 text-[11px] text-white/45 flex-1 min-w-[160px]">Who said yes
            <input name="who" required placeholder="Name · firm" className="rounded-lg bg-white/[0.05] border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/30" />
          </label>
          <label className="flex flex-col gap-1 text-[11px] text-white/45">What you promised
            <select name="what" className="rounded-lg bg-white/[0.05] border border-white/10 px-3 py-2 text-sm text-white">
              {['Loom teardown', 'PDF', 'Leak Map', 'Voice note', 'Proposal'].map((w) => <option key={w}>{w}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[11px] text-white/45">Where
            <select name="channel" className="rounded-lg bg-white/[0.05] border border-white/10 px-3 py-2 text-sm text-white">
              {['LinkedIn', 'Instagram', 'Email'].map((w) => <option key={w}>{w}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[11px] text-white/45 flex-1 min-w-[160px]">Link to the chat (optional)
            <input name="link" type="url" placeholder="https://" className="rounded-lg bg-white/[0.05] border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/30" />
          </label>
          <button className="rounded-lg bg-white text-black text-sm font-medium px-4 py-2">Add</button>
        </ActionForm>
        <p className="px-5 pb-3 text-[11px] text-white/35">It goes to the top of the list with a 24-hour clock. Telegram reminds you at 20 hours, and a nudge comes back 5 days after you send it.</p>
      </Card>

      {/* Today's reps: the daily checklist (vault daily brief) with the tally kept for you */}
      <SectionTitle action={<span className="text-xs text-white/45">Channel outreach counts itself at the top</span>}>Other daily reps</SectionTitle>
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
