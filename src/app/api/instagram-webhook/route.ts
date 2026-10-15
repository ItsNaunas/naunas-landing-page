import { NextRequest, NextResponse, after } from 'next/server';
import crypto from 'node:crypto';
import { upsertInstagramContact, addNote, hubspotUrl } from '@/lib/hubspot';
import { igProfile, privateReply, hasKeyword } from '@/lib/instagram';
import { notify, line, alertError } from '@/lib/alert';
import { FUNNEL } from '@/config/funnel';

// Instagram webhook (Meta app, "Instagram API with Instagram Login"; subscribed fields: comments, messages).
//  - Comment containing a keyword (FUNNEL.instagram.keywords) → one private-reply DM with the Leak Map link.
//    This is the only automated message to a person, and only because they asked for it in the comment.
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

async function onComment(accountId: string, v: Change['value']) {
  if (!v.id || !v.text || !v.from || v.from.id === accountId) return; // ignore our own replies
  if (!hasKeyword(v.text, FUNNEL.instagram.keywords)) return;
  const handle = v.from.username;
  try {
    await privateReply(v.id, FUNNEL.instagram.dmText(FUNNEL.instagram.dmLink));
  } catch (err) {
    await alertError('Instagram: comment DM', err, `@${handle ?? v.from.id} commented "${v.text}" but got no DM. Send the Leak Map link by hand.`);
    return;
  }
  let contactUrl: string | undefined;
  if (handle) {
    try {
      const c = await upsertInstagramContact(handle);
      await addNote(c.id, `<p>Commented "${v.text.replace(/</g, '&lt;')}" on Instagram → sent the Leak Map DM.</p>`);
      contactUrl = hubspotUrl.contact(c.id);
    } catch (err) {
      await alertError('Instagram: comment → HubSpot', err, 'The DM went out; only the HubSpot record is missing.');
    }
  }
  await notify({
    level: 'lead',
    title: 'Instagram comment → Leak Map sent',
    lines: [line('📸', 'From', handle ? `@${handle}` : v.from.id)],
    quote: v.text,
    next: 'If they reply to the DM, it lands in your Instagram inbox as normal.',
    buttons: [
      ...(handle ? [{ text: 'Profile', url: `https://instagram.com/${handle}` }] : []),
      ...(contactUrl ? [{ text: 'HubSpot', url: contactUrl }] : []),
    ],
  });
}

async function onMessage(accountId: string, m: Messaging) {
  if (!m.message || m.message.is_echo || m.sender.id === accountId) return;
  try {
    const profile = await igProfile(m.sender.id);
    if (!profile.username) return;
    const c = await upsertInstagramContact(profile.username, profile.name);
    if (!c.isNew) return; // only the first DM is news; the conversation itself lives in Instagram
    if (m.message.text) await addNote(c.id, `<p>First Instagram DM:</p><blockquote>${m.message.text.replace(/</g, '&lt;')}</blockquote>`);
    await notify({
      level: 'lead',
      title: 'New Instagram DM',
      lines: [line('📸', 'From', `@${profile.username}${profile.name ? ` (${profile.name})` : ''}`)],
      quote: m.message.text,
      next: 'Reply in Instagram. Once they share an email, the site joins it to this contact.',
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
