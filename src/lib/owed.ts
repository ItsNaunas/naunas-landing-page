// "Asset owed" (Outreach Playbook, 2026-10-18): the biggest leak in the LinkedIn audit was saying yes to a
// Loom / PDF / teardown and never sending it. When someone says yes, it goes here: due in 24 hours (overdue ones
// show on Overview and in the morning brief). Once sent, a nudge is due after 5 quiet days. Any channel, any person.

import { getJSON, updateJSON } from '@/lib/store';

export type Owed = {
  id: string; who: string; what: string; channel: string; link?: string;
  owedAt: string; sentAt?: string; closedAt?: string; outcome?: 'replied' | 'nudged' | 'dropped';
  /** The cold-outreach firm, and its HubSpot task (completed when marked sent or closed). */
  firmId?: string; taskId?: string;
};

const PATH = 'outreach/owed.json';
export const DUE_H = 24;
export const NUDGE_D = 5;
const H = 3_600_000;

export const getOwed = () => getJSON<Owed[]>(PATH, []);
export const dueAt = (o: Owed) => Date.parse(o.owedAt) + DUE_H * H;
export const nudgeAt = (o: Owed) => (o.sentAt ? Date.parse(o.sentAt) + NUDGE_D * 24 * H : Infinity);

/** What needs you: unsent assets, and sent ones whose nudge is due. */
export function needsYou(list: Owed[], now = Date.now()) {
  const open = list.filter((o) => !o.closedAt);
  return { toSend: open.filter((o) => !o.sentAt).sort((a, b) => dueAt(a) - dueAt(b)), toNudge: open.filter((o) => o.sentAt && nudgeAt(o) <= now), waiting: open.filter((o) => o.sentAt && nudgeAt(o) > now) };
}

export async function addOwed(o: Omit<Owed, 'id' | 'owedAt'>) {
  const row: Owed = { ...o, id: `o${Date.now().toString(36)}`, owedAt: new Date().toISOString() };
  await updateJSON<Owed[]>(PATH, [], (list) => [row, ...list].slice(0, 300));
  return row;
}

export async function patchOwed(id: string, patch: Partial<Owed>) {
  let found: Owed | undefined;
  await updateJSON<Owed[]>(PATH, [], (list) => list.map((o) => (o.id === id ? (found = { ...o, ...patch }) : o)));
  return found;
}
