'use client';

import { useActionState, useState } from 'react';
import { saveCampaign } from './actions';
import type { Campaign } from '@/lib/campaigns';

const field = 'px-3 py-2 text-sm text-white outline-none focus:border-[#F2613F] w-full';
const fieldStyle = { background: '#0C0C0C', border: '1px solid rgba(255,255,255,0.12)' };
const NEW_MESSAGE = 'Here you go 👇\n\n{link}\n\nAny questions, just reply here.';

/** Add (no campaign) or edit a keyword campaign, with a live preview of the DM. */
export function CampaignForm({ campaign, site }: { campaign?: Campaign; site: string }) {
  const [error, action, pending] = useActionState(saveCampaign, null);
  const [message, setMessage] = useState(campaign?.message ?? NEW_MESSAGE);
  const [name, setName] = useState(campaign?.name ?? '');
  const id = campaign?.id ?? name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
  const preview = message.replace(/\{link\}/g, `${site}/go/${id || 'your-campaign'}`);

  return (
    <form action={action} className="grid gap-3 md:grid-cols-2">
      {campaign && <input type="hidden" name="id" value={campaign.id} />}
      <label className="flex flex-col gap-1 text-xs text-white/50">Name
        <input name="name" required value={name} onChange={(e) => setName(e.target.value)} className={field} style={fieldStyle} placeholder="Free audit" />
      </label>
      <label className="flex flex-col gap-1 text-xs text-white/50">Keywords (comma separated)
        <input name="keywords" required defaultValue={campaign?.keywords.join(', ')} className={field} style={fieldStyle} placeholder="AUDIT, BOOK" />
      </label>
      <label className="flex flex-col gap-1 text-xs text-white/50">Where
        <select name="channel" defaultValue={campaign?.channel ?? 'comment'} className={field} style={fieldStyle}>
          <option value="comment">Comments</option>
          <option value="dm">DMs</option>
          <option value="both">Comments and DMs</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs text-white/50">Only these post IDs (blank = all posts)
        <input name="postIds" defaultValue={campaign?.postIds.join(', ')} className={field} style={fieldStyle} placeholder="17912345678901234" />
      </label>
      <label className="flex flex-col gap-1 text-xs text-white/50 md:col-span-2">Link they get sent to
        <input name="url" type="url" required defaultValue={campaign?.url ?? `${site}/audit`} className={field} style={fieldStyle} />
      </label>
      <label className="flex flex-col gap-1 text-xs text-white/50">DM message ({'{link}'} = tracked link)
        <textarea name="message" required rows={6} value={message} onChange={(e) => setMessage(e.target.value)} className={field} style={fieldStyle} />
      </label>
      <div className="flex flex-col gap-1 text-xs text-white/50">Preview
        <div className="whitespace-pre-wrap text-sm text-white/80 p-3 rounded-2xl rounded-bl-sm" style={{ background: '#1d1d1d', minHeight: '9rem' }}>{preview}</div>
      </div>
      <label className="flex flex-col gap-1 text-xs text-white/50">Ends (optional)
        <input name="endsAt" type="date" defaultValue={campaign?.endsAt?.slice(0, 10)} className={field} style={fieldStyle} />
      </label>
      <label className="flex items-center gap-2 text-sm text-white/70 self-end pb-2">
        <input name="active" type="checkbox" defaultChecked={campaign?.active ?? true} className="accent-[#F2613F]" /> Live
      </label>
      {error && <p className="text-sm text-[#F2613F] md:col-span-2" role="alert">{error}</p>}
      <button disabled={pending} className="md:col-span-2 justify-self-start bg-[#F2613F] hover:bg-[#ff7656] text-[#0C0C0C] text-sm font-semibold px-6 py-2.5 rounded-full disabled:opacity-50">
        {pending ? 'Saving…' : campaign ? 'Save changes' : 'Add campaign'}
      </button>
    </form>
  );
}
