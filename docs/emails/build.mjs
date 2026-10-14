// Builds the personal-style funnel emails (questionnaire nudges + pre-call) as MailerLite-ready HTML.
// Run: node docs/emails/build.mjs  → writes the .html files next to this script.
// MailerLite merge tags: {$name} first name, {$email}, {$whats_not_working}, {$business_type}, {$call_time},
// {$unsubscribe}, {$address}. Copy lives here so every change is versioned with the site.
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const BOOK = 'https://cal.com/naunas/free-audit?email={$email}';
const font = "font-family:Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#1a1a1a";

const p = (html) => `<p style="margin:0 0 16px;${font}">${html}</p>`;
const quote = (html) => `<p style="margin:0 0 16px;padding:12px 16px;border-left:3px solid #F2613F;background:#faf7f5;${font};color:#444;font-style:italic">${html}</p>`;
const button = (label, href) => `<p style="margin:4px 0 22px"><a href="${href}" style="display:inline-block;background:#F2613F;color:#0C0C0C;font-family:Helvetica,Arial,sans-serif;font-size:15px;font-weight:700;text-decoration:none;padding:12px 22px;border-radius:999px">${label}</a></p>`;
const list = (items) => `<ol style="margin:0 0 16px;padding-left:22px;${font}">${items.map((i) => `<li style="margin:0 0 6px">${i}</li>`).join('')}</ol>`;
const sign = p('Naufal<br><span style="color:#777;font-size:14px">Naunas &middot; naunas.co.uk</span>');

function email({ title, preheader, body }) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
<body style="margin:0;padding:0;background:#ffffff">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${preheader}&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" style="padding:28px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px"><tr><td>
${body.join('\n')}
${sign}
<p style="margin:28px 0 0;padding-top:14px;border-top:1px solid #eee;font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#999">You're getting this because you asked about a free audit at naunas.co.uk. <a href="{$unsubscribe}" style="color:#999">Unsubscribe</a><br>{$address}</p>
</td></tr></table>
</td></tr></table>
</body></html>
`;
}

const emails = {
  'nudge-1': {
    subject: 'Still want that free audit?',
    html: email({
      title: 'Still want that free audit?',
      preheader: 'You told me what was not working. Here is the link to grab a time.',
      body: [
        p("Hi {$name|default('there')},"),
        p('Yesterday you told me this is what’s not working:'),
        quote('{$whats_not_working}'),
        p('That’s fixable, and it’s exactly what the free audit is for. In 30 minutes I’ll show you where it’s leaking and what I’d fix first. No pitch unless you ask for one.'),
        p('Looks like you didn’t get to pick a time, so here’s the calendar:'),
        button('Pick a time &rarr;', BOOK),
        p('If none of the times work, just reply with a couple that do and I’ll make it happen.'),
      ],
    }),
  },
  'nudge-2': {
    subject: 'Should I close your audit request?',
    html: email({
      title: 'Should I close your audit request?',
      preheader: 'Last nudge from me on this one.',
      body: [
        p("Hi {$name|default('there')},"),
        p('Last nudge from me on this one. Your audit request is still open, and the calendar is here if you want it:'),
        button('Book your free audit &rarr;', BOOK),
        p('If now’s not the right time, no problem at all. Reply “later” and I’ll check back in a couple of months, or grab the <a href="https://www.naunas.co.uk/leak-map.pdf" style="color:#F2613F">Leak Map</a> in the meantime. It’s the 8 places businesses like yours usually lose clients, with what to do about each.'),
      ],
    }),
  },
  'pre-call': {
    subject: 'Before we talk',
    html: email({
      title: 'Before we talk',
      preheader: 'What the 30 minutes covers and how to get the most out of it.',
      body: [
        p("Hi {$name|default('there')},"),
        p('You’re booked in for <strong>{$call_time}</strong>. The Google Meet link is in your calendar invite.'),
        p('Here’s what we’ll cover in the 30 minutes:'),
        list([
          'How an enquiry becomes a paying client in your business today, step by step.',
          'Where it’s leaking: slow replies, proposals that go quiet, clients waiting on you.',
          'What I’d fix first, and roughly what that’s worth to you.',
        ]),
        p('To get the most out of it, have a rough idea of how many enquiries you get a month and how many turn into clients. Ballpark is fine.'),
        p('If you want to see what this looks like in practice, here are a few systems I’ve built: <a href="https://www.naunas.co.uk/case-studies?src=pre-call" style="color:#F2613F">naunas.co.uk/case-studies</a>.'),
        p('Need to move it? Use the reschedule link in your confirmation email. And if there’s anything you want me to look at before we speak, just reply here.'),
      ],
    }),
  },
};

for (const [name, { subject, html }] of Object.entries(emails)) {
  writeFileSync(join(here, `${name}.html`), html);
  console.log(`${name}.html  (${html.length} chars)  subject: ${subject}`);
}
