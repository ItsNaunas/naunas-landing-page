// "Ask Naunas" (2026-10-22, widened 2026-11-06): a chat assistant over the whole business. It starts from the
// fixed flags (lib/ops/missing) and a snapshot (numbers, build progress, health, activity, clients, vault), and
// can look further with read-only tools. Answers come back as structured cards (headline, sections of items
// with urgency and links, follow-ups, sources) so the panel can lay them out. It never sends, edits or contacts
// anything. OpenAI (OPENAI_API_KEY), model OPENAI_ASSISTANT_MODEL (default gpt-4.1).

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
import { progressDigest, lastHealth, recentActivity, getVault, type VaultItem } from '@/lib/assistantData';
import { clientsData } from '@/lib/clients';
import { overdueInvoices, money } from '@/lib/invoices';
import { getLearning } from '@/lib/contentLearning';
import { getMarket } from '@/lib/marketWatch';

export type ChatMsg = { role: 'user' | 'assistant'; content: string };
import type { Answer, Urgency } from '@/lib/answerShape';
export type { Answer } from '@/lib/answerShape';

const MODEL = () => process.env.OPENAI_ASSISTANT_MODEL ?? 'gpt-4.1';
// Local click-testing only (LOCAL_STORE_DIR): OPENAI_API_BASE may point at a mock.
const OAI = () => (process.env.LOCAL_STORE_DIR && process.env.OPENAI_API_BASE) || 'https://api.openai.com';
const STAGE_NAME: Record<string, string> = Object.fromEntries(Object.entries(STAGE).map(([k, v]) => [v, k]));
const firmHref = (p: Prospect) => `/dashboard/outreach/firm/${encodeURIComponent(p.id)}`;
const step = (p: Prospect) => (p.wonAt ? 'won' : p.lostAt ? 'lost' : p.bookedAt ? 'booked' : ({ new: 'review', approved: 'researching', drafted: 'ready to start', scheduled: 'in outreach', active: 'in outreach', replied: 'replied', rejected: 'skipped', finished: 'finished', stopped: 'stopped', bounced: 'bounced' } as const)[p.status]);

export const SOURCES = ['Dashboard flags', 'Outreach', 'HubSpot', 'Content', 'Activity log', 'Health checks', 'Clients & invoices', 'Build progress', 'Vault'] as const;

const SYSTEM = `You are "Ask Naunas", the assistant inside Naufal's business dashboard (naunas.co.uk/dashboard). Naufal runs Naunas alone from Zanzibar. Naunas is an agency that installs "The Client System" (everything between an enquiry and a signed, onboarded client) for service businesses with high-value projects: design studios, property, construction and trades, agencies and B2B services, education and academies, professional services (the same market as Quam and Agentryx; healthcare and med spas are out). Growth comes from cold outreach (Instagram, LinkedIn or email, one channel per firm), daily content (LinkedIn, Instagram, TikTok) and the free audit call, then a proposal and a deposit. He also delivers for existing clients (SNAEB, Soul in the Horn, Nelia Rose and others in the VAULT data).

You get FLAGS (fixed checks that are always true), a SNAPSHOT, and read-only tools to look further (firms, HubSpot notes, content, activity log, health checks, clients and invoices, build progress of this dashboard, and the vault: client and project status, next steps, blockers, open tasks). Rules:
- Only state facts from the flags, snapshot or tool results. Never invent numbers, names, results, dates or prices. If you don't know, say so and say where to look.
- When sources disagree, trust them in this order: live data (HubSpot, Stripe/invoices, the activity log, health checks, outreach) > a repo's PROGRESS.md (build state) > the vault note (relationship, money, tasks). Within the same kind, the newer date wins. Say when something is old ("the vault note was last edited 9 weeks ago") and, if two sources really conflict, say both and which one you went with. Never quietly pick.
- Vault items carry drift issues (PROGRESS.md undated or commits behind, repo missing). Mention them when they matter to the question.
- Money first: promises and replies, then deals going stale, overdue invoices and client delivery, then the outreach engine, then content, then system.
- UK spelling, plain words, no jargon, no preamble, no sign-off.
- You cannot send, edit or change anything. You suggest; Naufal clicks.

How to shape the answer (it is shown as cards in a narrow side panel, so it must scan in seconds):
- headline: ONE sentence that answers the question directly, at most 20 words. Bold nothing. Example: "Three replies are waiting and one deal has gone quiet for 9 days."
- sections: 0 to 3. Use kind "plan" for an ordered to-do list (numbered, ticked off), "list" for everything else. Good titles: "Do now", "Slipping", "Worth knowing", "Today's plan". At most 6 items per section, most important first; if there are more, make the last item "and N more" linking to the full list.
- item.text: at most 12 words, starts with a verb when it is a to-do ("Reply to Mia at Oakline"). item.detail: the supporting fact with its count or age ("replied 3 days ago, no next step"), at most 20 words, or "". item.href: a link from the data, or "". item.urgency: high = money or a person waiting now, medium = this week, low = FYI.
- notes: "" unless the question needs an explanation the cards can't carry. Then at most 3 short paragraphs of markdown ([links](/dashboard/...) and - bullets only).
- followups: 2 or 3 short questions Naufal is likely to ask next that you could answer with your tools, written as he would type them.
- actions: up to 4 buttons {label, href} for the most useful pages to open, hrefs only from the data. Never make up a URL.
- sources: which of these you actually used: ${SOURCES.join(', ')}.
- A simple factual question gets a headline and maybe one short list. Don't pad.
- When asked what to do today, give a "plan" section, most valuable first, each item with its count.`;

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
  const [progress, health, activity, cl, overdue, vault] = await Promise.all([
    progressDigest().catch(() => null), lastHealth().catch(() => null), recentActivity(7).catch(() => []),
    clientsData().catch(() => null), overdueInvoices().catch(() => []), getVault().catch(() => null),
  ]);
  const failed = health?.checks?.filter((c) => !c.ok) ?? [];
  L.push(`HEALTH (last check ${health?.at ?? 'never'}): ${health ? (health.ok ? 'all green' : `${failed.length || 'some'} failing${failed.length ? ': ' + failed.map((c) => `${c.name} (${(c.detail ?? '').slice(0, 90)})`).join('; ') : ''}`) : 'no run stored'} (/dashboard/system)`);
  if (activity.length) {
    const byKind = activity.reduce<Record<string, number>>((m, e) => ((m[e.kind] = (m[e.kind] ?? 0) + 1), m), {});
    L.push(`ACTIVITY last 7 days: ${Object.entries(byKind).map(([k, n]) => `${k} ${n}`).join(', ')}. Latest: ${activity.slice(0, 6).map((e) => `${e.at.slice(0, 10)} ${e.title}`).join('; ')}`);
  } else L.push('ACTIVITY last 7 days: nothing logged.');
  if (cl) L.push(`CLIENTS onboarding ${cl.active.length}: ${cl.active.slice(0, 6).map((c) => `${c.name} (next: ${c.nextStep ?? 'done'}, ${c.days}d since won)`).join('; ') || 'none'} (/dashboard/clients)`);
  L.push(`INVOICES overdue ${overdue.length}${overdue.length ? ': ' + overdue.slice(0, 5).map((o) => `${o.who} ${money(o.amount, o.currency)} ${o.daysOverdue}d`).join('; ') : ''} (/dashboard/money)`);
  if (progress) L.push(`BUILD (this dashboard's PROGRESS.md, updated ${progress.updated}): ${progress.open.length} open next steps, e.g. ${progress.open.slice(0, 4).map((o) => o.replace(/\*\*/g, '').slice(0, 90)).join(' | ')}`);
  if (vault) {
    L.push(`VAULT (synced ${vault.at}): ${vault.items.length} items.`);
    for (const v of vault.items.filter((x) => x.kind === 'client' || x.kind === 'project').slice(0, 25)) L.push(`- ${vaultLine(v)}`);
  } else L.push('VAULT: not synced yet (scripts/vault-sync.mjs on the laptop).');
  if (errors.length) L.push(`DATA ERRORS: ${errors.join(' | ')}`);
  return { text: L.join('\n'), flags, deals };
}

const vaultLine = (v: VaultItem) => [
  `${v.name} [${v.kind}${v.status ? `, ${v.status}` : ''}${v.lastContact ? `, last contact ${v.lastContact}` : ''}${v.noteEdited ? `, note edited ${v.noteEdited}` : ''}]`,
  `open tasks ${v.tasks.length}${v.tasks.some((t) => t.high) ? ' (some urgent)' : ''}${v.blocked.length ? `, blocked ${v.blocked.length}` : ''}`,
  v.repo?.updated ? `build (PROGRESS.md ${v.repo.updated}): ${(v.repo.state ?? '').slice(0, 90)}` : '',
  v.next[0] ? `next: ${v.next[0].slice(0, 90)}` : '',
  v.issues?.length ? `DRIFT: ${v.issues.join('; ')}` : '',
].filter(Boolean).join('; ');

// ---------------------------------------------------------------- Tools (read-only)

const fn = (name: string, description: string, properties: Record<string, unknown> = {}, required: string[] = []) =>
  ({ type: 'function', function: { name, description, parameters: { type: 'object', additionalProperties: false, required, properties } } });
const TOOLS = [
  fn('find_firm', 'Everything about one cold-outreach firm: research, channel, timeline, drafts summary, leak report, HubSpot ids.', { query: { type: 'string', description: 'Firm name (or part of it) or firm id' } }, ['query']),
  fn('list_firms', 'Firms at one step of the outreach pipeline.', { step: { type: 'string', enum: ['review', 'researching', 'ready to start', 'in outreach', 'replied', 'booked', 'won', 'lost', 'skipped'] } }, ['step']),
  fn('hubspot_notes', 'The latest notes on a HubSpot contact (call summaries, replies, research briefs).', { contactId: { type: 'string' } }, ['contactId']),
  fn('content_plan', 'Content posts from the last 7 days and the next 14 days with their status per channel.'),
  fn('content_insights', 'What content has learned (winning posts, which hook kinds, Leak Map layers and industries bring leads) and the latest market feed (posts doing well for similar creators).'),
  fn('activity_log', 'The activity log: bookings, calls, payments, leads, DMs, alerts and failed jobs.', { days: { type: 'number', description: 'How far back, 1-30' } }, ['days']),
  fn('health_checks', 'The last daily health check, every service with pass/fail and the error.'),
  fn('clients_and_money', 'Won clients and their onboarding steps, retainers and renewals, plus overdue invoices.'),
  fn('build_progress', "This dashboard's own build state (PROGRESS.md): what works, open next steps, recent sessions."),
  fn('vault', "The vault (Naufal's notes, synced from his laptop): with a name, one client or project's status, value, last contact, next steps, blockers and open tasks; with an empty name, every item in one line each.", { name: { type: 'string', description: 'Client or project name, or "" for all' } }, ['name']),
];

const STEP_LABEL: Record<string, (a: Record<string, string>) => string> = {
  find_firm: (a) => `Looked up ${a.query ?? 'a firm'}`,
  list_firms: (a) => `Listed firms at "${a.step}"`,
  hubspot_notes: () => 'Read HubSpot notes',
  content_plan: () => 'Checked the content plan',
  content_insights: () => 'Checked what content is working',
  activity_log: (a) => `Read the activity log (${a.days ?? 7} days)`,
  health_checks: () => 'Checked the health checks',
  clients_and_money: () => 'Checked clients and invoices',
  build_progress: () => 'Read the build progress',
  vault: (a) => (a.name ? `Read the vault note on ${a.name}` : 'Read the vault summary'),
};

async function runTool(name: string, args: Record<string, string>): Promise<unknown> {
  if (name === 'find_firm') {
    const q = (args.query ?? '').toLowerCase();
    const all = await getProspects();
    const p = all.find((x) => x.id === args.query) ?? all.find((x) => x.firm.toLowerCase().includes(q));
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
      .map((r) => ({ when: r.when, status: r.status, idea: r.idea.slice(0, 120), channels: r.channels, layer: r.layer, industry: r.industry, href: `/dashboard/content/${r.id}` }));
  }
  if (name === 'content_insights') {
    const [l, m] = await Promise.all([getLearning().catch(() => null), getMarket().catch(() => null)]);
    return {
      learning: l ? { at: l.at, posted: l.posted, winners: l.winners.slice(0, 5), hookKinds: l.kindStats, layers: l.layerStats, industries: l.industryStats, note: l.posted < 10 ? 'Fewer than 10 posts: comparisons are not meaningful yet.' : undefined } : 'Not run yet (Mondays).',
      market: m ? { at: m.at, items: m.items.slice(0, 6).map((x) => ({ creator: x.creator, platform: x.platform, lane: x.lane, lift: x.lift, pattern: x.pattern, angle: x.angle, hook: x.hook, url: x.url })) } : 'Not pulled yet (Mondays, or Refresh on Content > Ideas).',
      href: '/dashboard/content',
    };
  }
  if (name === 'activity_log') {
    const days = Math.min(30, Math.max(1, Number(args.days) || 7));
    return (await recentActivity(days, 80)).map((e) => ({ at: e.at, kind: e.kind, title: e.title, href: e.href }));
  }
  if (name === 'health_checks') return (await lastHealth()) ?? { error: 'No health check stored yet.' };
  if (name === 'clients_and_money') {
    const [c, o] = await Promise.all([clientsData(), overdueInvoices().catch(() => [])]);
    return { onboarding: c.active, finished: c.finished.map((x) => ({ name: x.name, retainer: x.retainer, renewsOn: x.renewsOn })), overdueInvoices: o, clientsHref: '/dashboard/clients', moneyHref: '/dashboard/money' };
  }
  if (name === 'build_progress') return (await progressDigest()) ?? { error: 'PROGRESS.md is not in this build.' };
  if (name === 'vault') {
    const v = await getVault();
    if (!v) return { error: 'The vault has not been synced yet (scripts/vault-sync.mjs on the laptop).' };
    const q = (args.name ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!q) return { syncedAt: v.at, items: v.items.map(vaultLine) };
    const hit = v.items.filter((x) => x.name.toLowerCase().replace(/[^a-z0-9]/g, '').includes(q));
    return hit.length ? { syncedAt: v.at, items: hit.slice(0, 3) } : { error: `Nothing in the vault matches "${args.name}".`, names: v.items.map((x) => x.name) };
  }
  return { error: 'Unknown tool' };
}

// ---------------------------------------------------------------- Chat

const ITEM = { type: 'object', additionalProperties: false, required: ['text', 'detail', 'href', 'urgency'], properties: { text: { type: 'string' }, detail: { type: 'string' }, href: { type: 'string' }, urgency: { type: 'string', enum: ['high', 'medium', 'low'] } } };
const ANSWER_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['headline', 'sections', 'notes', 'followups', 'actions', 'sources'],
  properties: {
    headline: { type: 'string' },
    sections: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['title', 'kind', 'items'], properties: { title: { type: 'string' }, kind: { type: 'string', enum: ['plan', 'list'] }, items: { type: 'array', items: ITEM } } } },
    notes: { type: 'string', description: 'Markdown or ""' },
    followups: { type: 'array', items: { type: 'string' } },
    actions: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['label', 'href'], properties: { label: { type: 'string' }, href: { type: 'string' } } } },
    sources: { type: 'array', items: { type: 'string', enum: [...SOURCES] } },
  },
};
type OAIMsg = { role: string; content?: string | null; tool_calls?: { id: string; type: 'function'; function: { name: string; arguments: string } }[]; tool_call_id?: string };

const safeHref = (h: string) => /^\/dashboard(\/|$)/.test(h) || /^https:\/\/(app(-eu1)?\.hubspot\.com|www\.naunas\.co\.uk)\//.test(h);
const cleanHref = (h: string) => (h && safeHref(h) ? h : '');

/** Keeps the model's answer inside the shape the panel lays out, whatever came back. */
export function tidy(a: Partial<Answer>, steps: string[] = []): Answer {
  const str = (v: unknown, n: number) => (typeof v === 'string' ? v.trim().slice(0, n) : '');
  const urg = (u: unknown): Urgency => (u === 'high' || u === 'medium' ? u : 'low');
  return {
    headline: str(a.headline, 240) || str(a.answer, 240).split('\n')[0] || 'No answer came back.',
    sections: (Array.isArray(a.sections) ? a.sections : []).slice(0, 3).map((s) => ({
      title: str(s?.title, 60), kind: s?.kind === 'plan' ? 'plan' as const : 'list' as const,
      items: (Array.isArray(s?.items) ? s.items : []).slice(0, 8).map((i) => ({ text: str(i?.text, 160), detail: str(i?.detail, 240), href: cleanHref(str(i?.href, 300)), urgency: urg(i?.urgency) })).filter((i) => i.text),
    })).filter((s) => s.items.length),
    notes: str(a.notes, 2400),
    followups: (Array.isArray(a.followups) ? a.followups : []).map((f) => str(f, 120)).filter(Boolean).slice(0, 3),
    actions: (Array.isArray(a.actions) ? a.actions : []).filter((x) => x && typeof x.href === 'string' && safeHref(x.href)).map((x) => ({ label: str(x.label, 40), href: x.href })).slice(0, 4),
    sources: (Array.isArray(a.sources) ? a.sources : []).filter((x): x is string => (SOURCES as readonly string[]).includes(x)),
    steps: [...new Set(steps)].slice(0, 6),
  };
}

/** What "this" means on the page Naufal asked from. */
async function pageContext(page?: string): Promise<string> {
  if (!page || !/^\/dashboard[\w/%.-]*$/.test(page) || page.length > 200) return '';
  const id = (re: RegExp) => { try { return decodeURIComponent(re.exec(page)?.[1] ?? ''); } catch { return ''; } };
  let hint = '';
  const firm = id(/^\/dashboard\/outreach\/firm\/([^/]+)/);
  const lead = id(/^\/dashboard\/leads\/(\d+)/);
  const post = id(/^\/dashboard\/content\/(p[\w-]+)$/);
  if (firm) hint = `It is the page for outreach firm id "${firm}" (use find_firm with that id).`;
  else if (lead) hint = `It is the page for HubSpot contact ${lead} (use hubspot_notes).`;
  else if (post) {
    const r = (await getIndex().catch(() => [])).find((x) => x.id === post);
    hint = r ? `It is content post ${post}: status ${r.status}, when ${r.when}, idea "${r.idea.slice(0, 160)}".` : `It is content post ${post}.`;
  }
  return `Naufal is asking from the page ${page}. "This", "here" or "them" means what is on that page. ${hint}`.trim();
}

export async function ask(history: ChatMsg[], ctx?: string, page?: string): Promise<Answer> {
  if (!aiReady()) throw new Error('OPENAI_API_KEY is not set.');
  const [snap, where] = await Promise.all([ctx ?? snapshot().then((s) => s.text), pageContext(page)]);
  const messages: OAIMsg[] = [{ role: 'system', content: SYSTEM }, { role: 'system', content: snap }, ...(where ? [{ role: 'system', content: where }] : []), ...history.slice(-12).map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }))];
  const steps: string[] = [];
  for (let round = 0; round < 6; round++) {
    const res = await fetch(`${OAI()}/v1/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: MODEL(), messages, tools: TOOLS, response_format: { type: 'json_schema', json_schema: { name: 'answer', strict: true, schema: ANSWER_SCHEMA } } }),
    });
    const b = await res.json() as { choices?: { message: OAIMsg }[]; error?: { message?: string } };
    if (!res.ok) throw new Error(`OpenAI ${res.status}: ${b.error?.message ?? ''}`);
    const msg = b.choices?.[0]?.message;
    if (!msg) throw new Error('OpenAI returned nothing');
    if (msg.tool_calls?.length) {
      messages.push(msg);
      for (const call of msg.tool_calls) {
        let args: Record<string, string> = {};
        try { args = JSON.parse(call.function.arguments || '{}'); } catch { /* empty args */ }
        steps.push(STEP_LABEL[call.function.name]?.(args) ?? call.function.name);
        const out = await runTool(call.function.name, args).catch((e) => ({ error: String(e instanceof Error ? e.message : e) }));
        messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(out).slice(0, 12000) });
      }
      continue;
    }
    return tidy(JSON.parse(msg.content ?? '{}') as Partial<Answer>, steps);
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
  const a = await ask([{ role: 'user', content: 'Write my start-of-day briefing. Headline: the one thing that matters most today. Then a "plan" section titled "Today\'s plan" with 5-7 items, most valuable first, each with its count in detail and a link. Then a "list" section titled "Missing out" with the single biggest thing I am missing out on. No notes unless essential.' }], s.text);
  const b: Briefing = { ...a, at: new Date().toISOString(), flags: s.flags.length };
  await putJSON(briefPath(today()), b);
  return b;
}
