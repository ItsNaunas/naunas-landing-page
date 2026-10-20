import { outreachData } from '@/lib/ops/more';
import { STEP_DAYS, STEP_LABEL } from '@/lib/outreach';
import { TabIntro, Errors, Badge, Card, Kpi, Empty, ago, linkProps } from '@/components/dashboard/ui';
import { SectionTitle, ConnectCard, Meter, when, untilOrAgo, SectionError, errFor } from '@/components/dashboard/kit';
import { Funnel } from '@/components/dashboard/charts';
import { setProspect, markDmSent, setOutreachSending, refreshProspectSearches, bumpRepCount, markWarmed, markIgFollowup, markIgReplied } from '@/app/dashboard/actions';
import { SearchForm, DraftEditor, CopyText } from '@/app/dashboard/(app)/outreach/OutreachClient';

export const dynamic = 'force-dynamic';

const FIT_TONE = (f: number) => (f >= 6 ? 'good' : f >= 4 ? 'accent' : 'muted') as 'good' | 'accent' | 'muted';

import { lintMessage } from '@/lib/dmLint';
import { getOwed, needsYou, dueAt, nudgeAt } from '@/lib/owed';
import { demoOn } from '@/lib/ops/demo';
import { addOwedAsset, markOwedSent, closeOwed } from '@/app/dashboard/actions';
export default async function OutreachToday() {
  const d = await outreachData();
  const q = d.queue;
  const inFlight = [...q.scheduled, ...q.active];
  const goodOnes = q.review.filter((p) => p.fit >= 5).map((p) => p.id);
  const owed = needsYou(demoOn() ? [] : await getOwed().catch(() => []));

  return (
    <>
      <TabIntro sub="Your daily reps: what you owe people, today’s targets, replies, and the DMs to send." />
      <Errors errors={d.errors} />
      {!d.settings.sending && (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/70">
          Sending is <b>off</b>, so nothing goes out. When it’s on, the daily send at 14:00 UTC (US morning) sends up to <b>{d.settings.dailyNew}</b> new first emails plus due follow-ups from contact@, only between 7am and 8pm in their time zone.
        </div>
      )}

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
        <Kpi label="Emails today" value={`${d.reps.emails}/${d.reps.emailTarget}`} chart={<div className="w-24"><Meter value={d.reps.emails} max={d.reps.emailTarget} /></div>} foot={<span className="text-xs text-white/40">sent by the daily run</span>} />
        <Kpi label="DMs today" value={`${d.reps.dms}/${d.reps.dmTarget}`} chart={<div className="w-24"><Meter value={d.reps.dms} max={d.reps.dmTarget} /></div>} foot={<span className="text-xs text-white/40">mark them sent below</span>} />
        <Kpi label="Reply rate" value={d.stats.replyRate === null ? '—' : `${d.stats.replyRate}%`} foot={<span className="text-xs text-white/40">{d.stats.replied} of {d.stats.emailed} firms emailed</span>} />
        <Kpi label="Interested / booked" value={d.stats.positive} foot={<span className="text-xs text-white/40">{d.stats.withDeal} with a deal</span>} href="/dashboard/leads?source=cold_email&range=0" />
      </div>

      {/* Asset owed: a yes is worthless until the Loom/PDF lands (playbook: deliver within 24h) */}
      <SectionTitle action={owed.toSend.length + owed.toNudge.length ? <Badge tone="accent">{owed.toSend.length + owed.toNudge.length}</Badge> : undefined}>Owed after a yes</SectionTitle>
      <Card pad={false}>
        <form action={addOwedAsset} className="px-5 py-3.5 flex flex-wrap items-end gap-2 border-b border-white/[0.05]">
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
        </form>
        {owed.toSend.length + owed.toNudge.length + owed.waiting.length ? (
          <ul className="divide-y divide-white/[0.05]">
            {owed.toSend.map((o) => {
              const left = dueAt(o) - Date.now();
              return (
                <li key={o.id} className="px-5 py-3 flex flex-wrap items-center gap-3">
                  <Badge tone={left < 0 ? 'bad' : left < 6 * 3_600_000 ? 'accent' : 'neutral'}>{left < 0 ? `${Math.ceil(-left / 3_600_000)}h late` : `due in ${Math.ceil(left / 3_600_000)}h`}</Badge>
                  <span className="flex-1 min-w-0 text-[13.5px]"><b className="font-medium">{o.what}</b> for {o.who} <span className="text-white/35">· {o.channel}</span></span>
                  {o.link && <a href={o.link} {...linkProps} className="text-xs text-white/55 hover:text-white">Open chat ↗</a>}
                  <form action={markOwedSent}><input type="hidden" name="id" value={o.id} /><button className="rounded-full bg-white text-black text-xs font-medium px-3 py-1.5">Sent it</button></form>
                  <form action={closeOwed}><input type="hidden" name="id" value={o.id} /><input type="hidden" name="outcome" value="dropped" /><button className="text-xs text-white/30 hover:text-rose-300">Drop</button></form>
                </li>
              );
            })}
            {owed.toNudge.map((o) => (
              <li key={o.id} className="px-5 py-3 flex flex-wrap items-center gap-3">
                <Badge tone="accent">nudge</Badge>
                <span className="flex-1 min-w-0 text-[13.5px]">{o.who} went quiet after the {o.what} <span className="text-white/35">· sent {ago(o.sentAt!)}</span></span>
                {o.link && <a href={o.link} {...linkProps} className="text-xs text-white/55 hover:text-white">Open chat ↗</a>}
                <form action={closeOwed}><input type="hidden" name="id" value={o.id} /><input type="hidden" name="outcome" value="nudged" /><button className="rounded-full bg-white text-black text-xs font-medium px-3 py-1.5">Nudged</button></form>
                <form action={closeOwed}><input type="hidden" name="id" value={o.id} /><input type="hidden" name="outcome" value="replied" /><button className="text-xs text-white/55 hover:text-white">They replied</button></form>
              </li>
            ))}
            {owed.waiting.map((o) => (
              <li key={o.id} className="px-5 py-2.5 flex flex-wrap items-center gap-3 text-white/55">
                <Badge tone="muted">sent</Badge>
                <span className="flex-1 min-w-0 text-[13px]">{o.what} to {o.who} · {ago(o.sentAt!)}, nudge in {Math.ceil((nudgeAt(o) - Date.now()) / 86_400_000)}d</span>
                <form action={closeOwed}><input type="hidden" name="id" value={o.id} /><input type="hidden" name="outcome" value="replied" /><button className="text-xs hover:text-white">They replied</button></form>
              </li>
            ))}
          </ul>
        ) : <Empty>When someone says yes to a Loom or PDF, add them here. You get a Telegram at 20 hours if it still hasn’t gone, and a nudge reminder 5 days after you send it.</Empty>}
      </Card>

      {/* Today's reps: the daily checklist (vault daily brief) with the tally kept for you */}
      <SectionTitle action={<span className="text-xs text-white/45">{d.reps2.hit}/{d.reps2.of} targets hit today</span>}>Today’s reps</SectionTitle>
      <div className="grid lg:grid-cols-[1fr_300px] gap-3 md:gap-4">
        <Card pad={false}>
          <ul className="divide-y divide-white/[0.05]">
            {([
              ['Cold emails', d.reps2.today.auto.emails, d.reps2.targets.emails, 'Sent by the 14:00 UTC run once sending is on'],
              ['Instagram openers', d.reps2.today.auto.dms, d.reps2.targets.dms, 'From the Instagram sequence below: Sent this one'],
              ['Posts', d.reps2.today.auto.posts, d.reps2.targets.posts, 'Published from Content'],
            ] as const).map(([label, done, target, hint]) => (
              <li key={label} className="px-5 py-3 flex items-center gap-3">
                <span className={`size-5 rounded-full grid place-items-center text-[11px] shrink-0 ${done >= target ? 'bg-emerald-500/90 text-white' : 'bg-white/[0.08] text-white/40'}`}>{done >= target ? '✓' : ''}</span>
                <span className="flex-1 min-w-0"><span className="block text-[13.5px]">{label}</span><span className="block text-[11px] text-white/40">{hint} · counts itself</span></span>
                <span className="tabular-nums text-sm w-14 text-right">{done}<span className="text-white/35">/{target}</span></span>
                <span className="w-[68px]" />
              </li>
            ))}
            {d.reps2.today.manual.map((r) => (
              <li key={r.key} className="px-5 py-3 flex items-center gap-3">
                <span className={`size-5 rounded-full grid place-items-center text-[11px] shrink-0 ${r.done >= r.target ? 'bg-emerald-500/90 text-white' : 'bg-white/[0.08] text-white/40'}`}>{r.done >= r.target ? '✓' : ''}</span>
                <span className="flex-1 min-w-0"><span className="block text-[13.5px]">{r.label}</span><span className="block text-[11px] text-white/40">{r.hint}</span></span>
                <span className="tabular-nums text-sm w-14 text-right">{r.done}<span className="text-white/35">/{r.target}</span></span>
                <span className="flex gap-1 w-[68px] justify-end">
                  <form action={bumpRepCount}><input type="hidden" name="key" value={r.key} /><input type="hidden" name="delta" value="-1" /><button aria-label={`One less ${r.label}`} className="size-7 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-white/60">−</button></form>
                  <form action={bumpRepCount}><input type="hidden" name="key" value={r.key} /><input type="hidden" name="delta" value="1" /><button aria-label={`One more ${r.label}`} className="size-7 rounded-lg bg-white text-black font-medium">+</button></form>
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

      {/* Replies first: they're the money */}
      <SectionTitle action={d.replies.length ? <Badge tone="accent">{d.replies.length}</Badge> : undefined}>Replies</SectionTitle>
      <SectionError errors={errFor(d.errors, 'Inbox')} />
      <Card pad={false}>
        {!d.connected.inbox ? <Empty>Turn on IMAP in Zoho Mail (Settings → Mail Accounts → IMAP Access) so replies show here.</Empty>
          : d.replies.length ? (
            <ul className="divide-y divide-white/[0.05]">
              {d.replies.map((m) => (
                <li key={m.messageId || m.uid}>
                  <a href={m.href} className="flex items-start gap-4 px-5 py-3.5 hover:bg-white/[0.025]">
                    <span className="size-2 mt-2 rounded-full bg-[#F2613F] shrink-0" aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">{m.who} <span className="text-white/35 font-normal">· {ago(m.date)}</span></span>
                      <span className="block text-xs text-white/45 truncate">{m.subject}</span>
                      <span className="block text-[13px] text-white/75 mt-1 line-clamp-2">{m.text}</span>
                    </span>
                    <span className="text-xs text-white/50 whitespace-nowrap">Reply →</span>
                  </a>
                </li>
              ))}
            </ul>
          ) : <Empty>No replies in the last 14 days. They appear here (and on Telegram) the moment they land.</Empty>}
      </Card>

      {/* Instagram sequence (DM playbook): warm up day 1 → opener day 2 → follow-ups day 5 and 9 → stop */}
      <SectionTitle action={<span className="text-xs text-white/45">{d.ig.waiting} waiting on a reply · {d.ig.finished} finished</span>}>Instagram sequence</SectionTitle>
      <div className="grid lg:grid-cols-3 gap-3 md:gap-4">
        <Card title={`1 · Warm up (${d.ig.warm.length})`} pad={false}>
          {d.ig.warm.length ? (
            <ul className="divide-y divide-white/[0.05]">
              {d.ig.warm.map((p) => (
                <li key={p.id} className="px-5 py-2.5 flex items-center gap-2">
                  <a href={`https://instagram.com/${p.instagram}`} {...linkProps} className="flex-1 min-w-0 truncate text-[13px] hover:text-[#F2613F]">@{p.instagram} ↗<span className="block text-[11px] text-white/35">{p.firm}</span></a>
                  <form action={markWarmed}><input type="hidden" name="id" value={p.id} /><button className="rounded-full bg-white/[0.08] hover:bg-white/[0.14] text-xs px-2.5 py-1">Done</button></form>
                </li>
              ))}
            </ul>
          ) : <Empty>Drafted firms with an Instagram land here. Follow, like 2 to 3 project posts, leave one specific comment, view their story.</Empty>}
          <p className="px-5 pb-3 text-[11px] text-white/35">Their opener unlocks tomorrow.</p>
        </Card>

        <Card title={`2 · Send the opener (${d.ig.openers.length})`} pad={false}>
          {d.ig.openers.length ? (
            <ul className="divide-y divide-white/[0.05]">
              {d.ig.openers.map((p) => {
                const options = p.drafts?.dms?.length ? p.drafts.dms : [{ style: 'default', text: p.drafts?.dm ?? '' }];
                return (
                  <li key={p.id} className="px-5 py-3 flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-3">
                      <a href={`https://instagram.com/${p.instagram}`} {...linkProps} className="text-sm font-medium hover:text-[#F2613F] truncate">@{p.instagram} ↗</a>
                      <span className="text-[11px] text-white/40 truncate">{p.firm}</span>
                    </div>
                    {options.map((o) => {
                      const lint = lintMessage(o.text, { dm: true });
                      return (
                        <div key={o.style} className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-2.5 flex flex-col gap-2">
                          {options.length > 1 && <span className="text-[10px] uppercase tracking-wider text-white/35">Style {o.style}</span>}
                          <p className="text-[13px] text-white/80">{o.text}</p>
                          {(lint.block.length > 0 || lint.warn.length > 0) && (
                            <p className="text-[11px]">{lint.block.map((b) => <span key={b} className="text-rose-300 mr-2">✕ {b}</span>)}{lint.warn.map((w) => <span key={w} className="text-amber-300/90 mr-2">⚠ {w}</span>)}</p>
                          )}
                          <div className="flex gap-2">
                            {lint.ok ? <CopyText text={o.text} /> : <span className="text-[11px] text-white/40">Fix it in Prospects → Drafts first</span>}
                            {lint.ok && <form action={markDmSent}><input type="hidden" name="id" value={p.id} /><input type="hidden" name="style" value={o.style} /><button className="rounded-full bg-white text-black text-xs font-medium px-3 py-1.5">Sent this one</button></form>}
                          </div>
                        </div>
                      );
                    })}
                  </li>
                );
              })}
            </ul>
          ) : <Empty>Openers appear the day after a warm-up. Under 25 words, one real detail, one easy question, no link.</Empty>}
        </Card>

        <Card title={`3 · Follow-ups due (${d.ig.followups.length})`} pad={false}>
          {d.ig.followups.length ? (
            <ul className="divide-y divide-white/[0.05]">
              {d.ig.followups.map(({ p, n }) => (
                <li key={p.id} className="px-5 py-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-3">
                    <a href={`https://instagram.com/${p.instagram}`} {...linkProps} className="text-sm font-medium hover:text-[#F2613F] truncate">@{p.instagram} ↗</a>
                    <Badge tone={n === 2 ? 'accent' : 'neutral'}>{n === 1 ? 'Day 5' : 'Day 9 · last one'}</Badge>
                  </div>
                  <p className="text-[12px] text-white/50">{n === 1 ? 'Something useful: a screenshot or a 60-second voice note on how a firm like theirs handles enquiries. No “just checking in”.' : 'Leave the door open with a month to check back. Then stop. Never a third.'}</p>
                  <div className="flex gap-3 items-center">
                    <form action={markIgFollowup}><input type="hidden" name="id" value={p.id} /><input type="hidden" name="n" value={n} /><button className="rounded-full bg-white text-black text-xs font-medium px-3 py-1.5">Sent</button></form>
                    <form action={markIgReplied}><input type="hidden" name="id" value={p.id} /><button className="text-xs text-white/55 hover:text-white">They replied</button></form>
                  </div>
                </li>
              ))}
            </ul>
          ) : <Empty>Nothing due. Follow-ups show up 3 and 7 days after the opener, and vanish when you mark a reply.</Empty>}
          {d.ig.waiting > 0 && <p className="px-5 pb-3 text-[11px] text-white/35">Got a reply from someone waiting? Find them under Prospects or mark it from their follow-up.</p>}
        </Card>
      </div>
    </>
  );
}
