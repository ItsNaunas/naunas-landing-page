import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { getMailer, escapeHtml, textToHtml } from '@/lib/mailer';
import { CAL_URL, isQualified, priorityOf } from '@/lib/booking';
import { upsertContact, ensureDeal, addNote, inferLeadSource, splitName, STAGE } from '@/lib/hubspot';
import type { Attribution } from '@/lib/attribution';

// The free-audit questionnaire (and the contact section). No database: the answers are emailed to
// contact@ (reply-to = the lead) and the lead gets an instant auto-reply. Qualified leads are shown
// the calendar on the page; smaller ones are told Naufal will reply by email.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Record<string, unknown>;
  const str = (k: string) => (typeof body[k] === 'string' ? (body[k] as string).trim() : '');
  const name = str('name');
  const email = str('email');
  const business = str('business');
  const clientValue = str('clientValue');
  const revenue = str('revenue');
  const website = str('website');
  const message = str('message').slice(0, 4000);
  const src = str('src') || 'site';
  const attribution = (body.attribution && typeof body.attribution === 'object' ? body.attribution : {}) as Attribution;

  if (!name || !EMAIL_RE.test(email) || !message) {
    return NextResponse.json({ error: 'Please fill in your name, a valid email and what’s not working.' }, { status: 400 });
  }

  // Contact-section messages have no money answers: treat as qualified (Naufal decides).
  const qualified = clientValue && revenue ? isQualified(clientValue, revenue) : true;

  const mailer = getMailer();
  if (!mailer) {
    console.error('[Enquiry] Missing ZOHO_SMTP_* env');
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  }

  const flag = clientValue === '$100k+' || revenue === '$250k+' || clientValue === '$25k-100k' ? '⭐ ' : '';
  try {
    await mailer.transporter.sendMail({
      from: `Naunas website <${mailer.from}>`,
      to: mailer.from,
      replyTo: `${name} <${email}>`,
      subject: `${flag}New enquiry: ${name}${business ? ` (${business})` : ''}${qualified ? '' : ' [small: reply by email]'}`,
      html: [
        `<p><strong>${escapeHtml(name)}</strong> · ${escapeHtml(email)}</p>`,
        business ? `<p>Business: ${escapeHtml(business)}</p>` : '',
        clientValue ? `<p>A new client is worth: ${escapeHtml(clientValue)}</p>` : '',
        revenue ? `<p>Monthly revenue: ${escapeHtml(revenue)}</p>` : '',
        website ? `<p>Website/handle: ${escapeHtml(website)}</p>` : '',
        `<p>What's not working:</p><div style="white-space:pre-wrap">${escapeHtml(message)}</div>`,
        `<p style="color:#888">${qualified ? 'Shown the booking calendar.' : 'Below the booking threshold: told you’ll reply by email.'} Source: ${escapeHtml(src)} · Reply to this email to answer them directly.</p>`,
      ].filter(Boolean).join('\n'),
    });
  } catch (err) {
    console.error('[Enquiry] Notify email failed:', err);
    return NextResponse.json({ error: 'Could not send your answers.' }, { status: 500 });
  }

  after(async () => {
    const first = name.split(/\s+/)[0];
    const text = qualified
      ? [
          `Hi ${first},`,
          'Thanks for filling that in. I’ve got your answers and I’ll look at them before we speak.',
          `If you didn’t get a chance to pick a time, you can book your free audit here:\n${CAL_URL}`,
          'Naufal\nnaunas.co.uk',
        ].join('\n\n')
      : [
          `Hi ${first},`,
          'Thanks for filling that in. I’ve got your answers and I’ll look at them myself. You’ll hear back from me within 48 hours with what I’d fix first.',
          'Naufal\nnaunas.co.uk',
        ].join('\n\n');
    try {
      await mailer.transporter.sendMail({ from: `Naufal at Naunas <${mailer.from}>`, to: email, subject: 'Got your answers', text, html: textToHtml(text) });
    } catch (err) {
      console.error('[Enquiry] Auto-reply failed:', err);
    }
  });

  // CRM: contact always; deal only for qualified questionnaire leads and contact-form messages.
  after(async () => {
    try {
      const isContactForm = src === 'contact-section';
      const leadSource = inferLeadSource(isContactForm ? 'contact_form' : 'audit_questionnaire', attribution);
      const contactId = await upsertContact({
        email, ...splitName(name), website, business_type: business || undefined,
        client_value: clientValue || undefined, monthly_revenue_band: revenue || undefined,
        whats_not_working: message, leadSource, attribution,
      });
      await addNote(contactId, `<p><strong>${isContactForm ? 'Contact form' : 'Free-audit questionnaire'}</strong> (${escapeHtml(src)})</p>`
        + `<p>${escapeHtml(message)}</p><p>${qualified ? 'Shown the booking calendar.' : 'Below threshold: reply by email.'}</p>`);
      if (qualified) await ensureDeal({ contactId, name: `${name}${business ? ` · ${business}` : ''}`, stage: STAGE.newEnquiry, leadSource, attribution, priority: priorityOf(clientValue, revenue) });
    } catch (err) {
      console.error('[Enquiry] HubSpot failed:', err);
    }
  });

  return NextResponse.json({ success: true, qualified });
}
