import nodemailer from 'nodemailer';

// Zoho SMTP (contact@naunas.co.uk). Env: ZOHO_SMTP_HOST/PORT/USER/PASS.
export function getMailer() {
  const host = process.env.ZOHO_SMTP_HOST;
  const user = process.env.ZOHO_SMTP_USER;
  const pass = process.env.ZOHO_SMTP_PASS;
  if (!host || !user || !pass) return null;
  const transporter = nodemailer.createTransport({
    host,
    port: Number(process.env.ZOHO_SMTP_PORT ?? 465),
    secure: true,
    auth: { user, pass },
  });
  return { transporter, from: user };
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Plain-text paragraphs → simple HTML email body. */
export function textToHtml(text: string): string {
  return text
    .split('\n\n')
    .map((p) => `<p style="margin:0 0 14px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#222">${escapeHtml(p).replace(/\n/g, '<br/>')}</p>`)
    .join('');
}
