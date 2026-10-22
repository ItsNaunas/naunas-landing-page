'use client';

import { useActionState, useState } from 'react';
import { startProspectSearch, saveProspectDrafts, type SaveState } from '../../actions';
import type { Prospect } from '@/lib/outreach';

const input = 'w-full rounded-lg bg-[#0C0C0C] border border-white/10 px-3 py-2.5 text-sm text-white outline-none focus:border-[#F2613F] placeholder:text-white/50';
const btn = 'rounded-full bg-[#F2613F] hover:bg-[#ff7553] text-[#0C0C0C] text-sm font-semibold px-4 py-2 disabled:opacity-40';

export function SearchForm({ disabled }: { disabled?: boolean }) {
  const [state, action, pending] = useActionState<SaveState, FormData>(startProspectSearch, null);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-[1.2fr_1.2fr_90px_auto] items-end">
      <label className="flex flex-col gap-1.5 text-xs text-white/60">What
        <input name="term" defaultValue="interior designer" required className={input} />
      </label>
      <label className="flex flex-col gap-1.5 text-xs text-white/60">Where
        <input name="location" placeholder="Nashville, TN, USA" required className={input} />
      </label>
      <label className="flex flex-col gap-1.5 text-xs text-white/60">How many
        <input name="max" type="number" min={5} max={100} defaultValue={30} className={input} />
      </label>
      <button disabled={pending || disabled} className={btn}>{pending ? 'Starting…' : 'Find prospects'}</button>
      {state?.error && <p className="sm:col-span-4 text-sm text-rose-300" role="alert">{state.error}</p>}
      {state?.savedAt && <p className="sm:col-span-4 text-sm text-emerald-300" role="status">Search started. Results land in “To review” in 1–3 minutes (press Refresh).</p>}
    </form>
  );
}

/** Review/edit the routine's drafts for one prospect, then schedule (E1 goes in the next daily send). */
const CH_LABEL = { instagram: 'Instagram', linkedin: 'LinkedIn', email: 'Email' } as const;
type Ch = keyof typeof CH_LABEL;

export function DraftEditor({ p, options = [], suggested = null, defaultOpen = false }: { p: Prospect; options?: Ch[]; suggested?: Ch | null; defaultOpen?: boolean }) {
  const [state, action, pending] = useActionState<SaveState, FormData>(saveProspectDrafts, null);
  const [open, setOpen] = useState(defaultOpen);
  const d = p.drafts;
  const labels = ['E1 · day 0 · first email', 'E2 · day 3 · new angle', 'E3 · day 7 · offer the teardown', 'E4 · day 14 · close the loop'];
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#141414]">
      <button type="button" onClick={() => setOpen((o) => !o)} className="w-full text-left px-5 py-4 flex flex-wrap items-center justify-between gap-3" aria-expanded={open}>
        <span className="min-w-0">
          <span className="block font-medium">{p.firm} <span className="text-white/55 text-xs font-normal">· {[p.city, p.state].filter(Boolean).join(', ')}</span></span>
          {d?.dossier && <span className="block text-xs text-white/65 mt-1">{d.dossier}</span>}
          {d?.subject && <span className="block text-xs text-[#ff8a6d] mt-1">Subject: {d.subject}</span>}
          {d?.research && (
            <span className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-white/60">
              {d.research.owner && <span>Owner: <b className="text-white/70 font-normal">{d.research.owner}</b></span>}
              {d.research.team && <span>Team: {d.research.team}</span>}
              {d.research.segment && <span>{d.research.segment}</span>}
              {d.research.fullService !== undefined && <span>{d.research.fullService ? 'Full-service' : 'Not full-service'}</span>}
              {d.research.igLastPost && <span>IG last post: {d.research.igLastPost}</span>}
              {d.research.minimum && <span>Minimum: {d.research.minimum}</span>}
              {d.research.ownerLinkedin && <span>LinkedIn found</span>}
              {d.research.gap && <span className="basis-full text-white/60">Gap: {d.research.gap}</span>}
            </span>
          )}
        </span>
        <span className="text-xs text-white/60">{open ? 'Close' : 'Review & start →'}</span>
      </button>
      {open && (
        <form action={action} className="px-5 pb-5 flex flex-col gap-3 border-t border-white/[0.06] pt-4">
          <input type="hidden" name="id" value={p.id} />
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5 text-xs text-white/60">Their email
              <input name="email" type="email" defaultValue={p.email} placeholder="name@studio.com" className={input} />
            </label>
            <label className="flex flex-col gap-1.5 text-xs text-white/60">First name (if known)
              <input name="firstName" defaultValue={d?.firstName} className={input} />
            </label>
          </div>
          <label className="flex flex-col gap-1.5 text-xs text-white/60">Subject (E2–E4 reply in the same thread)
            <input name="subject" defaultValue={d?.subject} required className={input} />
          </label>
          {labels.map((l, i) => (
            <label key={l} className="flex flex-col gap-1.5 text-xs text-white/60">{l}
              <textarea name={`step${i}`} rows={i === 0 ? 6 : 4} defaultValue={d?.steps[i]} className={`${input} resize-y`} />
            </label>
          ))}
          <label className="flex flex-col gap-1.5 text-xs text-white/60">Instagram DM opener (you send this by hand)
            <textarea name="dm" rows={3} defaultValue={d?.dm} className={`${input} resize-y`} />
          </label>
          <p className="text-[11px] text-white/55">The footer “Naunas · naunas.co.uk / Not relevant? Reply "no"…” is added automatically. Sequences stop the moment they reply.</p>
          {state?.error && <p className="text-sm text-rose-300" role="alert">{state.error}</p>}
          {state?.savedAt && <p className="text-sm text-emerald-300" role="status">Saved ✓</p>}
          <fieldset className="flex flex-wrap items-center gap-2">
            <legend className="text-xs text-white/60 mb-1.5">Work this firm on ONE channel (10 different firms per channel a day)</legend>
            {(['instagram', 'linkedin', 'email'] as Ch[]).map((c) => {
              const ok = options.includes(c);
              return (
                <label key={c} className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${ok ? 'border-white/15 cursor-pointer has-[:checked]:border-[#F2613F] has-[:checked]:bg-[#F2613F]/10' : 'border-white/[0.06] text-white/55 cursor-not-allowed'}`}>
                  <input type="radio" name="channel" value={c} defaultChecked={c === suggested} disabled={!ok} className="accent-[#F2613F]" />
                  {CH_LABEL[c]}{c === suggested ? <span className="text-[11px] text-white/60">suggested</span> : null}
                  {!ok && <span className="text-[11px]">{c === 'linkedin' ? 'no profile found' : c === 'email' ? 'no email' : 'no account'}</span>}
                </label>
              );
            })}
          </fieldset>
          <p className="text-[11px] text-white/60">Start outreach puts this firm in that channel’s cadence only: Instagram (warm-up, opener, day 5, day 9), LinkedIn (engage, connect, DM, follow-up) or Email (E1 to E4, sent for you). The suggestion is the channel with the most room left today.</p>
          <div className="flex flex-wrap justify-end gap-2">
            <button name="intent" value="save" disabled={pending} className="rounded-full border border-white/15 px-4 py-2 text-sm hover:border-white/30 disabled:opacity-40">Save draft</button>
            <button name="intent" value="schedule" disabled={pending} className={btn}>Start outreach</button>
          </div>
        </form>
      )}
    </div>
  );
}

export function CopyText({ text, label = 'Copy opener' }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button type="button" onClick={async () => { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); }}
      className="rounded-full border border-white/15 px-3 py-1.5 text-xs hover:border-white/30">{done ? 'Copied ✓' : label}</button>
  );
}
