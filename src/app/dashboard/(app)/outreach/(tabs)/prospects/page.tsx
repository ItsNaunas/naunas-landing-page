import Link from 'next/link';
import { outreachData } from '@/lib/ops/more';
import { getProspects, getSettings, channelsFor, suggestChannel, CHANNEL_LABEL, type Prospect } from '@/lib/outreach';
import { domainOf } from '@/lib/hubspot';
import { WAVE1 } from '@/config/wave1';
import { demoOn } from '@/lib/ops/demo';
import { ActionForm } from '@/components/dashboard/ActionForm';
import { TabIntro, Errors, Badge, Card, Empty, ago, linkProps } from '@/components/dashboard/ui';
import { ConnectCard } from '@/components/dashboard/kit';
import { setProspect, refreshProspectSearches, importWave1, startAllReady, researchNow } from '@/app/dashboard/actions';
import { SearchForm, DraftEditor } from '@/app/dashboard/(app)/outreach/OutreachClient';
import { pullDealStagesSoon, outcomeOf } from '@/lib/crmSync';

export const dynamic = 'force-dynamic';

const FIT_TONE = (f: number) => (f >= 6 ? 'good' : f >= 4 ? 'accent' : 'muted') as 'good' | 'accent' | 'muted';
type Step = 'review' | 'researching' | 'ready' | 'outreach' | 'replied' | 'booked' | 'skipped';
const working = (p: Prospect) => !!p.researchAt && Date.now() - Date.parse(p.researchAt) < 10 * 60_000;
const firmLink = (p: Prospect) => <Link href={`/dashboard/outreach/firm/${encodeURIComponent(p.id)}`} className="font-medium hover:text-[#F2613F]">{p.firm}</Link>;

export default async function OutreachProspects({ searchParams }: { searchParams: Promise<{ step?: string }> }) {
  // Won/Lost set in HubSpot closes firms here too (throttled to every 15 minutes).
  if (!demoOn()) await pullDealStagesSoon().catch(() => {});
  const d = await outreachData();
  const q = d.queue;
  const all = demoOn() ? (Object.values(q).flat() as Prospect[]) : await getProspects().catch(() => [] as Prospect[]);
  const settings = demoOn() ? { igNew: 7, liNew: 7, dailyNew: 6 } : await getSettings();
  const targets = { instagram: settings.igNew, linkedin: settings.liNew, email: settings.dailyNew };
  const have = new Set(all.flatMap((p) => [p.domain, p.instagram?.toLowerCase()].filter(Boolean) as string[]));
  const wave1Left = WAVE1.filter((w) => !have.has(domainOf(w.website) ?? '') && !have.has((w.instagram ?? '').toLowerCase())).length;
  const skipped = all.filter((p) => p.status === 'rejected').slice(-40).reverse();
  const outreach = [...q.scheduled, ...q.active];
  const booked = all.filter((p) => p.bookedAt).sort((a, b) => b.bookedAt!.localeCompare(a.bookedAt!));
  const replied = q.replied.filter((p) => !p.bookedAt);

  const steps: { key: Step; label: string; count: number; hint: string }[] = [
    { key: 'review', label: 'Review', count: q.review.length, hint: 'Weaker fits wait here; 5+ go straight to research' },
    { key: 'researching', label: 'Researching', count: q.approved.length, hint: 'About a minute per firm' },
    { key: 'ready', label: 'Ready to start', count: q.drafted.length, hint: 'Pick a channel, press Start' },
    { key: 'outreach', label: 'In outreach', count: outreach.length, hint: 'Working through the cadence' },
    { key: 'replied', label: 'Replied', count: replied.length, hint: 'Talking to you' },
    { key: 'booked', label: 'Booked', count: booked.length, hint: 'Booked an audit call' },
    { key: 'skipped', label: 'Skipped', count: skipped.length, hint: 'Didn’t fit, with the reason' },
  ];
  const asked = (await searchParams).step as Step | undefined;
  const step: Step = asked && steps.some((s) => s.key === asked) ? asked : q.drafted.length ? 'ready' : 'review';
  const goodOnes = q.review.filter((p) => p.fit >= 5).map((p) => p.id);
  const list = step === 'outreach' ? outreach : step === 'booked' ? booked : replied;

  return (
    <>
      <TabIntro sub="Who we target: US residential, full-service interior design firms, 3 to 20 people, owner-led. Each firm moves left to right." />
      <Errors errors={d.errors} />

      <nav className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-2" aria-label="Prospect steps">
        {steps.map((s, i) => (
          <Link key={s.key} href={`/dashboard/outreach/prospects?step=${s.key}`} aria-current={s.key === step ? 'page' : undefined}
            className={`rounded-xl border px-3 py-2.5 transition-colors ${s.key === step ? 'border-[#F2613F]/60 bg-[#F2613F]/[0.08]' : 'border-white/[0.07] bg-white/[0.02] hover:border-white/20'}`}>
            <span className="block text-[11px] text-white/60">{i + 1}. {s.label}</span>
            <span className="block text-xl font-semibold tabular-nums" style={{ fontFamily: 'var(--font-display)' }}>{s.count}</span>
            <span className="hidden md:block text-[11px] text-white/55 truncate">{s.hint}</span>
          </Link>
        ))}
      </nav>

      {step === 'review' && (
        <>
          {wave1Left > 0 && (
            <Card>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p className="text-sm"><b>{wave1Left} firms from your wave-1 list</b> <span className="text-white/65">(Austin, Nashville, Scottsdale) aren’t in here yet.</span></p>
                <ActionForm action={importWave1}><button className="shrink-0 rounded-lg bg-[#F2613F] px-4 py-2 text-sm font-medium text-white hover:bg-[#ff7553]">Import {wave1Left} firms</button></ActionForm>
              </div>
            </Card>
          )}
          <details open={!q.review.length} className="rounded-2xl border border-white/[0.07] bg-[#121212]">
            <summary className="cursor-pointer px-5 py-3.5 text-sm font-medium">Find new firms on Google Maps <span className="text-white/60 font-normal">· this month ${d.spent.toFixed(2)} of ${d.settings.monthlyCapUsd}</span></summary>
            <div className="px-5 pb-5">
              {!d.connected.apify ? <ConnectCard title="Connect Apify" why="Searches Google Maps for firms with a website, email and Instagram." steps={['Apify → Settings → Integrations → API token']} env="APIFY_TOKEN" /> : <>
                <SearchForm />
                <p className="mt-3 text-xs text-white/60">About $0.007 per firm. Skips stores, stagers, trades and anyone already in HubSpot. Firms scoring 5+ are approved and researched straight away; weaker fits land here for you to decide.</p>
                {d.searches.length > 0 && (
                  <ul className="mt-3 flex flex-col divide-y divide-white/[0.05] border-t border-white/[0.06]">
                    {d.searches.map((s) => (
                      <li key={s.id} className="py-2 flex flex-wrap items-center justify-between gap-2 text-[13px]">
                        <span>{s.term} · {s.location}</span>
                        <span className="text-xs text-white/60">{s.status === 'SUCCEEDED' ? `${s.added ?? 0} new of ${s.found ?? 0}` : s.status === 'RUNNING' || s.status === 'READY' ? 'Searching…' : s.status.toLowerCase()} · {ago(s.createdAt)}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <ActionForm action={refreshProspectSearches}><button className="mt-2 text-xs text-white/60 hover:text-white">Check searches ↻</button></ActionForm>
              </>}
            </div>
          </details>
          <Card pad={false}>
            {goodOnes.length > 0 && (
              <div className="px-5 py-3 border-b border-white/[0.06] flex justify-end">
                <ActionForm action={setProspect}><input type="hidden" name="ids" value={goodOnes.join(',')} /><input type="hidden" name="status" value="approved" />
                  <button className="rounded-lg bg-white text-black text-xs font-medium px-3 py-1.5">Approve all {goodOnes.length} strong fits (5+)</button></ActionForm>
              </div>
            )}
            {q.review.length ? (
              <ul className="divide-y divide-white/[0.05]">
                {q.review.map((p) => (
                  <li key={p.id} data-item={`rv-${p.id}`} className="px-5 py-3 flex flex-wrap items-center gap-3">
                    <div className="flex-1 min-w-[200px]">
                      <p className="text-sm">{firmLink(p)} <Badge tone={FIT_TONE(p.fit)}>{p.fit}/7</Badge></p>
                      <p className="text-xs text-white/60">{[p.city, p.state].filter(Boolean).join(', ')}{p.rating ? ` · ${p.rating}★ (${p.reviews})` : ''} · {p.fitWhy.join(' · ')}</p>
                    </div>
                    <div className="flex gap-3 text-xs">
                      {p.website && <a href={p.website} {...linkProps} className="text-white/60 hover:text-white">Site ↗</a>}
                      {p.instagram && <a href={`https://instagram.com/${p.instagram}`} {...linkProps} className="text-white/60 hover:text-white">IG ↗</a>}
                    </div>
                    <div className="flex gap-2">
                      <ActionForm action={setProspect}><input type="hidden" name="ids" value={p.id} /><input type="hidden" name="status" value="approved" /><button className="rounded-full bg-white text-black text-xs font-medium px-3 py-1.5">Approve</button></ActionForm>
                      <ActionForm action={setProspect}><input type="hidden" name="ids" value={p.id} /><input type="hidden" name="status" value="rejected" /><button className="rounded-full border border-white/15 text-xs px-3 py-1.5 text-white/60 hover:text-white">Skip</button></ActionForm>
                    </div>
                  </li>
                ))}
              </ul>
            ) : <Empty>Nothing to review. Find firms above or import the wave-1 list.</Empty>}
          </Card>
        </>
      )}

      {step === 'researching' && (
        <Card pad={false}>
          <div className="px-5 py-3 border-b border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-sm text-white/55">Research starts the moment you approve: their website, Instagram and the owner’s LinkedIn, checked against the profile. About a minute each. Passes move to Ready to start; the rest go to Skipped with the reason. Refresh to see progress.</p>
            {q.approved.some((p) => !working(p)) && <ActionForm action={researchNow}><button className="shrink-0 rounded-lg bg-white text-black text-xs font-medium px-3 py-1.5">Research all now</button></ActionForm>}
          </div>
          {q.approved.length ? (
            <ul className="divide-y divide-white/[0.05]">
              {q.approved.map((p) => (
                <li key={p.id} data-item={`rs-${p.id}`} className="px-5 py-2.5 text-[13px] flex flex-wrap items-center justify-between gap-3">
                  <span className="min-w-0">{firmLink(p)} <span className="text-xs text-white/60">{[p.city, p.state].filter(Boolean).join(', ')}</span>
                    {p.researchError && <span className="block text-xs text-rose-300/80">Research failed: {p.researchError}</span>}</span>
                  {working(p) ? <span className="text-xs text-[#ff8a6d]">Researching now…</span> : (
                    <ActionForm action={researchNow}><input type="hidden" name="id" value={p.id} /><button className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-white/70 hover:text-white">{p.researchError ? 'Try again' : 'Research now'}</button></ActionForm>
                  )}
                </li>
              ))}
            </ul>
          ) : <Empty>Nothing waiting. Approve firms in Review.</Empty>}
        </Card>
      )}

      {step === 'ready' && (
        <>
          {q.drafted.length > 1 && (
            <Card>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p className="text-sm text-white/65">Happy with these? Start them all, each on the suggested channel (the one with most room left today). Drafts with placeholder text are left for you to fix.</p>
                <ActionForm action={startAllReady}><button className="shrink-0 rounded-lg bg-[#F2613F] px-4 py-2 text-sm font-medium text-white hover:bg-[#ff7553]">Start all {q.drafted.length}</button></ActionForm>
              </div>
            </Card>
          )}
          {q.drafted.length ? <div className="flex flex-col gap-3">{q.drafted.map((p) => <DraftEditor key={p.id} p={p} options={channelsFor(p)} suggested={suggestChannel(p, all, targets)} />)}</div>
            : <Card><Empty>No drafts waiting. Approved firms arrive here after the next daily run.</Empty></Card>}
        </>
      )}

      {(step === 'outreach' || step === 'replied' || step === 'booked') && (
        <Card pad={false}>
          {list.length ? (
            <ul className="divide-y divide-white/[0.05]">
              {list.map((p) => (
                <li key={p.id} className="px-5 py-2.5 text-[13px] flex flex-wrap items-center justify-between gap-3">
                  <span>{firmLink(p)} {p.channel && <Badge tone="muted">{CHANNEL_LABEL[p.channel]}</Badge>} {outcomeOf(p) && step !== 'outreach' && <Badge tone={p.wonAt ? 'good' : p.lostAt ? 'muted' : 'accent'}>{outcomeOf(p)}</Badge>}</span>
                  <span className="text-xs text-white/60">{step === 'booked' ? `booked ${ago(p.bookedAt!)}` : step === 'replied' ? `replied ${ago(p.igRepliedAt ?? p.repliedAt ?? p.createdAt)}` : `started ${ago(p.scheduledAt ?? p.startedAt ?? p.createdAt)}`}</span>
                </li>
              ))}
            </ul>
          ) : <Empty>{step === 'outreach' ? 'No firms in outreach yet. Start some from Ready to start.' : step === 'booked' ? 'No audit calls booked from cold outreach yet.' : 'No replies yet.'}</Empty>}
          {step === 'outreach' && <p className="px-5 py-3 text-xs text-white/60 border-t border-white/[0.06]">Day-by-day progress for each firm is on the <Link href="/dashboard/outreach/sequences" className="underline hover:text-white">Sequences</Link> tab.</p>}
        </Card>
      )}

      {step === 'skipped' && (
        <Card pad={false}>
          {skipped.length ? (
            <ul className="divide-y divide-white/[0.05]">
              {skipped.map((p) => (
                <li key={p.id} data-item={`sk-${p.id}`} className="px-5 py-2.5 flex flex-wrap items-center gap-3">
                  <div className="flex-1 min-w-[200px]"><p className="text-[13px]">{firmLink(p)}</p><p className="text-xs text-white/60">{p.fitWhy[0]}</p></div>
                  <ActionForm action={setProspect}><input type="hidden" name="ids" value={p.id} /><input type="hidden" name="status" value="new" /><button className="text-xs text-white/65 hover:text-white">Undo → Review</button></ActionForm>
                </li>
              ))}
            </ul>
          ) : <Empty>Nothing skipped yet.</Empty>}
        </Card>
      )}
    </>
  );
}
