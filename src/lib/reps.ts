// Daily acquisition reps (the vault's daily-brief OUTREACH checklist + the day-close 📊 tally line), kept on
// the Outreach tab. Emails, DMs and posts count themselves from what the dashboard already records; the rest
// are things done by hand in the apps (warm-ups, story replies, LinkedIn connects, list-building, Zanzibar),
// ticked with + on the card. Days are Zanzibar days.

import { getJSON, updateJSON } from '@/lib/store';

export type RepKey = 'warmups' | 'followups' | 'linkedin' | 'list' | 'zanzibar';
export const MANUAL_REPS: { key: RepKey; label: string; hint: string; target: number }[] = [
  { key: 'warmups', label: 'IG warm-ups', hint: 'Follow, like 2 to 3 project posts, one specific comment, view their story', target: 10 },
  { key: 'followups', label: 'IG follow-ups', hint: 'Day 5 and day 9 follow-ups (ticked from the sequence), story replies', target: 5 },
  { key: 'linkedin', label: 'LinkedIn connects', hint: 'Connect with a note, once they have seen you twice elsewhere', target: 3 },
  { key: 'list', label: 'List-building', hint: 'New firms found and approved (Prospects tab)', target: 5 },
  { key: 'zanzibar', label: 'Zanzibar action', hint: 'One relationship move. Intro-led, never cold', target: 1 },
];
/** Counted automatically: emails by the daily send, DMs you mark sent, posts published from Content. */
export const AUTO_TARGETS = { emails: 15, dms: 10, posts: 1 };

const PATH = 'outreach/reps.json';
const TZ = 'Africa/Dar_es_Salaam';
export const repDay = (t: number | string = Date.now()) => new Date(t).toLocaleDateString('en-CA', { timeZone: TZ });

type Log = Record<string, Partial<Record<RepKey, number>>>;
export const getReps = () => getJSON<Log>(PATH, {});

export async function bumpRep(key: RepKey, delta: number, day = repDay()) {
  await updateJSON<Log>(PATH, {}, (log) => {
    const row = { ...(log[day] ?? {}) };
    row[key] = Math.max(0, (row[key] ?? 0) + delta);
    // Keep about two months.
    const keep = Object.keys(log).sort().slice(-60);
    return { ...Object.fromEntries(keep.map((k) => [k, log[k]])), [day]: row };
  });
}
