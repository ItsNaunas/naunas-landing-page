// Pre-call research (2026-10-21), replacing the routine's job 2: the moment someone books a free audit, scan
// their website (lib/scan) and write a research brief from what was seen: what they sell, how an enquiry
// reaches them today, visible leaks on the 8 layers with evidence, 3 tailored questions and 1 quick win.
// Pinned to the HubSpot contact/deal as a "Research brief" note and pinged to Telegram. Read-only research.

import { aiJSON, aiReady } from '@/lib/ai';
import { scanSite, scanFacts, scanText, safeUrl } from '@/lib/scan';
import { addNote, hubspotUrl } from '@/lib/hubspot';
import { escapeHtml } from '@/lib/mailer';
import { notify, alertError } from '@/lib/alert';
import { LAYERS } from '@/lib/leakReport';

const SYSTEM = `You prepare Naufal (Naunas, naunas.co.uk) for a free 30-minute audit call with a business owner. Naunas installs the system between an enquiry and a signed, onboarded client. The 8 Leak Map layers: 1 Attention, 2 Capture, 3 Pipeline, 4 Follow-up, 5 Conversion, 6 Fulfilment, 7 Retention, 8 Attribution.
You get what they wrote when booking, FACTS from a scan of their website (each with the page it was seen on) and the site TEXT. Use only these; never invent facts, numbers, prices or results. Unknown stays unknown.
Return: sells (what they sell and to whom, one or two sentences), enquiryPath (how an enquiry reaches them today: forms, booking, DMs, email, phone), leaks (up to 4 visible leaks, each with layer 1-8, the leak in a sentence, and evidence = what was seen and the page URL), questions (exactly 3 tailored questions for the call, using their own words where possible), quickWin (one thing Naufal could suggest on the call). UK spelling, plain words.`;

const str = { type: 'string' };
const SCHEMA = {
  type: 'object', additionalProperties: false, required: ['sells', 'enquiryPath', 'leaks', 'questions', 'quickWin'],
  properties: {
    sells: str, enquiryPath: str, quickWin: str, questions: { type: 'array', items: str },
    leaks: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['layer', 'leak', 'evidence'], properties: { layer: { type: 'integer' }, leak: str, evidence: str } } },
  },
};
type Out = { sells: string; enquiryPath: string; quickWin: string; questions: string[]; leaks: { layer: number; leak: string; evidence: string }[] };

export async function preCallResearch(b: { name: string; website?: string; business?: string; whatsNotWorking?: string; contactId?: string; dealId?: string; callTime?: string }): Promise<void> {
  if (!b.website || !safeUrl(b.website) || /instagram\.com|^@/.test(b.website) || !aiReady()) return;
  try {
    const scan = await scanSite(b.website);
    if (!scan.ok) return;
    const out = await aiJSON<Out>(SYSTEM, [
      `BOOKER: ${b.name}${b.business ? `, ${b.business}` : ''}`, `IN THEIR WORDS: ${b.whatsNotWorking || '(nothing written)'}`,
      `\nFACTS\n${scanFacts(scan)}`, `\nTEXT\n${scanText(scan, 8000)}`,
    ].join('\n'), 'precall_research', SCHEMA);
    const li = (t: string) => `<li style="margin:0 0 6px">${t}</li>`;
    const html = `<p><b>Research brief</b> (website scan, ${new Date().toISOString().slice(0, 10)})</p>
<p><b>What they sell:</b> ${escapeHtml(out.sells)}</p>
<p><b>How an enquiry reaches them:</b> ${escapeHtml(out.enquiryPath)}</p>
<p><b>Visible leaks</b></p><ol>${out.leaks.filter((l) => l.layer >= 1 && l.layer <= 8).slice(0, 4).map((l) => li(`<b>${l.layer} · ${LAYERS[l.layer - 1]}:</b> ${escapeHtml(l.leak)}<br><i>Seen: ${escapeHtml(l.evidence)}</i>`)).join('')}</ol>
<p><b>Ask on the call</b></p><ol>${out.questions.slice(0, 3).map((q) => li(escapeHtml(q))).join('')}</ol>
<p><b>Quick win to mention:</b> ${escapeHtml(out.quickWin)}</p>`;
    if (b.contactId) await addNote(b.contactId, html, b.dealId);
    // Shown on the lead page and pinned to the deal; the booking itself already pinged Telegram.
  } catch (err) {
    await alertError('Pre-call research', err, 'The booking is fine; only the website research brief failed. The instant brief is still on the deal.');
  }
}
