import { escapeHtml } from '@/lib/mailer';

// Pre-call brief, built the moment someone books: everything the site knows, the likely leaks (their own
// words matched against the 8 Leak Map layers) and questions worth asking. Emailed to Naufal and added to the
// HubSpot deal. A Claude routine adds web research (their site/IG) before the call; this is the instant floor.

type Layer = { n: number; name: string; words: RegExp; ask: string };
const LAYERS: Layer[] = [
  // Attention = not enough people finding them. Merely naming a channel ("through Instagram") isn't a leak here.
  { n: 1, name: 'Attention', words: /(not enough (leads|enquir|inquir|clients)|more (leads|enquir|clients)|traffic|visibility|nobody (finds|sees|knows)|grow (our|my) audience|\bseo\b)/i, ask: 'Where do your best clients first hear about you, and how many new enquiries a month does that bring?' },
  { n: 2, name: 'Capture', words: /\b(reply|respond|slow|cold|miss(ed|ing)?|enquir|inquir|dm|inbox|answer)/i, ask: 'When an enquiry lands at 9pm on a Friday, what happens to it, and how long until they hear back?' },
  { n: 3, name: 'Pipeline', words: /\b(crm|spreadsheet|track|pipeline|lost track|organi[sz]|all over|whatsapp|notes)/i, ask: 'Where does every live enquiry live right now, and could you list them all in 2 minutes?' },
  { n: 4, name: 'Follow-up', words: /\b(follow|chas|ghost|quiet|no response|went nowhere|then nothing|never hear|forget|nudge)/i, ask: 'After a good first call, what do you send, and what happens if they go quiet?' },
  { n: 5, name: 'Conversion', words: /\b(proposal|quote|close|convert|sign|deposit|pricing|price|contract)/i, ask: 'How many proposals went out last quarter, and how many signed? What happens between sending and signing?' },
  { n: 6, name: 'Fulfilment', words: /\b(onboard|kick-?off|deliver|project|updates?|portal|clients? ask|what happens next|admin)/i, ask: 'From deposit to day one of the work, what does the client experience, and how much of it is you on email?' },
  { n: 7, name: 'Retention', words: /\b(referr|repeat|review|testimonial|retain|come back|word of mouth)/i, ask: 'How many of last year’s clients came back or referred someone, and did you ask them to?' },
  { n: 8, name: 'Attribution', words: /\b(source|where (they|clients) come|roi|which channel|attribution|measure|numbers)/i, ask: 'Which channel brought your three biggest clients this year? How do you know?' },
];

export function likelyLeaks(text: string): Layer[] {
  const hits = LAYERS.filter((l) => l.words.test(text));
  // Nothing matched (or a one-word answer): Capture + Follow-up are where most businesses leak first.
  return hits.length ? hits.slice(0, 3) : [LAYERS[1], LAYERS[3]];
}

export type BriefInput = {
  name: string;
  email: string;
  callTime?: string;
  business?: string;
  clientValue?: string;
  revenue?: string;
  website?: string;
  whatsNotWorking?: string;
  meetingUrl?: string;
  dealUrl?: string;
};

const row = (label: string, value?: string) => (value ? `<tr><td style="padding:4px 14px 4px 0;color:#777;white-space:nowrap;vertical-align:top">${label}</td><td style="padding:4px 0">${value}</td></tr>` : '');
const h2 = (t: string) => `<h2 style="margin:22px 0 8px;font-size:15px;text-transform:uppercase;letter-spacing:.08em;color:#F2613F">${t}</h2>`;
const link = (url: string, text: string) => `<a href="${escapeHtml(url)}" style="color:#F2613F">${escapeHtml(text)}</a>`;

export function preCallBrief(b: BriefInput): { subject: string; html: string } {
  const leaks = likelyLeaks(`${b.whatsNotWorking ?? ''} ${b.business ?? ''}`);
  const site = b.website ? (/^https?:\/\//.test(b.website) ? b.website : `https://${b.website.replace(/^@/, 'instagram.com/')}`) : undefined;
  const html = `<div style="font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.55;color:#1a1a1a;max-width:620px">
<p style="margin:0 0 4px;font-size:12px;text-transform:uppercase;letter-spacing:.1em;color:#999">Pre-call brief</p>
<h1 style="margin:0 0 6px;font-size:24px">${escapeHtml(b.name)}${b.business ? ` <span style="color:#777;font-weight:400">· ${escapeHtml(b.business)}</span>` : ''}</h1>
<p style="margin:0 0 16px;color:#555">${b.callTime ? `📅 ${escapeHtml(b.callTime)}` : 'Call time: see calendar'}</p>
<table style="border-collapse:collapse;font-size:15px">
${row('Email', escapeHtml(b.email))}
${row('Client worth', b.clientValue && escapeHtml(b.clientValue))}
${row('Revenue', b.revenue && `${escapeHtml(b.revenue)} a month`)}
${row('Website', site && link(site, b.website!))}
</table>
${h2('In their words')}
<blockquote style="margin:0;padding:10px 14px;border-left:3px solid #F2613F;background:#faf7f5;font-style:italic">${escapeHtml(b.whatsNotWorking || 'They didn’t say. Open with: “What made you book this today?”')}</blockquote>
${h2('Likely leaks')}
<ol style="margin:0;padding-left:20px">${leaks.map((l) => `<li style="margin:0 0 6px"><b>Layer ${l.n} · ${l.name}</b></li>`).join('')}</ol>
${h2('Questions to ask')}
<ol style="margin:0;padding-left:20px">${leaks.map((l) => `<li style="margin:0 0 8px">${escapeHtml(l.ask)}</li>`).join('')}<li style="margin:0 0 8px">If you fixed one thing in the next 30 days, what would it be worth?</li></ol>
${h2('Links')}
<p style="margin:0">${[b.meetingUrl && link(b.meetingUrl, 'Join the call'), b.dealUrl && link(b.dealUrl, 'Deal in HubSpot'), site && link(site, 'Their website')].filter(Boolean).join(' &nbsp;·&nbsp; ')}</p>
<p style="margin:22px 0 0;font-size:13px;color:#999">Built automatically at booking. A fuller brief with research on their site follows before the call.</p>
</div>`;
  return { subject: `Pre-call brief: ${b.name}${b.business ? ` (${b.business})` : ''}${b.callTime ? ` · ${b.callTime}` : ''}`, html };
}
