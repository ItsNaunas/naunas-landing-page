import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { addToGroup, LEAK_MAP_GROUP } from '@/lib/mailerlite';
import { getMailer, textToHtml } from '@/lib/mailer';
import { upsertContact, inferLeadSource, splitName } from '@/lib/hubspot';
import type { Attribution } from '@/lib/attribution';
import { alert, alertError } from '@/lib/alert';

// Pop-up sign-up for the Leak Map. Adds the person to the MailerLite "Leak Map" group, which
// starts the 8-day course (day 0 delivers the PDF). Until that automation is switched on
// (LEAK_MAP_COURSE_LIVE=true on Vercel), the PDF link is emailed directly from contact@ instead,
// so nobody signs up and gets nothing.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PDF_URL = 'https://www.naunas.co.uk/leak-map.pdf';

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Record<string, unknown>;
  const str = (k: string) => (typeof body[k] === 'string' ? (body[k] as string).trim() : '');
  const name = str('name');
  const email = str('email');
  const clientValue = str('clientValue');
  const src = str('src') || 'popup';
  const attribution = (body.attribution && typeof body.attribution === 'object' ? body.attribution : {}) as Attribution;

  if (!name || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'Please add your first name and a valid email.' }, { status: 400 });
  }

  try {
    await addToGroup({ email, name, clientValue, source: src, group: LEAK_MAP_GROUP });
  } catch (err) {
    await alertError('LeakMap: MailerLite', err);
    // Still deliver the PDF by email below; the sign-up itself shouldn't fail for the visitor.
  }

  if (process.env.LEAK_MAP_COURSE_LIVE !== 'true') {
    after(async () => {
      const mailer = getMailer();
      if (!mailer) return;
      const text = [
        `Hi ${name.split(/\s+/)[0]},`,
        `Here's your Leak Map: ${PDF_URL}`,
        'Start with the last page: score yourself 0–2 on each of the 8 layers, then reply with your weakest one. I read every reply.',
        'Naufal\nnaunas.co.uk',
      ].join('\n\n');
      try {
        await mailer.transporter.sendMail({ from: `Naufal at Naunas <${mailer.from}>`, to: email, subject: 'Your Leak Map', text, html: textToHtml(text) });
      } catch (err) {
        await alertError('LeakMap: fallback email', err);
      }
    });
  }

  after(async () => {
    try {
      await upsertContact({ email, ...splitName(name), client_value: clientValue || undefined, leadSource: inferLeadSource('leak_map_popup', attribution), attribution });
    } catch (err) {
      await alertError('LeakMap: HubSpot', err);
    }
  });

  // A sign-up who says a client is worth $25k+ deserves a personal note from Naufal on day 1, not just the course.
  if (clientValue === '$25k-100k' || clientValue === '$100k+') {
    after(() => alert(`High-value Leak Map sign-up: ${name} <${email}>\nClient worth ${clientValue} · source ${src}\nWorth a personal email today.`, 'lead'));
  }

  return NextResponse.json({ success: true, pdf: '/leak-map.pdf' });
}
