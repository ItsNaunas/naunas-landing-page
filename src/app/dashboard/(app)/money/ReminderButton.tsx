'use client';

import { useActionState } from 'react';
import { sendInvoiceReminder, type SaveState } from '@/app/dashboard/actions';

/** Stripe re-sends its invoice email to the client. Asks once before sending. */
export function ReminderButton({ id, who }: { id: string; who: string }) {
  const [state, action, pending] = useActionState<SaveState, FormData>(sendInvoiceReminder, null);
  if (state?.savedAt) return <span className="text-xs text-emerald-300">Stripe re-sent it ✓</span>;
  return (
    <form action={action} onSubmit={(e) => { if (!window.confirm(`Have Stripe email the invoice to ${who} again now?`)) e.preventDefault(); }} className="flex items-center gap-2">
      <input type="hidden" name="id" value={id} /><input type="hidden" name="who" value={who} />
      <button disabled={pending} className="rounded-full bg-white text-black px-3 py-1.5 text-xs font-medium disabled:opacity-50">{pending ? 'Sending…' : 'Stripe: send reminder'}</button>
      {state?.error && <span className="text-xs text-rose-300">{state.error}</span>}
    </form>
  );
}
