import { Fragment } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getProspects, getSettings, channelsFor, suggestChannel, emailHold, CHANNEL_LABEL, STEP_LABEL, type Prospect } from '@/lib/outreach';
import { getIgPosts } from '@/lib/igPosts';
import { demoOn } from '@/lib/ops/demo';
import { Badge, Card, Empty, ago, linkProps } from '@/components/dashboard/ui';
import { SectionTitle } from '@/components/dashboard/kit';
import { ActionForm } from '@/components/dashboard/ActionForm';
import { setProspect, markIgReplied, addOwedAsset, researchNow, markBooked } from '@/app/dashboard/actions';
import { getReport } from '@/lib/leakReport';
import { FUNNEL } from '@/config/funnel';
import { ReportPanel } from './ReportPanel';
import { ReplyPanel } from './ReplyPanel';
import { aiReady } from '@/lib/ai';
import { pullDealStagesSoon, outcomeOf } from '@/lib/crmSync';
import { hubspotUrl } from '@/lib/hubspot';
import { DraftEditor, CopyText } from '../../OutreachClient';
import { Timeline } from '../../FirmTimeline';

export const dynamic = 'force-dynamic';
export const maxDuration = 120; // building a leak report reads their site + one AI call

const STATUS: Record<Prospect['status'], string> = {
  new: 'To review', rejected: 'Skipped', approved: 'Researching', drafted: 'Ready to start', scheduled: 'In outreach', active: 'In outreach',
  replied: 'Replied', finished: 'Finished', stopped: 'Stopped', bounced: 'Email bounced',
};

/** Everything about one firm in one place: research, channel, timeline, drafts, their posts, and the actions. */
export default async function FirmPage({ params }: PageProps<'/dashboard/outreach/firm/[id]'>) {
  const id = decodeURIComponent((await params).id);
  if (!demoOn()) await pullDealStagesSoon().catch(() => {});
  const all = demoOn() ? [] : await getProspects().catch(() => [] as Prospect[]);
  const p = all.find((x) => x.id === id);
  if (!p) notFound();
  const settings = await getSettings();
  const r = p.drafts?.research;
  const posts = p.instagram ? (await getIgPosts().catch(() => ({} as Record<string, { items: { url: string; caption?: string; comment?: string; at?: string }[] }>)))[p.instagram.toLowerCase()]?.items ?? [] : [];
  const live = ['drafted', 'scheduled', 'active'].includes(p.status);
  const report = p.reportToken ? await getReport(p.reportToken).catch(() => null) : null;
  const reportable = !!p.website && ['drafted', 'scheduled', 'active', 'replied', 'finished'].includes(p.status);
  const researching = !!p.researchAt && Date.now() - Date.parse(p.researchAt) < 10 * 60_000;
  const hold = p.status === 'scheduled' && (!p.channel || p.channel === 'email') ? emailHold(p) : null;

  return (
    <>
      <Link href="/dashboard/outreach/prospects" className="text-xs text-white/45 hover:text-white -mb-3">← Prospects</Link>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-[28px] font-semibold tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>{p.firm}</h1>
          <p className="text-sm text-white/50 mt-1 flex flex-wrap items-center gap-2">
            {[p.city, p.state].filter(Boolean).join(', ')}
            <Badge tone={p.status === 'replied' ? 'good' : live ? 'accent' : 'muted'}>{STATUS[p.status]}</Badge>
            {p.channel && <Badge tone="neutral">{CHANNEL_LABEL[p.channel]} only</Badge>}
            {outcomeOf(p) && <Badge tone={p.wonAt ? 'good' : p.lostAt ? 'muted' : 'accent'}>{outcomeOf(p)}</Badge>}
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-xs">
          {p.dealId ? <a href={hubspotUrl.deal(p.dealId)} {...linkProps} className="text-[#ff8a6d] hover:underline">Deal in HubSpot ↗</a> : p.contactId ? <a href={hubspotUrl.contact(p.contactId)} {...linkProps} className="text-[#ff8a6d] hover:underline">HubSpot ↗</a> : null}
          {p.contactId && <a href={`/dashboard/leads/${p.contactId}`} className="text-white/60 hover:text-white">Lead page</a>}
          {p.website && <a href={p.website} {...linkProps} className="text-white/60 hover:text-white">Website ↗</a>}
          {p.instagram && <a href={`https://instagram.com/${p.instagram}`} {...linkProps} className="text-white/60 hover:text-white">@{p.instagram} ↗</a>}
          {r?.ownerLinkedin && <a href={r.ownerLinkedin} {...linkProps} className="text-white/60 hover:text-white">LinkedIn ↗</a>}
          {(p.email || r?.ownerEmail) && <span className="text-white/45">{r?.ownerEmail ?? p.email}</span>}
        </div>
      </div>

      {p.contactId && (p.status === 'replied' || !!p.bookedAt) && (
        <a href={`/dashboard/leads/${p.contactId}`} className="rounded-xl border border-[#F2613F]/30 bg-[#F2613F]/[0.06] px-4 py-3 text-sm hover:border-[#F2613F]/60">They’re a lead now: the lead page has emails, calls, the deal, proposals and this outreach history in one place →</a>
      )}

      {(live || p.status === 'replied') && (
        <Card>
          <div className="flex flex-wrap items-center gap-3">
            {live && <ActionForm action={setProspect}><input type="hidden" name="ids" value={p.id} /><input type="hidden" name="status" value="stopped" /><button className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-white/70 hover:text-rose-300">Stop all outreach</button></ActionForm>}
            {live && !!(p.warmedAt || p.dmSentAt || p.liEngagedAt || p.liAt || p.sent?.length) && <ActionForm action={markIgReplied}><input type="hidden" name="id" value={p.id} /><button className="rounded-full bg-white text-black px-3 py-1.5 text-xs font-medium">They replied</button></ActionForm>}
            <ActionForm action={addOwedAsset} className="flex items-center gap-2">
              <input type="hidden" name="firmId" value={p.id} />
              <input type="hidden" name="who" value={`${r?.owner ?? p.firm}${r?.owner ? ` · ${p.firm}` : ''}`} />
              <input type="hidden" name="channel" value={p.channel === 'linkedin' ? 'LinkedIn' : p.channel === 'email' ? 'Email' : 'Instagram'} />
              <select name="what" className="rounded-lg bg-white/[0.05] border border-white/10 px-2 py-1.5 text-xs text-white">
                {['Loom teardown', 'PDF', 'Leak Map', 'Voice note', 'Proposal'].map((w) => <option key={w}>{w}</option>)}
              </select>
              <button className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-white/70 hover:text-white">They said yes → owed</button>
            </ActionForm>
            {hold && <span className="text-xs text-white/45">{hold}</span>}
          </div>
          {!p.bookedAt && (
            <details className="mt-3 border-t border-white/[0.06] pt-3">
              <summary className="cursor-pointer text-xs text-white/50 hover:text-white">They booked the audit, but it didn’t match here (personal email)? Link it by hand</summary>
              <ActionForm action={markBooked} className="mt-2 flex flex-wrap items-center gap-2">
                <input type="hidden" name="id" value={p.id} />
                <input name="deal" placeholder="HubSpot deal link (optional)" className="rounded-lg bg-white/[0.05] border border-white/10 px-3 py-1.5 text-xs text-white placeholder:text-white/30 min-w-[260px]" />
                <button className="rounded-full bg-white text-black px-3 py-1.5 text-xs font-medium">They booked</button>
                <span className="text-[11px] text-white/40">Stops the sequence, marks Booked, notes the research on the deal.</span>
              </ActionForm>
            </details>
          )}
        </Card>
      )}

      {(p.status === 'replied' || !!p.igRepliedAt) && (
        <>
          <SectionTitle>Reply to them</SectionTitle>
          <Card><ReplyPanel id={p.id} channel={p.channel ? CHANNEL_LABEL[p.channel] : 'Instagram'} ai={aiReady()} /></Card>
        </>
      )}

      <div className="grid lg:grid-cols-[1fr_340px] gap-3 md:gap-4">
        <div className="flex flex-col gap-3 min-w-0">
          {(p.status === 'scheduled' || p.status === 'active') && (
            <>
              <SectionTitle>Progress</SectionTitle>
              <Card>
                <Timeline p={p} />
                {(!p.channel || p.channel === 'email') && p.drafts && (
                  <p className="text-xs text-white/50 mt-3">Email: {(p.sent?.length ?? 0)} of {p.drafts.steps.length} sent{p.sent?.length ? ` · last ${ago(p.sent[p.sent.length - 1].at)}` : ''}{(p.sent?.length ?? 0) < 4 ? ` · next: ${STEP_LABEL[p.sent?.length ?? 0]}` : ''}</p>
                )}
              </Card>
            </>
          )}

          <SectionTitle>{p.status === 'drafted' ? 'Drafts: pick a channel and start' : 'Drafts'}</SectionTitle>
          {p.drafts ? (
            p.status === 'drafted' ? <DraftEditor p={p} defaultOpen options={channelsFor(p)} suggested={suggestChannel(p, all, { instagram: settings.igNew, linkedin: settings.liNew, email: settings.dailyNew })} /> : (
              <Card>
                {(p.drafts.dms?.length ? p.drafts.dms : p.drafts.dm ? [{ style: 'A', text: p.drafts.dm }] : []).map((o) => (
                  <div key={o.style} className="mb-3">
                    <p className="text-[10.5px] uppercase tracking-wider text-white/35">Instagram opener {o.style}{p.dmStyle === o.style ? ' · sent' : ''}</p>
                    <p className="text-[13px] text-white/80 mt-1">{o.text}</p>
                  </div>
                ))}
                {p.drafts.steps.map((t, i) => (
                  <details key={i} className="border-t border-white/[0.05] py-2">
                    <summary className="cursor-pointer text-[13px]">{STEP_LABEL[i]}{p.sent?.some((x) => x.step === i) ? ' · sent' : ''}</summary>
                    <p className="text-[13px] text-white/70 whitespace-pre-wrap mt-2">{i === 0 ? `Subject: ${p.drafts!.subject}\n\n` : ''}{t}</p>
                  </details>
                ))}
              </Card>
            )
          ) : p.status === 'approved' ? (
            <Card>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-white/55">{researching ? 'Researching now: website, Instagram and LinkedIn. Refresh in a minute.' : p.researchError ? `Research failed: ${p.researchError}` : 'Approved, waiting for research.'}</p>
                {!researching && <ActionForm action={researchNow}><input type="hidden" name="id" value={p.id} /><button className="rounded-full bg-white text-black px-3 py-1.5 text-xs font-medium">{p.researchError ? 'Try again' : 'Research now'}</button></ActionForm>}
              </div>
            </Card>
          ) : <Card><Empty>No drafts yet. Approve the firm and research starts straight away.</Empty></Card>}

          {reportable && (
            <>
              <SectionTitle>Leak report</SectionTitle>
              <Card><ReportPanel id={p.id} report={report} site={FUNNEL.site} /></Card>
            </>
          )}
        </div>

        <div className="flex flex-col gap-3 min-w-0">
          <SectionTitle>Research</SectionTitle>
          <Card>
            {r ? (
              <dl className="grid grid-cols-[96px_1fr] gap-x-3 gap-y-2 text-[13px]">
                {([
                  ['Owner', r.owner], ['Team', r.team], ['Type', [r.segment, r.fullService === undefined ? undefined : r.fullService ? 'full-service' : 'not full-service'].filter(Boolean).join(', ')],
                  ['Portfolio', r.portfolio], ['Enquiries', r.enquiryPath], ['The gap', r.gap], ['Minimum', r.minimum],
                  ['Instagram', [r.igFollowers ? `${r.igFollowers.toLocaleString('en-GB')} followers` : '', r.igLastPost ? `last post ${r.igLastPost}` : ''].filter(Boolean).join(' · ')],
                  ['Detail', r.detail],
                ] as const).filter(([, v]) => v).map(([k, v]) => (
                  <Fragment key={k}><dt className="text-white/40">{k}</dt><dd className="text-white/80">{v}</dd></Fragment>
                ))}
              </dl>
            ) : <><p className="text-sm text-white/45">{p.fitWhy.join(' · ')}</p><p className="text-xs text-white/35 mt-2">{p.status === 'new' ? 'Research starts when you approve the firm.' : p.status === 'approved' ? (researching ? 'Research is running now.' : p.researchError ? 'Research failed; try again above.' : 'Waiting for research.') : p.status === 'rejected' ? 'Skipped, so no research was done.' : 'No research on file for this firm.'}</p></>}
            {p.drafts?.dossier && <p className="text-xs text-white/45 mt-3 border-t border-white/[0.05] pt-3">{p.drafts.dossier}</p>}
          </Card>

          {posts.length > 0 && (
            <>
              <SectionTitle>Their latest posts</SectionTitle>
              <Card>
                <ul className="flex flex-col gap-3">
                  {posts.map((post) => (
                    <li key={post.url} className="flex flex-col gap-1">
                      <a href={post.url} {...linkProps} className="text-xs text-[#ff8a6d] hover:underline">Open post ↗{post.at ? ` · ${ago(post.at)}` : ''}</a>
                      {post.caption && <p className="text-[11px] text-white/45 line-clamp-2">{post.caption}</p>}
                      {post.comment && <div className="flex flex-wrap items-center gap-2"><p className="text-[12.5px] text-white/80">“{post.comment}”</p><CopyText text={post.comment} label="Copy comment" /></div>}
                    </li>
                  ))}
                </ul>
              </Card>
            </>
          )}
        </div>
      </div>
    </>
  );
}
