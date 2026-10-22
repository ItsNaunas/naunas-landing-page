// Landing-page video watch counts (2026-10-22): plays, quarter marks, completions, the end-of-video
// scorecard pop-up and sign-ups from it, per day. Written by /api/video (a beacon from JourneyVideo and
// the pop-up), read by Content → Performance. Counts only, nothing about who.

import { getJSON, updateJSON } from '@/lib/store';

export const VIDEO_EVENTS = ['play', 'q25', 'q50', 'q75', 'end', 'popup', 'signup'] as const;
export type VideoEvent = (typeof VIDEO_EVENTS)[number];
type Day = Partial<Record<VideoEvent, number>>;
type Store = { days: Record<string, Day> };
const PATH = 'content/video-watch.json';
const EMPTY: Store = { days: {} };

/** Several events that happen together (end + popup) go in one update: two beacons at once would race the read-modify-write. */
export async function countVideoEvents(events: VideoEvent[]): Promise<void> {
  const day = new Date().toISOString().slice(0, 10);
  await updateJSON<Store>(PATH, EMPTY, (s) => {
    const d = { ...(s.days[day] ?? {}) };
    for (const e of events) d[e] = (d[e] ?? 0) + 1;
    // Keep 120 days.
    const keep = Object.keys(s.days).sort().slice(-119);
    return { days: { ...Object.fromEntries(keep.map((k) => [k, s.days[k]])), [day]: d } };
  });
}

export type VideoStats = { days: number; plays: number; q50: number; ends: number; popups: number; signups: number; today: Day };

export async function videoStats(days = 30): Promise<VideoStats> {
  const s = await getJSON<Store>(PATH, EMPTY);
  const since = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
  const rows = Object.entries(s.days).filter(([k]) => k >= since).map(([, v]) => v);
  const sum = (e: VideoEvent) => rows.reduce((n, r) => n + (r[e] ?? 0), 0);
  return { days, plays: sum('play'), q50: sum('q50'), ends: sum('end'), popups: sum('popup'), signups: sum('signup'), today: s.days[new Date().toISOString().slice(0, 10)] ?? {} };
}
