'use server';

import { accept, depositHref } from '@/lib/proposal';

export type AcceptState = { ok?: boolean; pay?: string; deposit?: string; error?: string } | null;

/** Public: the client accepts the proposal by typing their name. Token-scoped; nothing else is reachable. */
export async function acceptProposalAction(_prev: AcceptState, form: FormData): Promise<AcceptState> {
  const token = String(form.get('token') ?? '');
  const name = String(form.get('name') ?? '').trim();
  if (form.get('agree') !== 'on') return { error: 'Please tick the box to accept.' };
  if (name.length < 3) return { error: 'Please type your full name.' };
  try {
    const p = await accept(token, name);
    return { ok: true, pay: depositHref(p), deposit: p.deposit || undefined };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Something went wrong. Please try again or reply to the email.' };
  }
}
