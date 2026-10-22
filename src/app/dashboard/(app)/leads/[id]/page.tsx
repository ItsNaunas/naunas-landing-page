import { notFound } from 'next/navigation';
import { leadProfile } from '@/lib/ops/more';
import { SOURCE_LABEL } from '@/lib/ops/common';
import { hubspotUrl } from '@/lib/hubspot';
import { FUNNEL } from '@/config/funnel';
import { Card, Badge, Empty, Errors, gbp, ago, linkProps } from '@/components/dashboard/ui';
import { Field, when, SectionError, errFor } from '@/components/dashboard/kit';
import { setLeadOutreachStatus, leadSequence } from '../../../actions';
import { ReplyBox, NoteBox, StageControl } from './LeadClient';
import { getProspects, CHANNEL_LABEL, type Prospect } from '@/lib/outreach';
import { demoOn } from '@/lib/ops/demo';
import { proposalsFor, STATUS_LABEL } from '@/lib/proposal';
import { Timeline } from '../../outreach/FirmTimeline';
import { ReplyPanel } from '../../outreach/firm/[id]/ReplyPanel';
import { ReportPanel } from '../../outreach/firm/[id]/ReportPanel';
import { getReport } from '@/lib/leakReport';
import { aiReady } from '@/lib/ai';
import { newProposal } from '../../../actions';

export const dynamic = 'force-dynamic';

const TABS = [['overview', 'Overview'], ['emails', 'Emails'], ['calls', 'Calls'], ['timeline', 'Timeline']] as const;
const TL_ICON: Record<string, string> = { note: '✎', booking: '◷', payment: '£', created: '✦', email: '✉' };
const TONE: Record<string, string> = {
  bad: 'border-rose-400/30 bg-rose-400/[0.07]', accent: 'border-[#F2613F]/30 bg-[#F2613F]/[0.07]',
  good: 'border-emerald-400/25 bg-emerald-400/[0.06]', neutral: 'border-white/10 bg-white/[0.03]',
};
const OUTREACH = [['emailed', 'Emailed'], ['followed_up', 'Followed up'], ['replied', 'Replied'], ['interested', 'Interested'], ['audit_booked', 'Audit booked'], ['not_interested', 'Not interested'], ['out_of_office', 'Out of office'], ['bounced', 'Bounced'], ['finished', 'Sequence finished']];
const PRIORITY: Record<string, { label: string; tone: 'accent' | 'neutral' | 'muted' }> = {
  high: { label: 'High value', tone: 'accent' }, normal: { label: 'Normal', tone: 'neutral' }, small: { label: 'Small', tone: 'muted' },
};

function Prose({ text }: { text: string }) {
  return (
    <div className="flex flex-col gap-2 text-sm leading-relaxed text-white/80">
      {text.split(/\n{2,}/).map((para, i) => {
        const lines = para.split('\n');
        const isItem = (l: string) => /^\s*([-•*]|\d+[.)])\s+/.test(l);
        if (lines.length > 1 && /:\s*$/.test(lines[0]) && lines.slice(1).every(isItem)) {
          return (
            <div key={i}>
              <p className="text-xs font-semibold uppercase tracking-[0.06em] text-white/60 pt-1 mb-1.5">{lines[0].replace(/:\s*$/, '')}</p>
              <ul className="list-disc pl-5 flex flex-col gap-1">{lines.slice(1).map((l, j) => <li key={j}>{l.replace(/^\s*([-•*]|\d+[.)])\s+/, '').replace(/\*\*/g, '')}</li>)}</ul>
            </div>
          );
        }
        if (lines.every((l) => /^\s*([-•*]|\d+[.)])\s+/.test(l))) {
          return <ul key={i} className="list-disc pl-5 flex flex-col gap-1">{lines.map((l, j) => <li key={j}>{l.replace(/^\s*([-•*]|\d+[.)])\s+/, '').replace(/\*\*/g, '')}</li>)}</ul>;
        }
        if (/^#+\s/.test(para) || (lines.length === 1 && para.length < 60 && !/[.?!]$/.test(para))) {
          return <p key={i} className="text-xs font-semibold uppercase tracking-[0.06em] text-white/60 pt-1">{para.replace(/^#+\s*/, '').replace(/\*\*/g, '')}</p>;
        }
        return <p key={i} className="whitespace-pre-wrap">{para.replace(/\*\*/g, '')}</p>;
      })}
    </div>
  );
}

export default async function LeadPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { id } = await params;
  const tab = (await searchParams).tab ?? 'overview';
  const { errors, profile: p } = await leadProfile(id);
  if (!p) notFound();
  const href = (t: string) => `/dashboard/leads/${id}${t === 'overview' ? '' : `?tab=${t}`}`;
  const groups = p.email_status?.groups ?? [];
  // The cold-outreach firm behind this contact, if any (research, channel, leak report, firm page).
  const firm = demoOn() ? undefined : (await getProspects().catch(() => [] as Prospect[])).find((x) => x.contactId === id);
  const proposals = demoOn() ? [] : await proposalsFor(id, p.deal?.id).catch(() => []);
  const report = firm?.reportToken ? await getReport(firm.reportToken).catch(() => null) : null;

  return (
    <>
      <a href="/dashboard/leads" className="text-sm text-white/60 hover:text-white -mb-2">← All leads</a>
      <Errors errors={errors} />

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <div className="size-14 shrink-0 rounded-2xl bg-gradient-to-br from-[#F2613F] to-[#8a2a12] grid place-items-center text-xl font-semibold" style={{ fontFamily: 'var(--font-display)' }} aria-hidden>
            {p.name.replace(/^@/, '').slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl md:text-[28px] font-semibold tracking-tight truncate" style={{ fontFamily: 'var(--font-display)' }}>{p.name}</h1>
            <p className="text-sm text-white/65 truncate">{[p.business, p.website?.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')].filter(Boolean).join(' · ') || p.email}</p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              <Badge tone={p.deal?.stage === '6213348572' ? 'good' : p.deal ? 'accent' : 'muted'}>{p.stageLabel}{p.deal?.amount ? ` · ${gbp(p.deal.amount)}` : ''}</Badge>
              {p.priority && PRIORITY[p.priority] && <Badge tone={PRIORITY[p.priority].tone}>{PRIORITY[p.priority].label}</Badge>}
              {p.source && <Badge>{SOURCE_LABEL[p.source] ?? p.source}</Badge>}
              {p.idle > 0 && <Badge tone={p.idle >= 7 ? 'bad' : 'muted'}>Quiet {p.idle}d</Badge>}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {p.email && <a href={href('emails')} className="rounded-full bg-white text-black text-sm font-medium px-4 py-2">Email</a>}
          {p.ig && <a href={`https://instagram.com/${p.ig}`} {...linkProps} className="rounded-full border border-white/15 text-sm px-4 py-2 hover:border-white/30">Instagram ↗</a>}
          {p.website && <a href={/^https?:/.test(p.website) ? p.website : `https://${p.website}`} {...linkProps} className="rounded-full border border-white/15 text-sm px-4 py-2 hover:border-white/30">Website ↗</a>}
          <a href={hubspotUrl.contact(p.id)} {...linkProps} className="rounded-full border border-white/15 text-sm px-4 py-2 hover:border-white/30">HubSpot ↗</a>
        </div>
      </div>

      {/* Journey */}
      <ol className="grid grid-cols-3 sm:grid-cols-6 gap-2" aria-label="Journey">
        {p.journey.map((j, i) => (
          <li key={j.label} className={`rounded-xl border px-3 py-2.5 ${j.done ? 'border-[#F2613F]/30 bg-[#F2613F]/[0.07]' : 'border-white/[0.06] bg-white/[0.02]'}`}>
            <p className={`text-[11px] ${j.done ? 'text-[#ff8a6d]' : 'text-white/55'}`}>{j.done ? '✓' : i + 1} · {j.done ? 'Done' : 'Not yet'}</p>
            <p className={`text-[13px] font-medium ${j.done ? 'text-white' : 'text-white/60'}`}>{j.label}</p>
            {j.at && <p className="text-[11px] text-white/55">{when(j.at).split(',')[0]}</p>}
          </li>
        ))}
      </ol>

      {p.next && (
        <div className={`rounded-2xl border px-5 py-4 flex flex-wrap items-center justify-between gap-3 ${TONE[p.next.tone]}`}>
          <div>
            <p className="text-[11px] uppercase tracking-[0.1em] text-white/60">Next step</p>
            <p className="font-semibold mt-0.5">{p.next.title}</p>
            <p className="text-sm text-white/60">{p.next.why}</p>
          </div>
          {p.waiting && <a href={href('emails')} className="rounded-full bg-white text-black text-sm font-medium px-4 py-2">Reply now</a>}
        </div>
      )}

      <div className="grid lg:grid-cols-[1fr_320px] gap-4 items-start">
        <div className="flex flex-col gap-4 min-w-0">
          <nav className="flex gap-1 border-b border-white/[0.07]" aria-label="Lead sections">
            {TABS.map(([t, label]) => (
              <a key={t} href={href(t)} aria-current={tab === t ? 'page' : undefined}
                className={`px-4 py-2.5 text-sm -mb-px border-b-2 transition-colors ${tab === t ? 'border-[#F2613F] text-white' : 'border-transparent text-white/65 hover:text-white'}`}>
                {label}{t === 'emails' && p.thread.length ? <span className="text-white/55"> {p.thread.length}</span> : null}{t === 'calls' && p.meetings.length ? <span className="text-white/55"> {p.meetings.length}</span> : null}
              </a>
            ))}
          </nav>

          {tab === 'overview' && (
            <>
              {firm && (
                <Card title="From cold outreach" action={<a href={`/dashboard/outreach/firm/${encodeURIComponent(firm.id)}`} className="text-xs text-white/65 hover:text-white">Firm page ›</a>}>
                  <dl className="grid grid-cols-[110px_1fr] gap-x-3 gap-y-1.5 text-[13px]">
                    {([['Firm', firm.firm], ['Channel', firm.channel ? CHANNEL_LABEL[firm.channel] : undefined], ['Opener', firm.dmStyle], ['The gap', firm.drafts?.research?.gap], ['Detail', firm.drafts?.research?.detail]] as const).filter(([, v]) => v).map(([k, v]) => (
                      <div key={k} className="contents"><dt className="text-white/60">{k}</dt><dd className="text-white/80">{v}</dd></div>
                    ))}
                  </dl>
                  <div className="mt-3 pt-3 border-t border-white/[0.06]"><Timeline p={firm} /></div>
                </Card>
              )}
              {firm && (
                <Card title="Reply to them"><ReplyPanel id={firm.id} channel={firm.channel ? CHANNEL_LABEL[firm.channel] : 'Instagram'} ai={aiReady()} /></Card>
              )}
              {firm?.website && (
                <Card title="Leak report"><ReportPanel id={firm.id} report={report} site={FUNNEL.site} /></Card>
              )}
              {p.notWorking && (
                <Card title="In their words">
                  <blockquote className="border-l-2 border-[#F2613F] pl-4 text-base leading-relaxed text-white/85 whitespace-pre-wrap">{p.notWorking}</blockquote>
                </Card>
              )}
              <Card title="Research brief" action={!p.brief ? <Badge tone="muted">Written the minute they book</Badge> : undefined}>
                {p.brief ? <Prose text={p.brief} /> : <Empty>When they book, their website is researched and the brief (leaks, questions, quick win) lands here and on the deal.</Empty>}
              </Card>
              {p.meetings[0] && (
                <Card title={`Last call · ${when(p.meetings[0].at)}`} action={<a href={p.meetings[0].url} {...linkProps} className="text-xs text-white/65 hover:text-white">Watch ↗</a>}>
                  {p.meetings[0].summary ? <Prose text={p.meetings[0].summary} /> : <p className="text-sm text-white/60">No summary yet.</p>}
                </Card>
              )}
              <Card title="Details">
                <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-4">
                  <Field label="Email">{p.email}</Field>
                  <Field label="Business">{p.business}</Field>
                  <Field label="Client value">{p.clientValue}</Field>
                  <Field label="Monthly revenue">{p.revenue}</Field>
                  <Field label="First touch">{p.firstTouch}</Field>
                  <Field label="Instagram campaign">{p.campaign}</Field>
                  <Field label="Came from post">{p.post && <a href={p.post} {...linkProps} className="hover:text-[#F2613F]">Open post ↗</a>}</Field>
                  <Field label="Deal">{p.deal && <a href={hubspotUrl.deal(p.deal.id)} {...linkProps} className="hover:text-[#F2613F]">{p.deal.name} ↗</a>}</Field>
                </dl>
              </Card>
              {p.answers && (
                <Card title="What they told us"><Prose text={p.answers} /></Card>
              )}
            </>
          )}

          {tab === 'emails' && (
            <>
              <SectionError errors={errFor(errors, 'Email thread')} />
              {!p.connected.inbox && <Card><Empty>Turn on IMAP in Zoho Mail (Settings → Mail Accounts → IMAP Access) to see the thread here.</Empty></Card>}
              {p.thread.length > 0 && (
                <ol className="flex flex-col gap-3">
                  {p.thread.map((m) => {
                    const mine = m.folder === 'sent';
                    return (
                      <li key={`${m.folder}-${m.uid}`} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${mine ? 'bg-[#F2613F]/12 border border-[#F2613F]/25 rounded-br-md' : 'bg-[#181818] border border-white/[0.07] rounded-bl-md'}`}>
                          <p className="text-[11px] text-white/60 mb-1">{mine ? 'You' : (m.fromName || m.from)} · {when(m.date)}</p>
                          <p className="text-[11px] text-white/55 mb-2 truncate">{m.subject}</p>
                          <p className="text-sm leading-relaxed text-white/85 whitespace-pre-wrap break-words">{m.text || '(no text)'}</p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
              {p.connected.inbox && !p.thread.length && <p className="text-sm text-white/60">No emails with {p.email || 'them'} in the last 6 months.</p>}
              <ReplyBox to={p.email} name={p.name} contactId={p.id} dealId={p.deal?.id}
                subject={p.lastInbound ? (/^re:/i.test(p.lastInbound.subject) ? p.lastInbound.subject : `Re: ${p.lastInbound.subject}`) : ''}
                inReplyTo={p.lastInbound?.messageId} references={p.lastInbound?.references} />
            </>
          )}

          {tab === 'calls' && (
            <>
              <SectionError errors={errFor(errors, 'Fathom', 'Cal.com')} />
              {p.meetings.length ? p.meetings.map((m, i) => (
                <Card key={i} title={`${m.title} · ${when(m.at)}`} action={<a href={m.url} {...linkProps} className="rounded-full bg-white text-black text-xs font-medium px-3 py-1.5">Watch recording</a>}>
                  {m.summary && <Prose text={m.summary} />}
                  {m.actions.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-white/[0.06]">
                      <p className="text-xs font-semibold uppercase tracking-[0.06em] text-white/60 mb-2">Action items</p>
                      <ul className="flex flex-col gap-1.5 text-[13px] text-white/80">{m.actions.map((a, j) => <li key={j} className="flex gap-2"><span className="text-[#F2613F]">☐</span>{a}</li>)}</ul>
                    </div>
                  )}
                </Card>
              )) : <Card><Empty>{p.connected.fathom ? 'No recorded calls with them yet. Recordings appear here (and on Telegram) when Fathom finishes processing.' : 'Connect Fathom to see call recordings here.'}</Empty></Card>}
              {p.timeline.filter((t) => t.kind === 'booking').length > 0 && (
                <Card title="Bookings">
                  <ul className="flex flex-col gap-2 text-[13px]">{p.timeline.filter((t) => t.kind === 'booking').map((b, i) => <li key={i} className="flex justify-between gap-3"><span>{b.title}</span><span className="text-white/60">{when(b.at)}</span></li>)}</ul>
                </Card>
              )}
            </>
          )}

          {tab === 'timeline' && (
            <Card>
              {p.timeline.length ? (
                <ol className="relative border-l border-white/10 ml-3.5 flex flex-col gap-5">
                  {p.timeline.map((t, i) => (
                    <li key={i} className="pl-6 relative">
                      <span className="absolute -left-3.5 top-0 size-7 rounded-lg bg-[#1b1b1b] border border-white/10 grid place-items-center text-[12px] text-white/60" aria-hidden>{TL_ICON[t.kind] ?? '•'}</span>
                      <p className="text-[13px] text-white/90">{t.title}</p>
                      <p className="text-[11px] text-white/55">{when(t.at)} · {ago(t.at)}</p>
                      {t.body && t.body !== t.title && (
                        <details className="mt-1.5">
                          <summary className="cursor-pointer text-xs text-white/60 hover:text-white">Show</summary>
                          <div className="mt-2 rounded-lg bg-white/[0.03] p-3"><Prose text={t.body} /></div>
                        </details>
                      )}
                    </li>
                  ))}
                </ol>
              ) : <Empty>No history yet.</Empty>}
            </Card>
          )}
        </div>

        {/* Side panel: work the lead */}
        <aside className="flex flex-col gap-4 lg:sticky lg:top-20">
          {p.deal ? (
            <Card title="Deal stage" action={<a href={hubspotUrl.deal(p.deal.id)} {...linkProps} className="text-xs text-white/60 hover:text-white">Deal ↗</a>}>
              <StageControl dealId={p.deal.id} stage={p.deal.stage} />
            </Card>
          ) : <Card title="Deal stage"><p className="text-sm text-white/60">No deal yet. One is created when they qualify, book, or reply with interest.</p></Card>}

          {p.source === 'cold_email' && (
            <Card title="Outreach status">
              <form action={setLeadOutreachStatus} className="flex gap-2">
                <input type="hidden" name="contactId" value={p.id} />
                <select name="status" className="flex-1 rounded-lg bg-[#0C0C0C] border border-white/10 px-3 py-2 text-sm" aria-label="Outreach status" defaultValue="">
                  <option value="" disabled>Set status…</option>
                  {OUTREACH.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                <button className="rounded-full border border-white/15 px-3 text-xs hover:border-white/30">Save</button>
              </form>
            </Card>
          )}

          {p.email && (
            <Card title="Email sequences">
              {p.email_status ? (
                <div className="flex flex-col gap-2">
                  <p className="text-xs text-white/60">{p.email_status.opens} opens · {p.email_status.clicks} clicks · {p.email_status.status}</p>
                  {groups.length ? groups.map((g) => (
                    <form key={g} action={leadSequence} className="flex items-center justify-between gap-2 text-[13px]">
                      <input type="hidden" name="email" value={p.email} /><input type="hidden" name="group" value={g} /><input type="hidden" name="op" value="remove" />
                      <span className="text-white/80">{g}</span>
                      <button className="text-xs text-white/60 hover:text-rose-300">Take out</button>
                    </form>
                  )) : <p className="text-[13px] text-white/60">Not in any sequence.</p>}
                  {!groups.includes(FUNNEL.mailerlite.groups.newsletter) && (
                    <form action={leadSequence}>
                      <input type="hidden" name="email" value={p.email} /><input type="hidden" name="name" value={p.name} />
                      <input type="hidden" name="group" value={FUNNEL.mailerlite.groups.newsletter} /><input type="hidden" name="op" value="add" />
                      <button className="text-xs text-[#ff8a6d] hover:text-white mt-1">+ Add to newsletter</button>
                    </form>
                  )}
                </div>
              ) : <p className="text-[13px] text-white/60">Not in MailerLite.</p>}
            </Card>
          )}

          <Card title="Proposal" action={proposals.length ? <Badge tone={proposals[0].status === 'paid' || proposals[0].status === 'accepted' ? 'good' : proposals[0].status === 'draft' ? 'muted' : 'accent'}>{STATUS_LABEL[proposals[0].status]}</Badge> : undefined}>
            {proposals.length > 0 && (
              <ul className="flex flex-col gap-1.5 text-[13px] mb-3">
                {proposals.map((r) => <li key={r.token} className="flex items-center justify-between gap-2"><a href={`/dashboard/pipeline/proposal/${r.token}`} className="truncate hover:text-[#F2613F]">{r.title}</a><span className="text-xs text-white/60 shrink-0">{STATUS_LABEL[r.status]}</span></li>)}
              </ul>
            )}
            <form action={newProposal} className="flex flex-col gap-2">
              <input type="hidden" name="contactId" value={p.id} /><input type="hidden" name="dealId" value={p.deal?.id ?? ''} />
              <input type="hidden" name="client" value={p.business || p.name} /><input type="hidden" name="firstName" value={p.name.replace(/^@/, '').split(' ')[0]} />
              <input type="hidden" name="business" value={p.business} /><input type="hidden" name="email" value={p.email} />
              <button className="rounded-full bg-white text-black text-xs font-medium px-3 py-1.5 self-start">{proposals.length ? '+ Another proposal' : 'New proposal'}</button>
              <p className="text-[11px] text-white/60">One link: scope, price, accept by name, deposit via Stripe. Drafted from the brief and call notes.</p>
            </form>
          </Card>

          <Card title="Add a note"><NoteBox contactId={p.id} dealId={p.deal?.id} /></Card>

          {p.email && (
            <Card title="Booking link">
              <p className="text-xs text-white/60 break-all">{`cal.com/${FUNNEL.cal.link}?email=${p.email}`}</p>
              <a href={`https://cal.com/${FUNNEL.cal.link}?email=${encodeURIComponent(p.email)}&name=${encodeURIComponent(p.name)}`} {...linkProps} className="text-xs text-[#ff8a6d] hover:text-white">Open pre-filled ↗</a>
            </Card>
          )}
        </aside>
      </div>
    </>
  );
}
