// Done / Snooze on Today's "Needs you" rows (2026-10-23). The rows are worked out fresh on every load, so
// dismissing one hides it for a while rather than deleting anything: Done for 7 days (if it's still true then,
// it comes back), Snooze until tomorrow. Keys are the flag id, or the row's kind + title.

import { getJSON, updateJSON } from '@/lib/store';

const PATH = 'ops/dismissed.json';
const DAY = 86_400_000;
export type Dismissed = Record<string, { until: string; title: string; how: 'done' | 'snoozed' }>;

export async function getDismissed(): Promise<Dismissed> {
  const all = await getJSON<Dismissed>(PATH, {});
  const now = Date.now();
  return Object.fromEntries(Object.entries(all).filter(([, v]) => Date.parse(v.until) > now));
}

export async function dismiss(key: string, title: string, how: 'done' | 'snoozed'): Promise<void> {
  const until = new Date(Date.now() + (how === 'done' ? 7 * DAY : DAY)).toISOString();
  await updateJSON<Dismissed>(PATH, {}, (all) => {
    const now = Date.now();
    const kept = Object.fromEntries(Object.entries(all).filter(([, v]) => Date.parse(v.until) > now));
    return { ...kept, [key.slice(0, 200)]: { until, title: title.slice(0, 160), how } };
  });
}

export async function restore(key: string): Promise<void> {
  await updateJSON<Dismissed>(PATH, {}, (all) => { const next = { ...all }; delete next[key]; return next; });
}
