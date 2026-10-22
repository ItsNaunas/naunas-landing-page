'use client';

import { useActionState } from 'react';
import { acceptProposalAction, type AcceptState } from '@/app/p/[token]/actions';

/** Typed name + agreement = acceptance. On success the server re-renders the page with the deposit button. */
export function AcceptForm({ token, firstName }: { token: string; firstName?: string }) {
  const [state, action, pending] = useActionState<AcceptState, FormData>(acceptProposalAction, null);
  if (state?.ok) {
    return (
      <div className="mt-5 flex flex-col gap-3">
        <p className="text-sm text-emerald-300">Accepted. Thank you{firstName ? `, ${firstName}` : ''}.</p>
        {state.pay ? <a href={state.pay} className="inline-flex items-center justify-center self-start text-sm font-semibold text-[#0C0C0C] px-6 py-3 rounded-full" style={{ background: '#F2613F' }}>Pay the deposit{state.deposit ? ` · ${state.deposit}` : ''} →</a>
          : <p className="text-sm text-white/55">Naufal will send the deposit link shortly.</p>}
      </div>
    );
  }
  return (
    <form action={action} className="mt-5 flex flex-col gap-3 max-w-md">
      <input type="hidden" name="token" value={token} />
      <label className="flex flex-col gap-1 text-xs text-white/50">Your full name (this is your signature)
        <input name="name" required minLength={3} maxLength={120} autoComplete="name" className="rounded-lg bg-[#161616] border border-white/15 px-3 py-2.5 text-sm text-white outline-none focus:border-[#F2613F]" />
      </label>
      <label className="flex items-start gap-2 text-sm text-white/70"><input type="checkbox" name="agree" required className="mt-1 accent-[#F2613F]" /> I accept the scope, timeline and price above.</label>
      {state?.error && <p className="text-sm text-rose-300" role="alert">{state.error}</p>}
      <button disabled={pending} className="self-start inline-flex items-center justify-center text-sm font-semibold text-[#0C0C0C] px-6 py-3 rounded-full disabled:opacity-50" style={{ background: '#F2613F' }}>{pending ? 'One moment…' : 'Accept and continue to the deposit →'}</button>
    </form>
  );
}
