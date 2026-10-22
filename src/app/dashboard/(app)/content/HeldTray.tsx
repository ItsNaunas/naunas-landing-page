'use client';

import { useState, useTransition } from 'react';
import { sendHeldTikTok } from '../../actions';

export function SendHeldButton({ approved, count }: { approved: boolean; count: number }) {
  const [busy, start] = useTransition();
  const [msg, setMsg] = useState('');
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <button disabled={!approved || busy || !count} onClick={() => start(async () => {
        const r = await sendHeldTikTok();
        setMsg(r.error ?? `Sent ${r.sent}.${r.left ? ` ${r.left} still waiting (press again).` : ''}`);
      })} className="rounded-lg bg-[#F2613F] px-3.5 py-1.5 text-sm font-medium text-white hover:bg-[#ff7553] disabled:opacity-35 disabled:cursor-not-allowed">
        {busy ? 'Sending…' : `Send all ${count} to TikTok`}
      </button>
      {!approved && <span className="text-xs text-white/60">Unlocks when TikTok approves the app.</span>}
      {msg && <span className="text-xs text-white/60">{msg}</span>}
    </div>
  );
}
