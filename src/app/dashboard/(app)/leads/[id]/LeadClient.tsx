'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { sendLeadEmail, addLeadNote, moveDealStage, draftEmailReply, type SaveState } from '../../../actions';

const input = 'w-full rounded-lg bg-[#0C0C0C] border border-white/10 px-3 py-2.5 text-sm text-white outline-none focus:border-[#F2613F] placeholder:text-white/25';
const btn = 'rounded-full bg-[#F2613F] hover:bg-[#ff7656] text-[#0C0C0C] text-sm font-semibold px-4 py-2 disabled:opacity-40';

/** Reply / compose from contact@. Only sends when Naufal presses Send. */
export function ReplyBox({ to, name, contactId, dealId, subject, inReplyTo, references }: {
  to: string; name: string; contactId: string; dealId?: string; subject: string; inReplyTo?: string; references?: string[];
}) {
  const [state, action, pending] = useActionState<SaveState, FormData>(sendLeadEmail, null);
  const ref = useRef<HTMLFormElement>(null);
  const [confirm, setConfirm] = useState(false);
  const [text, setText] = useState('');
  const [drafting, setDrafting] = useState<string | null>(null);
  useEffect(() => { if (state?.savedAt) { ref.current?.reset(); setText(''); setConfirm(false); } }, [state?.savedAt]);
  async function draft() {
    setDrafting('Writing…');
    const r = await draftEmailReply(contactId);
    setDrafting(r.error ?? null);
    if (r.text) setText(r.text);
  }
  if (!to) return <p className="text-sm text-white/40">No email address on this lead yet.</p>;
  return (
    <form ref={ref} action={action} className="flex flex-col gap-3 rounded-2xl border border-white/[0.08] bg-[#151515] p-4">
      {[['to', to], ['name', name], ['contactId', contactId], ['dealId', dealId ?? ''], ['inReplyTo', inReplyTo ?? ''], ['references', (references ?? []).join(' ')]].map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <div className="flex items-center gap-2 text-xs text-white/45">
        <span>From contact@naunas.co.uk to</span><span className="text-white/80">{to}</span>
      </div>
      <input name="subject" defaultValue={subject} className={input} aria-label="Subject" />
      <textarea name="text" rows={6} required placeholder={`Hi ${name.split(' ')[0]},`} className={`${input} resize-y`} aria-label="Message" value={text} onChange={(e) => setText(e.target.value)} />
      <div className="flex items-center gap-3 text-xs"><button type="button" onClick={draft} disabled={drafting === 'Writing…'} className="text-white/60 hover:text-white disabled:opacity-50">✦ Draft with AI from their last email</button>{drafting && drafting !== 'Writing…' && <span className="text-rose-300">{drafting}</span>}{drafting === 'Writing…' && <span className="text-white/40">Writing…</span>}</div>
      {state?.error && <p className="text-sm text-rose-300" role="alert">{state.error}</p>}
      {state?.savedAt && <p className="text-sm text-emerald-300" role="status">Sent ✓ and logged in HubSpot.</p>}
      <div className="flex items-center justify-end gap-3">
        {confirm ? (
          <>
            <span className="text-xs text-white/50">Send this email now?</span>
            <button type="button" onClick={() => setConfirm(false)} className="text-sm text-white/50 hover:text-white">Cancel</button>
            <button disabled={pending} className={btn}>{pending ? 'Sending…' : 'Yes, send'}</button>
          </>
        ) : <button type="button" onClick={() => setConfirm(true)} className={btn}>Send</button>}
      </div>
    </form>
  );
}

export function NoteBox({ contactId, dealId }: { contactId: string; dealId?: string }) {
  const [state, action, pending] = useActionState<SaveState, FormData>(addLeadNote, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state?.savedAt) ref.current?.reset(); }, [state?.savedAt]);
  return (
    <form ref={ref} action={action} className="flex flex-col gap-2">
      <input type="hidden" name="contactId" value={contactId} />
      <input type="hidden" name="dealId" value={dealId ?? ''} />
      <textarea name="text" rows={3} placeholder="Add a note (saves to HubSpot)…" className={`${input} resize-y`} aria-label="Note" />
      {state?.error && <p className="text-xs text-rose-300">{state.error}</p>}
      <div className="flex items-center justify-between">
        <span className="text-xs text-emerald-300">{state?.savedAt ? 'Saved ✓' : ''}</span>
        <button disabled={pending} className="rounded-full border border-white/15 px-3 py-1.5 text-xs hover:border-white/30 disabled:opacity-40">{pending ? 'Saving…' : 'Save note'}</button>
      </div>
    </form>
  );
}

const STAGES: [string, string][] = [
  ['6213348567', 'New enquiry'], ['6213348568', 'Contacted'], ['6213348569', 'Audit booked'], ['6213348570', 'Audit done'],
  ['6213348571', 'Scope sent'], ['6213348572', 'Won'], ['6213348573', 'Lost'],
];
const LOST = [['price', 'Price'], ['timing', 'Timing'], ['competitor', 'Went elsewhere'], ['diy', 'DIY'], ['no_fit', 'Not a fit'], ['ghosted', 'Went quiet'], ['other', 'Other']];

export function StageControl({ dealId, stage }: { dealId: string; stage: string }) {
  const [value, setValue] = useState(stage);
  return (
    <form action={moveDealStage} className="flex flex-col gap-2">
      <input type="hidden" name="dealId" value={dealId} />
      <div className="grid grid-cols-2 gap-1.5">
        {STAGES.map(([id, label]) => (
          <label key={id} className={`cursor-pointer rounded-lg border px-2.5 py-1.5 text-xs text-center transition-colors ${value === id ? 'border-[#F2613F] bg-[#F2613F]/10 text-white' : 'border-white/10 text-white/55 hover:border-white/25'}`}>
            <input type="radio" name="stage" value={id} checked={value === id} onChange={() => setValue(id)} className="sr-only" />{label}
          </label>
        ))}
      </div>
      {value === '6213348573' && (
        <select name="lostReason" className={input} defaultValue="" aria-label="Lost reason" required>
          <option value="" disabled>Why was it lost?</option>
          {LOST.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      )}
      {value !== stage && <button className={btn}>Move to {STAGES.find(([id]) => id === value)?.[1]}</button>}
    </form>
  );
}
