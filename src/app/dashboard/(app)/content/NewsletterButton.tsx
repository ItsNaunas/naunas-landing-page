'use client';

import { useState, useTransition } from 'react';
import { buildNewsletterDraft } from '../../actions';

/** "Build draft now": makes this week's MailerLite draft on demand (Mondays it happens on its own). Never sends. */
export function NewsletterButton({ label = 'Build draft now' }: { label?: string }) {
  const [busy, start] = useTransition();
  const [msg, setMsg] = useState<{ ok?: string; error?: string }>({});
  return (
    <span className="flex items-center gap-3 flex-wrap text-xs">
      <button disabled={busy} onClick={() => start(async () => setMsg(await buildNewsletterDraft()))}
        className="rounded-lg bg-white/[0.08] hover:bg-white/[0.14] px-3 py-1.5 text-white/85 disabled:opacity-40">{busy ? 'Building…' : label}</button>
      {msg.ok && <span className="text-emerald-300">{msg.ok}</span>}
      {msg.error && <span className="text-rose-300">{msg.error}</span>}
    </span>
  );
}
