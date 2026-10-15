import { NextRequest, NextResponse, after } from 'next/server';
import crypto from 'node:crypto';
import { upsertInstagramContact, addNote, hubspotUrl } from '@/lib/hubspot';
import { igProfile, privateReply, sendDm, igMedia } from '@/lib/instagram';
import { getCampaigns, matchCampaign, renderMessage, bump } from '@/lib/campaigns';
import { notify, line, alertError } from '@/lib/alert';

// Instagram webhook (Meta app, "Instagram API with Instagram Login"; subscribed fields: comments, messages).
//  - Comment containing a campaign keyword (lib/campaigns, edited on /dashboard; LEAK/MAP by default) →
//    one private-reply DM with that campaign's message + tracked /go link.
//  - DM containing a dm-campaign keyword → one reply with that campaign's message.
//    These are the only automated messages to a person, and only because they asked for it.
//  - First DM from someone → HubSpot contact keyed by their handle (lead source Instagram DM) + Telegram.
// Inert until IG_VERIFY_TOKEN, META_APP_SECRET and IG_ACCESS_TOKEN are set. Meta retries anything that
// isn't a fast 200, so the work happens in after().

type Change = { field: string; value: { id?: string; text?: string; from?: { id: string; username?: string }; media?: { id: string } } };
type Messaging = { sender: { id: string }; recipient: { id: string }; message?: { mid: string; text?: string; is_echo?: boolean } };
type Payload = { object: string; entry: { id: string; changes?: Change[]; messaging?: Messaging[] }[] };

// Subscription handshake when the webhook is added in the Meta dashboard.
export function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  console.info('[instagram-webhook] verify', { mode: p.get('hub.mode'), tokenMatches: p.get('hub.verify_token') === process.env.IG_VERIFY_TOKEN });
  const token = process.env.IG_VERIFY_TOKEN;
  if (token && p.get('hub.mode') === 'subscribe' && p.get('hub.verify_token') === token) {
    return new NextResponse(p.get('hub.challenge') ?? '', { status: 200 });
  }
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

function validSignature(raw: string, header: string | null, secret: string) {
  if (!header?.startsWith('sha256=')) return false;
  const expected = crypto.createHmac('sha256', secret).update(raw).digest('hex');
  const given = header.slice(7);
  return given.length === expected.length && crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

async function postUrlOf(mediaId?: string) {
  if (!mediaId) return undefined;
  try {
    return (await igMedia(mediaId)).permalink;
  } catch {
    return undefined; // reporting only; never blocks the DM
  }
}

async function onComment(accountId: string, v: Change['value']) {
  if (!v.id || !v.text || !v.from || v.from.id === accountId) return; // ignore our own replies
  const campaign = matchCampaign(await getCampaigns(), v.text, 'comment', v.media?.id);
  if (!campaign) return;
  const handle = v.from.username;
  await bump(campaign.id, 'comments');
  try {
    await privateReply(v.id, renderMessage(campaign));
    await bump(campaign.id, 'dms');
  } catch (err) {
    await alertError('Instagram: comment DM', err, `@${handle ?? v.from.id} commented "${v.text}" (campaign ${campaign.name}) but got no DM. Send it by hand: ${campaign.url}`);
    return;
  }
  const postUrl = await postUrlOf(v.media?.id);
  let contactUrl: string | undefined;
  if (handle) {
    try {
      const c = await upsertInstagramContact(handle, { campaign: campaign.id, postUrl });
      await addNote(c.id, `<p>Commented "${v.text.replace(/</g, '&lt;')}" on Instagram${postUrl ? ` (<a href="${postUrl}">post</a>)` : ''} → sent the "${campaign.name.replace(/</g, '&lt;')}" DM.</p>`);
      contactUrl = hubspotUrl.contact(c.id);
    } catch (err) {
      await alertError('Instagram: comment → HubSpot', err, 'The DM went out; only the HubSpot record is missing.');
    }
  }
  await notify({
    level: 'lead',
    title: `Instagram comment → ${campaign.name}`,
    lines: [line('📸', 'From', handle ? `@${handle}` : v.from.id)],
    quote: v.text,
    next: 'If they reply to the DM, it lands in your Instagram inbox as normal.',
    buttons: [
      ...(handle ? [{ text: 'Profile', url: `https://instagram.com/${handle}` }] : []),
      ...(postUrl ? [{ text: 'Post', url: postUrl }] : []),
      ...(contactUrl ? [{ text: 'HubSpot', url: contactUrl }] : []),
    ],
  });
}

async function onMessage(accountId: string, m: Messaging) {
  if (!m.message || m.message.is_echo || m.sender.id === accountId) return;
  const text = m.message.text ?? '';
  // DM keyword campaigns: they messaged first, so one reply inside Instagram's 24h window is allowed.
  const campaign = text ? matchCampaign(await getCampaigns(), text, 'dm') : undefined;
  if (campaign) {
    await bump(campaign.id, 'comments');
    try {
      await sendDm(m.sender.id, renderMessage(campaign));
      await bump(campaign.id, 'dms');
    } catch (err) {
      await alertError('Instagram: DM keyword reply', err, `Someone DM'd "${text}" (campaign ${campaign.name}) but got no reply. Answer them in Instagram.`);
    }
  }
  try {
    const profile = await igProfile(m.sender.id);
    if (!profile.username) return;
    const c = await upsertInstagramContact(profile.username, { name: profile.name, campaign: campaign?.id });
    if (!c.isNew && !campaign) return; // only the first DM (or a keyword) is news; the chat lives in Instagram
    if (text) await addNote(c.id, `<p>${campaign ? `DM'd keyword → sent the "${campaign.name.replace(/</g, '&lt;')}" reply.` : 'First Instagram DM:'}</p><blockquote>${text.replace(/</g, '&lt;')}</blockquote>`);
    await notify({
      level: 'lead',
      title: campaign ? `Instagram DM → ${campaign.name}` : 'New Instagram DM',
      lines: [line('📸', 'From', `@${profile.username}${profile.name ? ` (${profile.name})` : ''}`)],
      quote: text,
      next: campaign ? 'They got the campaign reply. Follow up in Instagram if they answer.' : 'Reply in Instagram. Once they share an email, the site joins it to this contact.',
      buttons: [{ text: 'Profile', url: `https://instagram.com/${profile.username}` }, { text: 'HubSpot', url: hubspotUrl.contact(c.id) }],
    });
  } catch (err) {
    await alertError('Instagram: DM → HubSpot', err, 'A new DM may not be in HubSpot. Check your Instagram inbox.');
  }
}

export async function POST(req: NextRequest) {
  const secret = process.env.META_APP_SECRET;
  if (!secret || !process.env.IG_ACCESS_TOKEN) return NextResponse.json({ error: 'Not configured' }, { status: 503 });
  const raw = await req.text();
  if (!validSignature(raw, req.headers.get('x-hub-signature-256'), secret)) {
    console.warn('[instagram-webhook] bad signature', { hasHeader: !!req.headers.get('x-hub-signature-256'), bytes: raw.length });
    return NextResponse.json({ error: 'Bad signature' }, { status: 401 });
  }
  const payload = JSON.parse(raw) as Payload;
  // One line per delivery (no message text): proves Meta is calling and what it sent.
  console.info('[instagram-webhook]', payload.object, (payload.entry ?? []).map((e) => ({ account: e.id, changes: e.changes?.map((c) => c.field), messaging: e.messaging?.length ?? 0 })));
  if (payload.object !== 'instagram') return NextResponse.json({ ok: true });
  after(async () => {
    for (const entry of payload.entry ?? []) {
      for (const ch of entry.changes ?? []) if (ch.field === 'comments') await onComment(entry.id, ch.value);
      for (const m of entry.messaging ?? []) await onMessage(entry.id, m);
    }
  });
  return NextResponse.json({ ok: true });
}
