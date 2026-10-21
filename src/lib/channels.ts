// Outreach counted per channel (2026-10-21): each platform has its own daily target of NEW firms, and its own
// tally of follow-ups. A firm counts as "new" on a channel on the day of its first touch there:
// Instagram = warm-up, LinkedIn = engaging with their posts, Email = E1 sent. Days are Zanzibar days.
import type { Prospect, OutreachSettings } from '@/lib/outreach';
import { repDay } from '@/lib/reps';

export type ChannelKey = 'instagram' | 'linkedin' | 'email';
export type ChannelCount = { key: ChannelKey; label: string; target: number; newToday: number; followupsToday: number; inSequence: number; newThisWeek: number };

const DAY = 86_400_000;

export function channelBoard(all: Prospect[], s: OutreachSettings, now = Date.now()): ChannelCount[] {
  const today = repDay(now);
  const weekAgo = now - 7 * DAY;
  const isToday = (t?: string) => !!t && repDay(t) === today;
  const inWeek = (t?: string) => !!t && Date.parse(t) >= weekAgo;
  const count = (f: (p: Prospect) => number) => all.reduce((n, p) => n + f(p), 0);
  const e1 = (p: Prospect) => p.sent?.find((x) => x.step === 0)?.at;
  return [
    {
      key: 'instagram', label: 'Instagram', target: s.igNew,
      newToday: count((p) => (isToday(p.warmedAt) ? 1 : 0)),
      followupsToday: count((p) => [p.dmSentAt, p.fu1At, p.fu2At].filter(isToday).length),
      inSequence: count((p) => (p.warmedAt && !p.fu2At && !p.igRepliedAt ? 1 : 0)),
      newThisWeek: count((p) => (inWeek(p.warmedAt) ? 1 : 0)),
    },
    {
      key: 'linkedin', label: 'LinkedIn', target: s.liNew,
      newToday: count((p) => (isToday(p.liEngagedAt) ? 1 : 0)),
      followupsToday: count((p) => [p.liAt, p.liDmAt, p.liFuAt].filter(isToday).length),
      inSequence: count((p) => (p.liEngagedAt && !p.liFuAt && !p.igRepliedAt ? 1 : 0)),
      newThisWeek: count((p) => (inWeek(p.liEngagedAt) ? 1 : 0)),
    },
    {
      key: 'email', label: 'Email', target: s.dailyNew,
      newToday: count((p) => (isToday(e1(p)) ? 1 : 0)),
      followupsToday: count((p) => (p.sent ?? []).filter((x) => x.step > 0 && isToday(x.at)).length),
      inSequence: count((p) => (p.status === 'active' ? 1 : 0)),
      newThisWeek: count((p) => (inWeek(e1(p)) ? 1 : 0)),
    },
  ];
}
