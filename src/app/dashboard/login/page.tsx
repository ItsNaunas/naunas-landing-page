'use client';

import { useActionState } from 'react';
import { login } from '../actions';

export default function DashboardLogin() {
  const [error, action, pending] = useActionState(login, null);
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <form action={action} className="w-full max-w-sm flex flex-col gap-4 p-8" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.08)' }}>
        <p className="text-lg font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
          Naunas<span className="text-[var(--accent)]">.</span> Ops
        </p>
        <label className="flex flex-col gap-2 text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
          Password
          <input
            name="password" type="password" autoComplete="current-password" required autoFocus
            className="px-4 py-3 text-white outline-none focus:border-[#F2613F]"
            style={{ background: '#0C0C0C', border: '1px solid rgba(255,255,255,0.12)' }}
          />
        </label>
        {error && <p className="text-sm text-[#F2613F]" role="alert">{error}</p>}
        <button disabled={pending} className="bg-[#F2613F] hover:bg-[#ff7553] text-[#0C0C0C] font-semibold py-3 rounded-full transition-colors disabled:opacity-50">
          {pending ? 'Checking…' : 'Sign in'}
        </button>
      </form>
    </main>
  );
}
