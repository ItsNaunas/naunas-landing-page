'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { testScheduling } from '../../actions';
import { FUNNEL } from '@/config/funnel';

type Ping = { scheduledFor?: string; firedAt?: string | null } | null;

/** Proves the scheduling chain (QStash → signed call → site) without posting anything. */
export function SchedulingTest({ ready, last }: { ready: boolean; last: Ping }) {
  const [busy, start] = useTransition();
  const [err, setErr] = useState('');
  const router = useRouter();
  const waiting = !!last?.scheduledFor && !last.firedAt && Date.parse(last.scheduledFor) > Date.now() - 3 * 60_000;
  const missed = !!last?.scheduledFor && !last.firedAt && !waiting;

  // While a test is pending, re-check every 10s.
  useEffect(() => {
    if (!waiting) return;
    const t = setInterval(() => router.refresh(), 10_000);
    return () => clearInterval(t);
  }, [waiting, router]);

  if (!ready) return <span className="text-xs text-white/55">Scheduling is off (QStash keys missing).</span>;
  return (
    <span className="flex items-center gap-2 flex-wrap text-xs">
      {last?.firedAt && <span className="text-emerald-300">✅ Scheduling works (tested {new Date(last.firedAt).toLocaleString('en-GB', { timeZone: FUNNEL.ownerTz, day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })})</span>}
      {waiting && <span className="text-sky-200">Testing… QStash should call back within about a minute.</span>}
      {missed && <span className="text-rose-300">❌ The test call never arrived. Check Upstash → QStash → Logs.</span>}
      {err && <span className="text-rose-300">{err}</span>}
      <button disabled={busy || waiting} onClick={() => start(async () => { setErr(''); const r = await testScheduling(); if (r.error) setErr(r.error); router.refresh(); })}
        className="text-white/55 hover:text-white disabled:opacity-40 underline-offset-2 hover:underline">{busy ? 'Booking…' : 'Test scheduling (posts nothing)'}</button>
    </span>
  );
}
