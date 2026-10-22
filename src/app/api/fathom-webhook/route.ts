import { NextRequest, NextResponse, after } from 'next/server';
import { verifyFathomWebhook, type FathomMeeting } from '@/lib/fathom';
import { crmSearch, addNote, hubspotUrl } from '@/lib/hubspot';
import { notify, line, alertError } from '@/lib/alert';
import { logEvent } from '@/lib/events';
import { afterCall } from '@/lib/postcall';
import { FUNNEL } from '@/config/funnel';

// Fathom "new meeting content ready" webhook (env FATHOM_WEBHOOK_SECRET, whsec_…): the moment a call is
// processed, put the summary + action items + recording link on the attendee's HubSpot contact and ping
// Telegram. If the guest's deal is at Audit booked, lib/postcall moves it to Audit done and starts the recap +
// proposal draft (was the Claude routine's job 2).

const md = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\n/g, '<br/>');

export async function POST(req: NextRequest) {
  const secret = process.env.FATHOM_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: 'Not configured' }, { status: 503 });
  const raw = await req.text();
  if (!verifyFathomWebhook(raw, req.headers, secret)) return NextResponse.json({ error: 'Bad signature' }, { status: 401 });
  const m = JSON.parse(raw) as FathomMeeting;

  after(async () => {
    try {
      const guests = (m.calendar_invitees ?? []).filter((i) => i.is_external !== false && i.email && !/naunas\.co\.uk$/i.test(i.email));
      const summary = m.default_summary?.markdown_formatted ?? '';
      const actions = (m.action_items ?? []).map((a) => `• ${a.description}`).join('\n');
      let contactLink: string | undefined;
      let proposalPath: string | null = null;
      for (const g of guests) {
        const found = await crmSearch('contacts', [{ propertyName: 'email', operator: 'EQ', value: g.email!.toLowerCase() }]);
        const id = found.results[0]?.id;
        if (!id) continue;
        contactLink ??= hubspotUrl.contact(id);
        await addNote(id, `<p><strong>Call recording: ${md(m.meeting_title ?? m.title)}</strong> · <a href="${m.share_url ?? m.url}">watch</a></p>`
          + (summary ? `<p>${md(summary)}</p>` : '') + (actions ? `<p><strong>Action items</strong><br/>${md(actions)}</p>` : ''));
        proposalPath ??= await afterCall({ contactId: id, name: g.name ?? undefined, email: g.email!.toLowerCase() }, { title: m.meeting_title ?? m.title, summary, actions: (m.action_items ?? []).map((a) => a.description) }).catch(() => null);
      }
      // No outside guest (an internal or solo recording): name it by the meeting instead of "a call".
      const who = guests.map((g) => g.name || g.email).join(', ') || m.meeting_title || m.title || 'a call';
      await logEvent('call_recorded', `Call recorded · ${who}`, m.share_url ?? m.url);
      await notify({
        level: 'lead', title: `Call processed: ${who}`,
        lines: [line('🎬', 'Meeting', m.meeting_title ?? m.title), actions ? `📝 <b>Action items</b>\n${actions.slice(0, 600).replace(/&/g, '&amp;').replace(/</g, '&lt;')}` : ''],
        next: proposalPath ? 'Recap email and proposal draft are ready: check the scope, set the price, publish.' : 'Send the same-day recap while it’s fresh.',
        buttons: [...(proposalPath ? [{ text: 'Open proposal draft', url: `${FUNNEL.site}${proposalPath}` }] : []), { text: 'Recording', url: m.share_url ?? m.url }, ...(contactLink ? [{ text: 'HubSpot', url: contactLink }] : [])],
      });
    } catch (err) {
      await alertError('Fathom: call processed', err, 'The recording is fine in Fathom; only the HubSpot note/alert failed.');
    }
  });
  return NextResponse.json({ ok: true });
}
