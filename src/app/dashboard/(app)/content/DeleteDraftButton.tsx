'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { deleteContentDraft } from '../../actions';

/** Content → Plan: clear an abandoned draft without opening it. */
export function DeleteDraftButton({ id, label }: { id: string; label: string }) {
  const [busy, start] = useTransition();
  const router = useRouter();
  return (
    <button type="button" disabled={busy} aria-label={`Delete draft: ${label}`}
      onClick={() => { if (window.confirm('Delete this draft?')) start(async () => { await deleteContentDraft(id); router.refresh(); }); }}
      className="shrink-0 rounded-md px-2 py-1.5 text-xs text-white/55 hover:text-rose-300 disabled:opacity-40">{busy ? '…' : 'Delete'}</button>
  );
}
