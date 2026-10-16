// Activity feed: one short line per thing that happens anywhere in the funnel (sign-ups, bookings,
// payments, Instagram keywords, link clicks, alerts), newest first, last 500 kept in Blob. Shown on
// /dashboard (Today + Automations). Never throws and never blocks the request that logged it.
// Holds names and record links only: emails and message text stay in HubSpot.

import { getJSON, updateJSON, storeReady } from '@/lib/store';

export type EventKind =
  | 'lead' | 'enquiry' | 'subscribe' | 'booking' | 'reschedule' | 'cancel' | 'noshow'
  | 'payment' | 'payment_issue' | 'refund' | 'ig_comment' | 'ig_dm' | 'click' | 'alert';

export type OpsEvent = { at: string; kind: EventKind; title: string; href?: string };

const PATH = 'events.json';
const KEEP = 500;

export async function logEvent(kind: EventKind, title: string, href?: string): Promise<void> {
  if (!storeReady()) return;
  try {
    const ev: OpsEvent = { at: new Date().toISOString(), kind, title: title.slice(0, 160), ...(href ? { href } : {}) };
    await updateJSON<OpsEvent[]>(PATH, [], (list) => [ev, ...list].slice(0, KEEP));
  } catch (err) {
    console.warn('[events] log failed', kind, err instanceof Error ? err.message : err);
  }
}

export async function listEvents(limit = 50, kinds?: EventKind[]): Promise<OpsEvent[]> {
  const all = await getJSON<OpsEvent[]>(PATH, []);
  return (kinds?.length ? all.filter((e) => kinds.includes(e.kind)) : all).slice(0, limit);
}
