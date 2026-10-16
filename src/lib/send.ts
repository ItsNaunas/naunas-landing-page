import { getMailer, textToHtml } from '@/lib/mailer';
import { addNote } from '@/lib/hubspot';
import { logEvent } from '@/lib/events';

// Sending one email from contact@ (Zoho SMTP): dashboard replies/compose (only when Naufal presses Send)
// and the outreach sequence cron. Threads correctly when replying, and logs the email on the HubSpot contact.

export type SendInput = {
  to: string; subject: string; text: string;
  inReplyTo?: string; references?: string[];
  contactId?: string; dealId?: string;
  /** Feed line, e.g. "Reply sent · Mia" (omit to skip). */
  event?: string;
};

export async function sendEmail(m: SendInput): Promise<{ messageId: string }> {
  const mailer = getMailer();
  if (!mailer) throw new Error('Zoho SMTP not configured');
  const info = await mailer.transporter.sendMail({
    from: `Naufal at Naunas <${mailer.from}>`,
    to: m.to,
    subject: m.subject,
    text: m.text,
    html: textToHtml(m.text),
    ...(m.inReplyTo ? { inReplyTo: m.inReplyTo, references: [...(m.references ?? []), m.inReplyTo] } : {}),
  });
  if (m.contactId) {
    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    await addNote(m.contactId, `<p><strong>Email sent: ${esc(m.subject)}</strong></p><p>${esc(m.text).replace(/\n/g, '<br/>')}</p>`, m.dealId)
      .catch((err) => console.warn('[send] HubSpot note failed', err instanceof Error ? err.message : err));
  }
  if (m.event) await logEvent('email_sent', m.event);
  return { messageId: info.messageId };
}
