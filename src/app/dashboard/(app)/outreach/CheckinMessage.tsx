'use client';

import { useState, useTransition } from 'react';
import { writeCheckin } from '@/app/dashboard/actions';
import { CopyText } from './OutreachClient';

type Lead = { id: string; name: string; company?: string; channel: 'Instagram' | 'LinkedIn' };

/** The check-in text for one old lead: written from their HubSpot notes on demand, then copy it. */
export function CheckinMessage({ lead, initial }: { lead: Lead; initial?: string }) {
  const [text, setText] = useState(initial ?? '');
  const [err, setErr] = useState('');
  const [busy, start] = useTransition();
  const write = () => start(async () => { setErr(''); const r = await writeCheckin(lead); if (r.text) setText(r.text); else setErr(r.error ?? 'Failed'); });
  return (
    <div className="flex flex-col gap-2">
      {text ? <p className="text-[13px] text-white/80 rounded-lg bg-white/[0.03] border border-white/[0.06] p-2.5">{text}</p> : null}
      {err && <p className="text-[11px] text-rose-300">{err}</p>}
      <div className="flex flex-wrap gap-2 items-center">
        {text ? <CopyText text={text} label="Copy message" /> : (
          <button type="button" disabled={busy} onClick={write} className="rounded-full border border-white/15 px-3 py-1.5 text-xs hover:border-white/30 disabled:opacity-40">{busy ? 'Writing…' : 'Write the message'}</button>
        )}
        {text && <button type="button" disabled={busy} onClick={write} className="text-[11px] text-white/40 hover:text-white disabled:opacity-40">{busy ? 'Rewriting…' : 'Rewrite'}</button>}
      </div>
    </div>
  );
}
