'use client';

import { useActionState, useEffect, useRef } from 'react';
import { saveProposalEdits, draftProposalAI, type ReportState } from '@/app/dashboard/actions';
import type { Proposal } from '@/lib/proposal';
import { CopyText } from '@/app/dashboard/(app)/outreach/OutreachClient';

const field = 'w-full rounded-lg bg-white/[0.04] border border-white/10 px-3 py-2 text-[13px] text-white';
const label = 'flex flex-col gap-1 text-[11px] text-white/45';

/** Reload after a successful action so the server-rendered page shows the saved proposal (see ActionForm). */
function useReloadOn(state: ReportState) {
  const first = useRef(true);
  useEffect(() => { if (first.current) { first.current = false; return; } if (state?.savedAt) window.location.reload(); }, [state]);
}

export function ProposalEditor({ p, url, ai }: { p: Proposal; url: string; ai: boolean }) {
  const [saved, save, saving] = useActionState<ReportState, FormData>(saveProposalEdits, {});
  const [drafted, draft, drafting] = useActionState<ReportState, FormData>(draftProposalAI, {});
  useReloadOn(saved); useReloadOn(drafted);
  const blocks = [...p.blocks, { title: '', text: '' }];
  const locked = !!p.acceptedAt;

  return (
    <div className="grid lg:grid-cols-[1fr_320px] gap-4 items-start">
      <form action={save} className="flex flex-col gap-4 rounded-2xl border border-white/[0.07] bg-[#121212] p-5">
        <input type="hidden" name="token" value={p.token} />
        {locked && <p className="rounded-lg border border-emerald-400/25 bg-emerald-400/[0.06] px-3 py-2 text-xs text-emerald-200">Accepted, so the scope and price are locked. You can still add or change the deposit link.</p>}
        <label className={label}>Title<input name="title" defaultValue={p.title} className={`${field} text-[15px] font-medium`} disabled={locked} /></label>
        <label className={label}>Intro (2-3 sentences, their problem in their words)<textarea name="intro" defaultValue={p.intro} rows={3} className={field} disabled={locked} /></label>
        <div className="flex flex-col gap-3">
          <p className="text-[11px] text-white/45">Building blocks (what gets built and what changes for them). Empty rows are dropped.</p>
          {blocks.map((b, i) => (
            <fieldset key={i} className="rounded-xl border border-white/[0.08] p-3 flex flex-col gap-2">
              <input name={`b${i}_title`} defaultValue={b.title} placeholder={i === p.blocks.length ? 'Add another block…' : 'Block title'} className={`${field} font-medium`} disabled={locked} aria-label={`Block ${i + 1} title`} />
              <textarea name={`b${i}_text`} defaultValue={b.text} rows={3} className={field} disabled={locked} aria-label={`Block ${i + 1} text`} />
            </fieldset>
          ))}
        </div>
        <label className={label}>Timeline<textarea name="timeline" defaultValue={p.timeline} rows={2} className={field} disabled={locked} /></label>
        <div className="grid sm:grid-cols-2 gap-3">
          <label className={label}>Price (you write this, never the AI)<input name="price" defaultValue={p.price} placeholder="e.g. £4,500 fixed" className={field} disabled={locked} /></label>
          <label className={label}>Deposit to start<input name="deposit" defaultValue={p.deposit} placeholder="e.g. £1,500" className={field} disabled={locked} /></label>
        </div>
        <label className={label}>Stripe Payment Link for the deposit (buy.stripe.com/…; the deal id and their email are added automatically)<input name="paymentLink" defaultValue={p.paymentLink ?? ''} placeholder="https://buy.stripe.com/…" className={field} /></label>
        <div className="grid sm:grid-cols-2 gap-3">
          <label className={label}>Next steps line<input name="nextSteps" defaultValue={p.nextSteps} className={field} disabled={locked} /></label>
          <label className={label}>Open until (optional, free text)<input name="validUntil" defaultValue={p.validUntil ?? ''} placeholder="e.g. 7 November" className={field} disabled={locked} /></label>
        </div>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button name="intent" value="save" disabled={saving} className="rounded-lg border border-white/15 px-4 py-2 text-sm hover:border-white/30 disabled:opacity-50">Save</button>
          {p.published
            ? <button name="intent" value="unpublish" disabled={saving || locked} className="rounded-lg border border-white/15 px-4 py-2 text-sm text-white/60 hover:text-white disabled:opacity-50">Take down</button>
            : <button name="intent" value="publish" disabled={saving} className="rounded-lg bg-white text-black px-4 py-2 text-sm font-medium disabled:opacity-50">Save and publish link</button>}
          {saving && <span className="text-xs text-white/45">Saving…</span>}
          {saved.error && <span className="text-xs text-rose-300">{saved.error}</span>}
        </div>
      </form>

      <aside className="flex flex-col gap-3">
        <div className="rounded-2xl border border-white/[0.07] bg-[#121212] p-4 flex flex-col gap-2">
          <p className="font-medium text-sm">{p.published ? 'Live link' : 'Not published yet'}</p>
          {p.published ? <><p className="text-xs text-white/50 break-all">{url}</p><CopyText text={url} label="Copy link" /></> : <p className="text-xs text-white/50">Publishing notes the link on the HubSpot deal and moves it to Scope sent. Nothing is emailed; you send the link.</p>}
        </div>
        <div className="rounded-2xl border border-white/[0.07] bg-[#121212] p-4 flex flex-col gap-2">
          <p className="font-medium text-sm">Draft with AI</p>
          <p className="text-xs text-white/50">Writes the title, intro, blocks and timeline from this lead’s research brief, booking answers and call notes. Never the price. Replaces what’s in the form.</p>
          <form action={draft}>
            <input type="hidden" name="token" value={p.token} />
            <button disabled={drafting || !ai || locked} className="rounded-lg bg-[#F2613F] px-4 py-2 text-sm font-medium text-white hover:bg-[#ff7553] disabled:opacity-50">{drafting ? 'Writing… (about 20 seconds)' : ai ? 'Draft the scope' : 'Needs OPENAI_API_KEY'}</button>
          </form>
          {drafted.error && <p className="text-xs text-rose-300">{drafted.error}</p>}
        </div>
        <div className="rounded-2xl border border-white/[0.07] bg-[#121212] p-4 text-xs text-white/50 flex flex-col gap-1.5">
          <p className="font-medium text-sm text-white">How it flows</p>
          <p>1. They open the link: counted, noted on the deal, Telegram the first time.</p>
          <p>2. They type their name and accept: noted on the deal, Telegram.</p>
          <p>3. They pay through your Stripe link with the deal id attached: the Stripe webhook marks the deal Won and sends onboarding.</p>
        </div>
      </aside>
    </div>
  );
}
