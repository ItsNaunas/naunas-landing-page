// "Ask Naunas" (2026-10-22): a chat assistant over the whole dashboard. It starts from the fixed flags
// (lib/ops/missing) and a snapshot of the numbers, and can look further with four read-only tools (a firm,
// a list of firms, a HubSpot record's notes, the content plan). It answers with links into the dashboard
// and suggests next steps as links; it never sends, edits or contacts anything. OpenAI (OPENAI_API_KEY),
// model OPENAI_ASSISTANT_MODEL (default gpt-4.1).

import { aiReady } from '@/lib/ai';
import { missing, type Flag, type Deal } from '@/lib/ops/missing';
import { getProspects, getSettings, CHANNEL_LABEL, type Prospect } from '@/lib/outreach';
import { getOwed, needsYou } from '@/lib/owed';
import { openAsks } from '@/lib/asks';
import { getIndex } from '@/lib/content';
import { channelBoard } from '@/lib/channels';
import { notesForContact, hs, STAGE } from '@/lib/hubspot';
import { getJSON, putJSON } from '@/lib/store';
import { FUNNEL } from '@/config/funnel';

export type ChatMsg = { role: 'user' | 'assistant'; content: string };
export type Answer = { answer: string; actions: { label: string; href: string }[] };

const MODEL = () => process.env.OPENAI_ASSISTANT_MODEL ?? 'gpt-4.1';
// Local click-testing only (LOCAL_STORE_DIR): OPENAI_API_BASE may point at a mock.
const OAI = () => (process.env.LOCAL_STORE_DIR && process.env.OPENAI_API_BASE) || 'https://api.openai.com';
const STAGE_NAME: Record<string, string> = Object.fromEntries(Object.entries(STAGE).map(([k, v]) => [v, k]));
const firmHref = (p: Prospect) => `/dashboard/outreach/firm/${encodeURIComponent(p.id)}`;
const step = (p: Prospect) => (p.wonAt ? 'won' : p.lostAt ? 'lost' : p.bookedAt ? 'booked' : ({ new: 'review', approved: 'researching', drafted: 'ready to start', scheduled: 'in outreach', active: 'in outreach', replied: 'replied', rejected: 'skipped', finished: 'finished', stopped: 'stopped', bounced: 'bounced' } as const)[p.status]);

const SYSTEM = `You are "Ask Naunas", the assistant inside Naufal's business dashboard (naunas.co.uk/dashboard). Naufal runs Naunas alone from Zanzibar: he installs "The Client System" (everything between an enquiry and a signed, onboarded client) for high-value project businesses. Current focus: cold outreach to US residential, full-service interior design firms (3-20 people, owner-led), one channel per firm (Instagram, LinkedIn or email), targets of new firms per channel per day, the free audit call as the conversion step, then a proposal and a deposit.

You get FLAGS (fixed checks that are always true), a SNAPSHOT of the numbers, and tools to look further. Rules:
- Only state facts from the flags, snapshot or tool results. Never invent numbers, names, results or prices. If you don't know, say so and say where to look.
- Money first: promises and replies, then deals going stale, then the outreach engine, then content, then system.
- Be short and direct, UK spelling, plain words. Use short bullet lists. Name the firm or deal and link it.
- Links: markdown [text](/dashboard/...) using the hrefs given in the data. Never make up a URL.
- You cannot send, edit or change anything. Suggest what Naufal should do and put up to 4 next steps in "actions" as {label, href} using hrefs from the data.
- When asked what to do today, give an ordered plan with rough counts (from the snapshot), most valuable first.`;

/** A compact text snapshot of the business right now, plus the flags. */
export async function snapshot(): Promise<{ text: string; flags: Flag[]; deals: Deal[] }> {
  const [{ flags, deals, errors }, prospects, settings, owed, asks, posts] = await Promise.all([
    missing(), getProspects().catch(() => [] as Prospect[]), getSettings().catch(() => null), getOwed().catch(() => []), openAsks().catch(() => []), getIndex().catch(() => []),
  ]);
  const count = (f: (p: Prospect) => boolean) => prospects.filter(f).length;
  const L: string[] = [`Now: ${new Date().toISOString()} (Naufal is UTC+3).`];
  L.push(`FLAGS (${flags.length}):`, ...flags.map((f) => `- [${f.level}] ${f.area}: ${f.title}${f.detail ? ` (${f.detail})` : ''} -> ${f.href}`));
  L.push('\nPROSPECTS by step: ' + ['review', 'researching', 'ready to start', 'in outreach', 'replied', 'booked', 'won', 'lost', 'skipped'].map((s) => `${s} ${count((p) => step(p) === s)}`).join(', ') + ' (/dashboard/outreach/prospects)');
  if (settings) {
    L.push('CHANNELS today (new/target, follow-ups due, in sequence, new this week): ' + channelBoard(prospects, settings).map((c) => `${c.label} ${c.newToday}/${c.target}, ${c.followupsToday}, ${c.inSequence}, ${c.newThisWeek}`).join(' | '));
    L.push(`Email sending ${settings.sending ? 'ON' : 'OFF'}.`);
  }
  for (const c of ['instagram', 'linkedin', 'email'] as const) {
    const f = prospects.filter((p) => p.channel === c && (p.scheduledAt || p.startedAt));
    L.push(`RESULTS ${CHANNEL_LABEL[c]}: started ${f.length}, replied ${f.filter((p) => p.igRepliedAt || p.repliedAt || p.bookedAt).length}, booked ${f.filter((p) => p.bookedAt).length}, won ${f.filter((p) => p.wonAt).length}, lost ${f.filter((p) => p.lostAt).length}`);
  }
  const styles = ['A', 'B', 'C'].map((s) => { const f = prospects.filter((p) => p.dmStyle === s); return `${s} ${f.filter((p) => p.igRepliedAt).length}/${f.length}`; });
  L.push(`OPENER TEST replies/sent: ${styles.join(', ')} (/dashboard/outreach/results)`);
  const replied = prospects.filter((p) => step(p) === 'replied' || step(p) === 'booked').slice(0, 15);
  if (replied.length) L.push('REPLIED/BOOKED FIRMS: ' + replied.map((p) => `${p.firm} [${step(p)}, ${p.channel ?? '?'}] ${firmHref(p)}`).join('; '));
  const o = needsYou(owed);
  L.push(`PROMISES: ${o.toSend.length} to send, ${o.toNudge.length} nudges due, ${o.waiting.length} waiting. ASKS open: ${asks.length}.`);
  L.push(`DEALS open (${deals.length}): ` + (deals.map((d) => `${d.name} [${STAGE_NAME[d.stage] ?? d.stage}, idle ${d.idleDays}d${d.amount ? `, £${d.amount}` : ''}] /dashboard/pipeline`).join('; ') || 'none'));
  const now = Date.now();
  const recent = posts.filter((r) => Date.parse(r.when) > now - 7 * 86_400_000 && Date.parse(r.when) <= now && (r.status === 'done' || r.status === 'partial')).length;
  const next = posts.filter((r) => r.status === 'scheduled' && Date.parse(r.when) > now).sort((a, b) => a.when.localeCompare(b.when))[0];
  L.push(`CONTENT: ${recent} posted in the last 7 days (target ${FUNNEL.content.weeklyTarget}/week); next scheduled ${next ? next.when : 'none'} (/dashboard/content).`);
  if (errors.length) L.push(`DATA ERRORS: ${errors.join(' | ')}`);
  return { text: L.join('\n'), flags, deals };
}

// ---------------------------------------------------------------- Tools (read-only)

const TOOLS = [
  { type: 'function', function: { name: 'find_firm', description: 'Everything about one cold-outreach firm: research, channel, timeline, drafts summary, leak report, HubSpot ids.', parameters: { type: 'object', additionalProperties: false, required: ['query'], properties: { query: { type: 'string', description: 'Firm name (or part of it) or firm id' } } } } },
  { type: 'function', function: { name: 'list_firms', description: 'Firms at one step of the outreach pipeline.', parameters: { type: 'object', additionalProperties: false, required: ['step'], properties: { step: { type: 'string', enum: ['review', 'researching', 'ready to start', 'in outreach', 'replied', 'booked', 'won', 'lost', 'skipped'] } } } } },
  { type: 'function', function: { name: 'hubspot_notes', description: 'The latest notes on a HubSpot contact (call summaries, replies, research briefs).', parameters: { type: 'object', additionalProperties: false, required: ['contactId'], properties: { contactId: { type: 'string' } } } } },
  { type: 'function', function: { name: 'content_plan', description: 'Content posts from the last 7 days and the next 14 days with their status per channel.', parameters: { type: 'object', additionalProperties: false, properties: {} } } },
];

async function runTool(name: string, args: Record<string, string>): Promise<unknown> {
  if (name === 'find_firm') {
    const q = (args.query ?? '').toLowerCase();
    const p = (await getProspects()).find((x) => x.id === args.query) ?? (await getProspects()).find((x) => x.firm.toLowerCase().includes(q));
    if (!p) return { error: 'No firm matches that.' };
    const { drafts, ...rest } = p;
    return { ...rest, step: step(p), href: firmHref(p), research: drafts?.research, dossier: drafts?.dossier, subject: drafts?.subject, opener: drafts?.dm, report: p.reportToken ? `/dashboard/outreach/report/${p.reportToken}` : undefined, lead: p.contactId ? `/dashboard/leads/${p.contactId}` : undefined };
  }
  if (name === 'list_firms') {
    return (await getProspects()).filter((p) => step(p) === args.step).slice(0, 40).map((p) => ({ firm: p.firm, id: p.id, channel: p.channel, city: p.city, href: firmHref(p), reason: p.status === 'rejected' ? p.fitWhy[0] : undefined }));
  }
  if (name === 'hubspot_notes') {
    if (!/^\d+$/.test(args.contactId ?? '')) return { error: 'contactId must be a HubSpot contact id' };
    const c = await hs<{ properties: Record<string, string | null> }>(`/crm/v3/objects/contacts/${args.contactId}?properties=firstname,lastname,email,naunas_outreach_status`).catch(() => null);
    const notes = (await notesForContact(args.contactId)).slice(0, 6).map((n) => ({ at: n.at, text: n.text.slice(0, 1200) }));
    return { contact: c?.properties, notes, lead: `/dashboard/leads/${args.contactId}` };
  }
  if (name === 'content_plan') {
    const now = Date.now();
    return (await getIndex()).filter((r) => Math.abs(Date.parse(r.when) - now) < 14 * 86_400_000 && Date.parse(r.when) > now - 7 * 86_400_000)
      .map((r) => ({ when: r.when, status: r.status, idea: r.idea.slice(0, 120), channels: r.channels, href: `/dashboard/content/${r.id}` }));
  }
  return { error: 'Unknown tool' };
}

// ---------------------------------------------------------------- Chat

const ANSWER_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['answer', 'actions'],
  properties: {
    answer: { type: 'string', description: 'Markdown: short paragraphs and - bullets, [links](/dashboard/...)' },
    actions: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['label', 'href'], properties: { label: { type: 'string' }, href: { type: 'string' } } } },
  },
};
type OAIMsg = { role: string; content?: string | null; tool_calls?: { id: string; type: 'function'; function: { name: string; arguments: string } }[]; tool_call_id?: string };

const safeHref = (h: string) => /^\/dashboard(\/|$)/.test(h) || /^https:\/\/(app(-eu1)?\.hubspot\.com|www\.naunas\.co\.uk)\//.test(h);

export async function ask(history: ChatMsg[], ctx?: string): Promise<Answer> {
  if (!aiReady()) throw new Error('OPENAI_API_KEY is not set.');
  const snap = ctx ?? (await snapshot()).text;
  const messages: OAIMsg[] = [{ role: 'system', content: SYSTEM }, { role: 'system', content: snap }, ...history.slice(-12).map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }))];
  for (let round = 0; round < 5; round++) {
    const res = await fetch(`${OAI()}/v1/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: MODEL(), messages, tools: TOOLS, response_format: { type: 'json_schema', json_schema: { name: 'answer', strict: true, schema: ANSWER_SCHEMA } } }),
    });
    const b = await res.json() as { choices?: { message: OAIMsg }[]; error?: { message?: string } };
    if (!res.ok) throw new Error(`OpenAI → ${res.status}: ${b.error?.message ?? ''}`);
    const msg = b.choices?.[0]?.message;
    if (!msg) throw new Error('OpenAI returned nothing');
    if (msg.tool_calls?.length) {
      messages.push(msg);
      for (const call of msg.tool_calls) {
        let args: Record<string, string> = {};
        try { args = JSON.parse(call.function.arguments || '{}'); } catch { /* empty args */ }
        const out = await runTool(call.function.name, args).catch((e) => ({ error: String(e instanceof Error ? e.message : e) }));
        messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(out).slice(0, 12000) });
      }
      continue;
    }
    const a = JSON.parse(msg.content ?? '{}') as Answer;
    return { answer: a.answer ?? '', actions: (a.actions ?? []).filter((x) => safeHref(x.href)).slice(0, 4) };
  }
  throw new Error('The assistant took too many steps. Ask a narrower question.');
}

// ---------------------------------------------------------------- Daily briefing (home page)

export type Briefing = Answer & { at: string; flags: number };
const briefPath = (day: string) => `ops/briefing/${day}.json`;
const today = () => new Date().toLocaleDateString('en-CA', { timeZone: FUNNEL.ownerTz });
export const getBriefing = () => getJSON<Briefing | null>(briefPath(today()), null);

/** Today's start-of-day plan, written once (health cron at 09:00 Zanzibar, or the Refresh button). */
export async function writeBriefing(): Promise<Briefing> {
  const s = await snapshot();
  const a = await ask([{ role: 'user', content: 'Write my start-of-day briefing: an ordered plan for today (5-7 bullets, most valuable first, each with the count and a link), then one line on the single biggest thing I am missing out on. No preamble.' }], s.text);
  const b: Briefing = { ...a, at: new Date().toISOString(), flags: s.flags.length };
  await putJSON(briefPath(today()), b);
  return b;
}
