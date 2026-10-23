// Undo for the one-click buttons on Today (2026-10-23). Before an action changes something, it records what it
// is about to change; for 60 seconds an Undo bar puts it back. A firm is restored on its own (the rest of the
// list may have moved on since, e.g. a cron), small lists (owed, asks, replies, touches, reps) as a whole.
// Only the dashboard's own store is undone: a HubSpot note or task already written stays.

import { getJSON, putJSON, updateJSON } from '@/lib/store';

const PATH = 'ops/undo.json';
const PROSPECTS = 'outreach/prospects.json';
const WINDOW_MS = 60_000;
/** Written after an undo (an expired entry rather than null, which the Postgres store's data column refuses). */
const CLEARED: UndoEntry = { at: new Date(0).toISOString(), label: '', snaps: [] };

type Snap = { kind: 'prospect'; id: string; before: Record<string, unknown> } | { kind: 'file'; path: string; before: unknown };
export type UndoEntry = { at: string; label: string; snaps: Snap[]; external?: boolean };

/** Record the current state of these firms and files, so the next action can be undone. */
export async function snapshot(label: string, opts: { prospects?: string[]; files?: string[]; external?: boolean }): Promise<void> {
  const snaps: Snap[] = [];
  if (opts.prospects?.length) {
    const list = await getJSON<Record<string, unknown>[]>(PROSPECTS, []);
    for (const id of opts.prospects) { const p = list.find((x) => x.id === id); if (p) snaps.push({ kind: 'prospect', id, before: p }); }
  }
  for (const path of opts.files ?? []) snaps.push({ kind: 'file', path, before: await getJSON<unknown>(path, null) });
  await putJSON(PATH, { at: new Date().toISOString(), label, snaps, external: opts.external } satisfies UndoEntry);
}

/** The last action, if it can still be undone. */
export async function pendingUndo(): Promise<UndoEntry | null> {
  const e = await getJSON<UndoEntry | null>(PATH, null);
  return e && Date.now() - Date.parse(e.at) < WINDOW_MS ? e : null;
}

/** Put back what the last action changed. Returns its label, or null if there was nothing (or it's too late). */
export async function undoLast(): Promise<string | null> {
  const e = await pendingUndo();
  if (!e) return null;
  const firms = e.snaps.filter((s): s is Extract<Snap, { kind: 'prospect' }> => s.kind === 'prospect');
  if (firms.length) {
    await updateJSON<Record<string, unknown>[]>(PROSPECTS, [], (list) => list.map((p) => firms.find((f) => f.id === p.id)?.before ?? p));
  }
  for (const s of e.snaps) if (s.kind === 'file' && s.before !== null) await putJSON(s.path, s.before);
  await putJSON(PATH, CLEARED);
  return e.label;
}
