// Posting times in the audience's zone (US East), shared by the composer and the studio drop.

/** UTC instant for a wall-clock time in a time zone (good to the minute, DST-safe for our use). */
export function zonedToUtc(y: number, mo: number, d: number, h: number, mi: number, tz: string) {
  const guess = Date.UTC(y, mo, d, h, mi);
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' }).formatToParts(guess).map((x) => [x.type, x.value]));
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute);
  return new Date(guess - (asUtc - guess));
}

/** The calendar date (YYYY-MM-DD) an instant falls on in a zone. */
export const dayIn = (d: Date, tz: string) => new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(d);

/** hh:mm in `tz` on the day `daysAhead` from now. */
export function atOn(daysAhead: number, hhmm: string, tz: string) {
  const [h, m] = hhmm.split(':').map(Number);
  const [y, mo, d] = dayIn(new Date(Date.now() + daysAhead * 86_400_000), tz).split('-').map(Number);
  return zonedToUtc(y, mo - 1, d, h, m, tz);
}

/** The next hh:mm in `tz` at least 5 minutes away. */
export function nextAt(hhmm: string, tz: string) {
  for (let i = 0; i < 3; i++) {
    const at = atOn(i, hhmm, tz);
    if (at.getTime() > Date.now() + 5 * 60_000) return at;
  }
  return new Date(Date.now() + 86_400_000);
}

/** First day with nothing scheduled or posted, at the first quick-pick time: one post a day, no doubling up. */
export function nextFreeSlot(taken: Date[], hhmm: string, tz: string, horizonDays = 21) {
  const busy = new Set(taken.map((d) => dayIn(d, tz)));
  for (let i = 0; i <= horizonDays; i++) {
    const at = atOn(i, hhmm, tz);
    if (at.getTime() > Date.now() + 30 * 60_000 && !busy.has(dayIn(at, tz))) return at;
  }
  return nextAt(hhmm, tz);
}
