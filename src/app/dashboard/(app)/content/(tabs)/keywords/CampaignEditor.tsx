'use client';

import { useActionState, useEffect, useState } from 'react';
import { saveCampaign, type SaveState } from '@/app/dashboard/actions';
import type { Campaign } from '@/lib/campaigns';

const input = 'w-full rounded-lg bg-[#0C0C0C] border border-white/10 px-3 py-2.5 text-sm text-white outline-none focus:border-[#F2613F] placeholder:text-white/50';
const NEW_MESSAGE = 'Here you go 👇\n\n{link}\n\nAny questions, just reply here.';

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-white/70">{label}</span>
      {children}
      {hint && <span className="text-[11px] text-white/55">{hint}</span>}
    </label>
  );
}

/** "New campaign" / "Edit" button that opens a slide-over editor with a live DM preview. */
export function CampaignEditor({ campaign, site, disabled }: { campaign?: Campaign; site: string; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<SaveState, FormData>(saveCampaign, null);
  const [name, setName] = useState(campaign?.name ?? '');
  const [message, setMessage] = useState(campaign?.message ?? NEW_MESSAGE);
  const [keywords, setKeywords] = useState(campaign?.keywords.join(', ') ?? '');
  const id = campaign?.id ?? name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
  const firstKeyword = keywords.split(/[,\s]+/).filter(Boolean)[0]?.toUpperCase() || 'KEYWORD';

  useEffect(() => { if (state?.savedAt) setOpen(false); }, [state?.savedAt]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <button type="button" disabled={disabled} onClick={() => setOpen(true)}
        className={campaign
          ? 'text-xs text-white/55 hover:text-white disabled:opacity-30'
          : 'rounded-full bg-[#F2613F] hover:bg-[#ff7553] text-[#0C0C0C] text-sm font-semibold px-4 py-2 disabled:opacity-40'}>
        {campaign ? 'Edit' : '+ New campaign'}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={campaign ? `Edit ${campaign.name}` : 'New campaign'}>
          <button aria-label="Close" className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={() => setOpen(false)} />
          <form action={action} className="relative w-full max-w-[560px] h-full overflow-y-auto bg-[#111] border-l border-white/10 flex flex-col">
            <div className="sticky top-0 z-10 bg-[#111]/95 backdrop-blur px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
              <p className="font-semibold">{campaign ? `Edit “${campaign.name}”` : 'New keyword campaign'}</p>
              <button type="button" onClick={() => setOpen(false)} className="text-white/60 hover:text-white text-xl leading-none" aria-label="Close">×</button>
            </div>

            <div className="px-6 py-5 flex flex-col gap-5">
              {campaign && <input type="hidden" name="id" value={campaign.id} />}
              <Field label="Name" hint={id ? `Tracked link: ${site.replace('https://', '')}/go/${id}` : undefined}>
                <input name="name" required value={name} onChange={(e) => setName(e.target.value)} className={input} placeholder="Free audit" />
              </Field>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Keywords" hint="Comma separated, any case">
                  <input name="keywords" required value={keywords} onChange={(e) => setKeywords(e.target.value)} className={input} placeholder="AUDIT, BOOK" />
                </Field>
                <Field label="Triggers on">
                  <select name="channel" defaultValue={campaign?.channel ?? 'comment'} className={input}>
                    <option value="comment">Comments</option>
                    <option value="dm">DMs</option>
                    <option value="both">Comments + DMs</option>
                  </select>
                </Field>
              </div>
              <Field label="Only these posts" hint="Instagram post IDs, comma separated. Blank = every post.">
                <input name="postIds" defaultValue={campaign?.postIds.join(', ')} className={input} placeholder="All posts" />
              </Field>
              <Field label="Send them to">
                <input name="url" type="url" required defaultValue={campaign?.url ?? `${site}/audit`} className={input} />
              </Field>
              <Field label="DM message" hint="{link} becomes the tracked link.">
                <textarea name="message" required rows={6} value={message} onChange={(e) => setMessage(e.target.value)} className={`${input} resize-y`} />
              </Field>

              <div className="rounded-2xl bg-black border border-white/[0.08] p-4 flex flex-col gap-3">
                <p className="text-[11px] uppercase tracking-wider text-white/55">Preview</p>
                <div className="self-end max-w-[85%] rounded-2xl rounded-br-md bg-[#3797F0] px-3.5 py-2 text-sm">{firstKeyword}</div>
                <div className="self-start max-w-[85%] rounded-2xl rounded-bl-md bg-[#262626] px-3.5 py-2.5 text-sm whitespace-pre-wrap break-words">
                  {message.split('{link}').map((part, i, arr) => (
                    <span key={i}>{part}{i < arr.length - 1 && <span className="text-[#8ab4ff] underline">{`${site.replace('https://', '')}/go/${id || 'campaign'}`}</span>}</span>
                  ))}
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4 items-end">
                <Field label="Ends (optional)">
                  <input name="endsAt" type="date" defaultValue={campaign?.endsAt?.slice(0, 10)} className={input} />
                </Field>
                <label className="flex items-center gap-2.5 text-sm text-white/80 pb-2.5">
                  <input name="active" type="checkbox" defaultChecked={campaign?.active ?? true} className="size-4 accent-[#F2613F]" /> Live
                </label>
              </div>
              {state?.error && <p className="text-sm text-rose-300 rounded-lg bg-rose-400/10 px-3 py-2" role="alert">{state.error}</p>}
            </div>

            <div className="sticky bottom-0 mt-auto bg-[#111]/95 backdrop-blur px-6 py-4 border-t border-white/[0.06] flex justify-end gap-3">
              <button type="button" onClick={() => setOpen(false)} className="rounded-full px-4 py-2 text-sm text-white/60 hover:text-white">Cancel</button>
              <button disabled={pending} className="rounded-full bg-[#F2613F] hover:bg-[#ff7553] text-[#0C0C0C] text-sm font-semibold px-5 py-2 disabled:opacity-50">
                {pending ? 'Saving…' : campaign ? 'Save changes' : 'Create campaign'}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
