'use client';

import { useActionState } from 'react';
import { draftFirmReply, type DraftState } from '@/app/dashboard/actions';
import { CopyText } from '../../OutreachClient';

const field = 'w-full rounded-lg bg-white/[0.04] border border-white/10 px-3 py-2 text-[13px] text-white placeholder:text-white/50';

/** Paste what they said, get a reply in Naufal's voice, copy it into the chat. Nothing is sent from here. */
export function ReplyPanel({ id, channel, ai }: { id: string; channel: string; ai: boolean }) {
  const [state, action, pending] = useActionState<DraftState, FormData>(draftFirmReply, null);
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="id" value={id} />
      <textarea name="theirMessage" rows={3} required placeholder={`Paste what they said on ${channel}…`} className={field} aria-label="What they said" defaultValue={state?.theirMessage ?? ''} />
      <div className="flex flex-wrap items-center gap-3">
        <button disabled={pending || !ai} className="rounded-full bg-white text-black px-3 py-1.5 text-xs font-medium disabled:opacity-50">{pending ? 'Writing…' : ai ? 'Draft my reply' : 'Connect OpenAI to draft'}</button>
        <span className="text-[11px] text-white/60">Answers what they said, then one small step towards the call. You send it.</span>
      </div>
      {state?.error && <p className="text-xs text-rose-300" role="alert">{state.error}</p>}
      {state?.reply && (
        <div className="flex flex-col gap-2">
          <p className="text-[13px] text-white/85 rounded-lg bg-white/[0.03] border border-white/[0.06] p-3 whitespace-pre-wrap">{state.reply}</p>
          <div className="flex gap-3 items-center"><CopyText text={state.reply} label="Copy reply" /><span className="text-[11px] text-white/60">Edit it before you send if it doesn’t sound like you.</span></div>
        </div>
      )}
    </form>
  );
}
