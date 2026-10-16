import { outreachData } from '@/lib/ops/more';
import { STEP_DAYS, STEP_LABEL } from '@/lib/outreach';
import { PageHeader, Errors, Badge, Card, Kpi, Empty, ago, linkProps } from '@/components/dashboard/ui';
import { SectionTitle, ConnectCard, Meter, when, untilOrAgo, SectionError, errFor } from '@/components/dashboard/kit';
import { Funnel } from '@/components/dashboard/charts';
import { setProspect, markDmSent, setOutreachSending, refreshProspectSearches } from '../../actions';
import { SearchForm, DraftEditor, CopyText } from './OutreachClient';

export const dynamic = 'force-dynamic';

const FIT_TONE = (f: number) => (f >= 6 ? 'good' : f >= 4 ? 'accent' : 'muted') as 'good' | 'accent' | 'muted';

export default async function Outreach() {
  const d = await outreachData();
  const q = d.queue;
  const inFlight = [...q.scheduled, ...q.active];
  const goodOnes = q.review.filter((p) => p.fit >= 5).map((p) => p.id);

  return (
    <>
      <PageHeader
        title="Outreach"
        sub="Find firms, approve them, review Claude’s drafts, and let the daily send work the sequence. Replies stop it instantly."
        action={
          <form action={setOutreachSending} className="flex items-center gap-3">
            <input type="hidden" name="on" value={d.settings.sending ? '0' : '1'} />
            <span className="text-xs text-white/50">Sending is</span>
            <button className={`relative h-7 w-14 rounded-full transition-colors ${d.settings.sending ? 'bg-emerald-500' : 'bg-white/15'}`} aria-label={d.settings.sending ? 'Turn sending off' : 'Turn sending on'}>
              <span className={`absolute top-1 size-5 rounded-full bg-white transition-all ${d.settings.sending ? 'left-8' : 'left-1'}`} />
            </button>
            <span className={`text-sm font-medium ${d.settings.sending ? 'text-emerald-300' : 'text-white/60'}`}>{d.settings.sending ? 'ON' : 'OFF'}</span>
          </form>
        }
      />
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

      {/* Find */}
      <SectionTitle action={<form action={refreshProspectSearches}><button className="text-xs text-white/45 hover:text-white">Refresh searches ↻</button></form>}>Find prospects</SectionTitle>
      {!d.connected.apify ? <ConnectCard title="Connect Apify" why="Searches Google Maps for firms with a website, email and Instagram." steps={['Apify → Settings → Integrations → API token']} env="APIFY_TOKEN" /> : (
        <Card>
          <SearchForm />
          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-white/45">
            <span>About $0.007 per firm · this month ${d.spent.toFixed(2)} of ${d.settings.monthlyCapUsd} cap</span>
            <span>Skips stores, stagers and trades, and anyone already in HubSpot.</span>
          </div>
          {d.searches.length > 0 && (
            <ul className="mt-4 flex flex-col divide-y divide-white/[0.05] border-t border-white/[0.06]">
              {d.searches.map((s) => (
                <li key={s.id} className="py-2.5 flex flex-wrap items-center justify-between gap-2 text-[13px]">
                  <span>{s.term} · {s.location}</span>
                  <span className="flex items-center gap-2 text-xs text-white/45">
                    {s.status === 'SUCCEEDED' ? `${s.added ?? 0} new of ${s.found ?? 0} found` : s.status === 'RUNNING' || s.status === 'READY' ? 'Searching…' : s.status.toLowerCase()}
                    {s.costUsd !== undefined && <span>· ${s.costUsd.toFixed(2)}</span>}
                    <span>· {ago(s.createdAt)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {/* Review */}
      <SectionTitle action={goodOnes.length ? (
        <form action={setProspect}><input type="hidden" name="ids" value={goodOnes.join(',')} /><input type="hidden" name="status" value="approved" />
          <button className="text-xs text-[#ff8a6d] hover:text-white">Approve all {goodOnes.length} strong fits (5+)</button></form>
      ) : undefined}>To review · {q.review.length}</SectionTitle>
      <Card pad={false}>
        {q.review.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px] min-w-[720px]">
              <thead><tr className="text-left text-xs text-white/35"><th className="font-normal px-5 py-3">Firm</th><th className="font-normal px-3 py-3">Fit</th><th className="font-normal px-3 py-3">Why</th><th className="font-normal px-3 py-3">Links</th><th className="px-5 py-3" /></tr></thead>
              <tbody>
                {q.review.map((p) => (
                  <tr key={p.id} className="border-t border-white/[0.05] hover:bg-white/[0.02]">
                    <td className="px-5 py-3"><p className="font-medium">{p.firm}</p><p className="text-xs text-white/40">{[p.city, p.state].filter(Boolean).join(', ')}{p.rating ? ` · ${p.rating}★ (${p.reviews})` : ''}</p></td>
                    <td className="px-3 py-3"><Badge tone={FIT_TONE(p.fit)}>{p.fit}/7</Badge></td>
                    <td className="px-3 py-3 text-xs text-white/55 max-w-[260px]">{p.fitWhy.join(' · ')}</td>
                    <td className="px-3 py-3 text-xs">
                      <div className="flex gap-3">
                        {p.website && <a href={p.website} {...linkProps} className="text-white/60 hover:text-white">Site ↗</a>}
                        {p.instagram && <a href={`https://instagram.com/${p.instagram}`} {...linkProps} className="text-white/60 hover:text-white">IG ↗</a>}
                        {p.mapsUrl && <a href={p.mapsUrl} {...linkProps} className="text-white/60 hover:text-white">Maps ↗</a>}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-2">
                        <form action={setProspect}><input type="hidden" name="ids" value={p.id} /><input type="hidden" name="status" value="approved" /><button className="rounded-full bg-white text-black text-xs font-medium px-3 py-1.5">Approve</button></form>
                        <form action={setProspect}><input type="hidden" name="ids" value={p.id} /><input type="hidden" name="status" value="rejected" /><button className="rounded-full border border-white/15 text-xs px-3 py-1.5 text-white/60 hover:text-white">Skip</button></form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <Empty>Nothing to review. Run a search above.</Empty>}
      </Card>
      {q.approved.length > 0 && <p className="text-xs text-white/40 -mt-2">{q.approved.length} approved and waiting for drafts. The 13:00 routine researches each firm and writes the emails and DM; they appear below.</p>}

      {/* Drafts */}
      <SectionTitle>Drafts to approve · {q.drafted.length}</SectionTitle>
      {q.drafted.length ? <div className="flex flex-col gap-3">{q.drafted.map((p) => <DraftEditor key={p.id} p={p} />)}</div>
        : <Card><Empty>No drafts waiting. Approve firms above and drafts arrive after the next daily run.</Empty></Card>}

      <div className="grid lg:grid-cols-2 gap-3 md:gap-4">
        {/* DMs */}
        <div className="flex flex-col gap-3 min-w-0">
          <SectionTitle>Today’s Instagram DMs</SectionTitle>
          <Card pad={false}>
            {d.dmList.length ? (
              <ul className="divide-y divide-white/[0.05]">
                {d.dmList.map((p) => (
                  <li key={p.id} className="px-5 py-3.5 flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-3">
                      <a href={`https://instagram.com/${p.instagram}`} {...linkProps} className="text-sm font-medium hover:text-[#F2613F]">@{p.instagram} ↗</a>
                      <span className="text-xs text-white/40">{p.firm}</span>
                    </div>
                    <p className="text-[13px] text-white/70">{p.drafts?.dm}</p>
                    <div className="flex gap-2">
                      <CopyText text={p.drafts?.dm ?? ''} />
                      <form action={markDmSent}><input type="hidden" name="id" value={p.id} /><button className="rounded-full bg-white text-black text-xs font-medium px-3 py-1.5">Mark sent</button></form>
                    </div>
                  </li>
                ))}
              </ul>
            ) : <Empty>No DMs queued. Drafted prospects with an Instagram show up here, ready to copy.</Empty>}
          </Card>
        </div>

        {/* Results */}
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
