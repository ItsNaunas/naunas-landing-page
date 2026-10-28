// Studio drop (2026-10-28): a finished edit from naunas-studio (scripts/drop.mjs) becomes a draft post here,
// with every channel's text already written and a suggested time (the next day with nothing on it). Telegram
// says it's ready; Naufal watches it and presses "Schedule at suggested time". Nothing is scheduled or posted
// without that click. Auth: env STUDIO_DROP_TOKEN, sent by the studio as a Bearer token.

import { timingSafeEqual } from 'node:crypto';
import { newPost, savePost, getIndex, CHANNELS, type Media } from '@/lib/content';
import { nextFreeSlot } from '@/lib/slots';
import { FUNNEL } from '@/config/funnel';
import { notify, line } from '@/lib/alert';

export function studioAuthed(header: string | null): boolean {
  const want = process.env.STUDIO_DROP_TOKEN;
  if (!want || !header?.startsWith('Bearer ')) return false;
  const a = Buffer.from(header.slice(7));
  const b = Buffer.from(want);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Next empty day at the first quick-pick time (US East), skipping days that already have a post on. */
export async function suggestSlot(): Promise<Date> {
  const taken = (await getIndex())
    .filter((r) => r.status !== 'draft' && CHANNELS.some((c) => r.channels[c] && r.channels[c] !== 'off'))
    .map((r) => new Date(r.when));
  return nextFreeSlot(taken, FUNNEL.content.defaultTimes[0], FUNNEL.content.usTz);
}

export type Drop = { media: Media; idea?: string; transcript?: string };

export async function createFromStudio(d: Drop) {
  const p = newPost((d.idea ?? '').slice(0, 5000));
  p.master.media = d.media;
  if (d.transcript) p.master.transcript = d.transcript.slice(0, 50_000);
  p.source = 'studio';
  const video = d.media.kind === 'video';
  p.channels.linkedin.enabled = true;
  p.channels.instagram.enabled = !!process.env.IG_ACCESS_TOKEN;
  p.channels.tiktok.enabled = video && !!process.env.TIKTOK_CLIENT_KEY;

  let drafted = false;
  const { aiReady } = await import('@/lib/ai');
  if (aiReady() && (p.master.idea.trim().length >= 20 || p.master.transcript?.trim())) {
    try {
      const [{ adapt }, { getCampaigns, DEFAULT_CAMPAIGN }] = await Promise.all([import('@/lib/adapt'), import('@/lib/campaigns')]);
      const camp = (await getCampaigns()).find((c) => c.active) ?? DEFAULT_CAMPAIGN;
      const a = await adapt({ idea: p.master.idea, transcript: p.master.transcript, keyword: camp.keywords[0] ?? 'LEAK', offer: camp.name });
      p.channels.linkedin.text = a.linkedin.text;
      p.channels.linkedin.firstComment = a.linkedin.firstComment;
      p.channels.instagram.caption = a.instagram.caption;
      p.channels.instagram.campaignId = camp.id;
      p.channels.tiktok.caption = a.tiktok.caption;
      p.newsletterBlurb = a.newsletterBlurb;
      if (!p.master.idea) p.master.idea = a.linkedin.hooks[0] ?? '';
      drafted = true;
    } catch { /* the draft still lands; Adapt can be pressed on the page */ }
  }
  for (const c of CHANNELS) p.channels[c].status = p.channels[c].enabled ? 'ready' : 'off';
  p.suggestedFor = (await suggestSlot()).toISOString();
  await savePost(p);

  const when = new Date(p.suggestedFor);
  await notify({
    level: 'ok', title: 'New video ready to schedule',
    lines: [
      line('🎬', 'Post', p.master.idea.slice(0, 80) || d.media.name || p.id),
      line('🗓', 'Suggested', `${when.toLocaleString('en-GB', { timeZone: FUNNEL.ownerTz, weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} (${when.toLocaleString('en-GB', { timeZone: FUNNEL.content.usTz, hour: '2-digit', minute: '2-digit' })} US East)`),
      drafted ? '' : line('✍️', 'Captions', 'not written yet: press Adapt on the page'),
    ],
    next: 'Watch it, check the captions, then Schedule at suggested time.',
    buttons: [{ text: 'Open the post', url: `${FUNNEL.site}/dashboard/content/${p.id}` }],
  });
  return { id: p.id, suggestedFor: p.suggestedFor, drafted };
}
