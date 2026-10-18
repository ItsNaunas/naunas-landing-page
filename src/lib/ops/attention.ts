import { cache } from 'react';
import { getIndex } from '@/lib/content';
import { getOwed, needsYou } from '@/lib/owed';
import { demoOn } from './demo';

/** Red counters for the sidebar and tabs: things waiting on Naufal. Two small Blob reads, once per request. */
export const attention = cache(async (): Promise<{ content: number; outreach: number }> => {
  if (demoOn()) return { content: 1, outreach: 2 };
  const [rows, owed] = await Promise.all([getIndex().catch(() => []), getOwed().catch(() => [])]);
  const now = Date.now();
  const content = rows.filter((r) =>
    r.channels.tiktok === 'held' || Object.values(r.channels).includes('failed') || (r.status === 'scheduled' && Date.parse(r.when) < now - 10 * 60_000),
  ).length;
  const o = needsYou(owed, now);
  return { content, outreach: o.toSend.length + o.toNudge.length };
});
