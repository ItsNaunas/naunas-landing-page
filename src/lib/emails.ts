import { escapeHtml } from '@/lib/mailer';

// One-off emails the site sends itself through Zoho (contact@). Multi-email sequences live in MailerLite;
// anything sent once, at a moment the site already knows about, lives here so it doesn't use an automation slot.
// Personal plain style, matching docs/emails/*.html.

const font = 'font-family:Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#1a1a1a';
const p = (html: string) => `<p style="margin:0 0 16px;${font}">${html}</p>`;
const list = (items: string[]) => `<ol style="margin:0 0 16px;padding-left:22px;${font}">${items.map((i) => `<li style="margin:0 0 6px">${i}</li>`).join('')}</ol>`;
const sign = p('Naufal<br><span style="color:#777;font-size:14px">Naunas &middot; naunas.co.uk</span>');

function wrap(preheader: string, body: string[]) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#ffffff">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" style="padding:28px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px"><tr><td>
${body.join('\n')}
${sign}
</td></tr></table></td></tr></table></body></html>`;
}

export type Email = { subject: string; html: string; text: string };

/** Sent when an attendee is marked as a no-show in Cal.com: no guilt, one link to rebook. */
export function noShowEmail({ firstName, rebookUrl }: { firstName?: string; rebookUrl: string }): Email {
  const name = firstName || 'there';
  const html = wrap('No worries, here’s a link to pick a new time.', [
    p(`Hi ${escapeHtml(name)},`),
    p('Looks like we missed each other today. No worries at all, things come up.'),
    p(`If you still want the audit, grab whatever time suits you: <a href="${escapeHtml(rebookUrl)}" style="color:#F2613F">pick a new time</a>.`),
    p('Or just reply with a couple of times that work and I’ll make one of them happen.'),
  ]);
  const text = [`Hi ${name},`, 'Looks like we missed each other today. No worries at all, things come up.', `If you still want the audit, grab whatever time suits you: ${rebookUrl}`, 'Or just reply with a couple of times that work and I’ll make one of them happen.', 'Naufal\nNaunas · naunas.co.uk'].join('\n\n');
  return { subject: 'Missed you today', html, text };
}

/** Sent once, when the deposit is paid: welcome, what happens next, what we need. */
export function onboardingEmail({ firstName }: { firstName?: string }): Email {
  const name = firstName || 'there';
  const steps = [
    '<b>Within 1 working day:</b> I’ll send a short kick-off form (logins, brand assets, who’s involved).',
    '<b>Kick-off call:</b> 30 minutes to lock the plan and the first milestone. I’ll send times with the form.',
    '<b>Then the build:</b> you’ll get an update at every milestone, in one place, so you never have to chase me.',
  ];
  const html = wrap('Deposit received. Here’s exactly what happens next.', [
    p(`Hi ${escapeHtml(name)},`),
    p('Deposit received, thank you. We’re officially underway.'),
    p('Here’s exactly what happens next:'),
    list(steps),
    p('To save time, start gathering: logins for the tools you use today (email, CRM or spreadsheet, booking, payments) and your logo/brand files. Don’t send passwords by email: I’ll share a secure way to pass them over.'),
    p('Any questions before then, just reply here. It comes straight to me.'),
  ]);
  const text = [`Hi ${name},`, 'Deposit received, thank you. We’re officially underway.', `Here’s exactly what happens next:\n${steps.map((s, i) => `${i + 1}. ${s.replace(/<\/?b>/g, '')}`).join('\n')}`, 'To save time, start gathering: logins for the tools you use today (email, CRM or spreadsheet, booking, payments) and your logo/brand files. Don’t send passwords by email: I’ll share a secure way to pass them over.', 'Any questions before then, just reply here. It comes straight to me.', 'Naufal\nNaunas · naunas.co.uk'].join('\n\n');
  return { subject: 'You’re in: what happens next', html, text };
}

/** Sent the moment someone books (and again with the new time if they reschedule). */
export function preCallEmail({ firstName, callTime, rescheduled }: { firstName?: string; callTime?: string; rescheduled?: boolean }): Email {
  const name = escapeHtml(firstName || 'there');
  const when = callTime ? escapeHtml(callTime) : 'the time you picked';
  const covers = [
    'How an enquiry becomes a paying client in your business today, step by step.',
    'Where it’s leaking: slow replies, proposals that go quiet, clients waiting on you.',
    'What I’d fix first, and roughly what that’s worth to you.',
  ];
  const html = wrap('What the 30 minutes covers and how to get the most out of it.', [
    p(`Hi ${name},`),
    p(`${rescheduled ? 'Thanks for moving it. You’re now booked in for' : 'You’re booked in for'} <strong>${when}</strong>. The Google Meet link is in your calendar invite.`),
    p('Here’s what we’ll cover in the 30 minutes:'),
    list(covers),
    p('To get the most out of it, have a rough idea of how many enquiries you get a month and how many turn into clients. Ballpark is fine.'),
    p('If you want to see what this looks like in practice, here are a few systems I’ve built: <a href="https://www.naunas.co.uk/case-studies?src=pre-call" style="color:#F2613F">naunas.co.uk/case-studies</a>.'),
    p('Need to move it? Use the reschedule link in your confirmation email. And if there’s anything you want me to look at before we speak, just reply here.'),
  ]);
  const text = [
    `Hi ${firstName || 'there'},`,
    `${rescheduled ? 'Thanks for moving it. You’re now booked in for' : 'You’re booked in for'} ${callTime || 'the time you picked'}. The Google Meet link is in your calendar invite.`,
    `Here’s what we’ll cover in the 30 minutes:\n${covers.map((c, i) => `${i + 1}. ${c}`).join('\n')}`,
    'To get the most out of it, have a rough idea of how many enquiries you get a month and how many turn into clients. Ballpark is fine.',
    'A few systems I’ve built: https://www.naunas.co.uk/case-studies?src=pre-call',
    'Need to move it? Use the reschedule link in your confirmation email. And if there’s anything you want me to look at before we speak, just reply here.',
    'Naufal\nNaunas · naunas.co.uk',
  ].join('\n\n');
  return { subject: rescheduled ? 'Your new time, and before we talk' : 'Before we talk', html, text };
}
