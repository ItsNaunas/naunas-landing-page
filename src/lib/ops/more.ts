import { STAGE, crmSearch } from '@/lib/hubspot';
import { listEvents, type OpsEvent } from '@/lib/events';
import { getProspects, getSearches, getSettings, syncSearches, ingestDrafts, type Prospect, type Search } from '@/lib/outreach';
import { apifyReady } from '@/lib/apify';
import { inboxReady, type Mail } from '@/lib/inbox';
import { fathomReady, type FathomMeeting } from '@/lib/fathom';
import { FUNNEL } from '@/config/funnel';
import { DAY, num, ts, tally, collector, nowish, STAGE_LABEL, type RoutineReport } from './common';
import { personData } from './tabs';
import { src } from './cache';
import { demo, demoOn } from './demo';
import { getReps, repDay, MANUAL_REPS, AUTO_TARGETS } from '@/lib/reps';
import { getIndex, type IndexRow } from '@/lib/content';
import { channelBoard } from '@/lib/channels';

/** Today's reps + the last 7 days, from the rep log, the activity log and the content index. */
function repsView(log: Awaited<ReturnType<typeof getReps>>, events: OpsEvent[], posts: IndexRow[], prospects: Prospect[]) {
  const days = Array.from({ length: 7 }, (_, i) => repDay(Date.now() - (6 - i) * DAY));
  const count = (day: string, kind: string) => events.filter((e) => e.kind === kind && repDay(e.at) === day).length;
  const postsOn = (day: string) => posts.filter((r) => Object.values(r.channels).includes('posted') && repDay(r.when) === day).length;
  const row = (day: string) => {
    const manual = MANUAL_REPS.map((r) => ({ ...r, done: log[day]?.[r.key] ?? 0 }));
    const auto = { emails: count(day, 'outreach_email'), dms: count(day, 'outreach_dm'), posts: postsOn(day) };
    const touches = auto.emails + auto.dms + manual.filter((m) => m.key !== 'list').reduce((t, m) => t + m.done, 0);
    return { day, manual, auto, touches };
  };
  const week = days.map(row);
  const today = week[6];
  const goals = [...today.manual.map((m) => [m.done, m.target]), [today.auto.emails, AUTO_TARGETS.emails], [today.auto.dms, AUTO_TARGETS.dms], [today.auto.posts, AUTO_TARGETS.posts]];
  const since = Date.parse(days[0]);
  return {
    today, week, targets: AUTO_TARGETS,
    hit: goals.filter(([d, t]) => d >= t).length, of: goals.length,
    weekTouches: week.reduce((t, d) => t + d.touches, 0),
    weekReplies: prospects.filter((p) => p.repliedAt && Date.parse(p.repliedAt) >= since).length,
  };
}
const H = 3_600_000;
export function igSequence(all: Prospect[], demoMode = false, caps: { ig: number; li: number } = { ig: 10, li: 5 }) {
  const now = Date.now();
  const today = repDay();
  const live = all.filter((p) => p.instagram && !p.igRepliedAt && ['drafted', 'scheduled', 'active'].includes(p.status));
  const sinceDm = (p: Prospect) => (p.dmSentAt ? now - Date.parse(p.dmSentAt) : 0);
  // New firms per channel per day: only offer as many fresh starts as today's target still allows.
  const igLeft = Math.max(0, caps.ig - all.filter((p) => p.warmedAt && repDay(p.warmedAt) === today).length);
  const liLeft = Math.max(0, caps.li - all.filter((p) => p.liEngagedAt && repDay(p.liEngagedAt) === today).length);
  const warm = live.filter((p) => !p.warmedAt && !p.dmSentAt).sort((a, b) => b.fit - a.fit).slice(0, igLeft);
  // Opener goes the day after the warm-up (warmed before today); demo shows one straight away.
  const openers = live.filter((p) => !p.dmSentAt && (p.drafts?.dm || p.drafts?.dms?.length) && (demoMode || (p.warmedAt && repDay(p.warmedAt) < today))).slice(0, 10);
  const followups = live.flatMap((p): { p: Prospect; n: 1 | 2 }[] => {
    if (!p.dmSentAt) return [];
    if (!p.fu1At && sinceDm(p) >= 3 * 24 * H) return [{ p, n: 1 }];
    if (p.fu1At && !p.fu2At && sinceDm(p) >= 7 * 24 * H) return [{ p, n: 2 }];
    return [];
  });
  const waiting = live.filter((p) => p.dmSentAt && !(p.fu1At && p.fu2At)).length - followups.length;
  // Opener test: reply rate per style.
  const sent = all.filter((p) => p.dmSentAt);
  const styles = Object.entries(sent.reduce<Record<string, { sent: number; replied: number }>>((acc, p) => {
    const k = p.dmStyle ?? 'unlabelled';
    const row = (acc[k] ??= { sent: 0, replied: 0 });
    row.sent += 1;
    if (p.igRepliedAt) row.replied += 1;
    return acc;
  }, {})).map(([style, v]) => ({ style, ...v, rate: v.sent ? Math.round((v.replied / v.sent) * 100) : 0 })).sort((a, b) => b.sent - a.sent);
  const finished = live.filter((p) => p.fu2At).length;
  // LinkedIn cold sequence (owner profile found): starts the day after the Instagram opener (or straight away
  // for firms not on Instagram) so one person isn't hit on every channel the same day.
  const liReady = (p: Prospect) => !!p.drafts?.research?.ownerLinkedin && (!p.instagram || !!p.dmSentAt);
  const before = (t?: string, days = 1) => !!t && now - Date.parse(t) >= days * 24 * H;
  const liLive = all.filter((p) => !p.igRepliedAt && ['drafted', 'scheduled', 'active'].includes(p.status));
  const linkedin = liLive.flatMap((p): { p: Prospect; step: 'engage' | 'connect' | 'dm' | 'fu' }[] => {
    if (!liReady(p)) return [];
    if (!p.liEngagedAt) return [{ p, step: 'engage' as const }];
    if (!p.liAt) return repDay(p.liEngagedAt) < today ? [{ p, step: 'connect' }] : [];
    if (!p.liDmAt) {
      if (before(p.liAt, 21)) return []; // never accepted: let it go quietly
      if (p.liSnoozeUntil && Date.parse(p.liSnoozeUntil) > now) return [];
      return before(p.liAt, 2) ? [{ p, step: 'dm' }] : [];
    }
    return !p.liFuAt && before(p.liDmAt, 5) ? [{ p, step: 'fu' }] : [];
  });
  // Engage = a new firm on LinkedIn: capped by today's target. Later steps always show.
  let engages = 0;
  const linkedinCapped = linkedin.filter((x) => x.step !== 'engage' || engages++ < liLeft);
  return { warm, openers, followups, linkedin: linkedinCapped, waiting: Math.max(0, waiting), finished, styles };
}

const demoReps = () => repsView({ [repDay()]: { warmups: 3, followups: 2, linkedin: 1, list: 5 } }, [], [], []);

// Lead profile, Outreach and Content-plus data for /dashboard. Read-only; per-source errors.

const ORDER: string[] = [STAGE.newEnquiry, STAGE.contacted, STAGE.auditBooked, STAGE.auditDone, STAGE.scopeSent, STAGE.won];

// ---------------------------------------------------------------- Lead profile
export async function leadProfile(id: string) {
  if (demoOn()) return demo.leadProfile(id) as never;
  const base = await personData(id);
  const { errors, safe } = collector();
  errors.push(...base.errors);
  const p = base.person;
  if (!p) return { errors, profile: null };
  const [thread, meetings, ml] = await Promise.all([
    p.email && inboxReady() ? safe('Email thread', src.threadWith(p.email), [] as Mail[]) : Promise.resolve([] as Mail[]),
    p.email && fathomReady() ? safe('Fathom', src.meetingsWith(p.email), [] as FathomMeeting[]) : Promise.resolve([] as FathomMeeting[]),
    Promise.resolve(p.email_status),
  ]);
  const now = Date.now();
  const stage = p.deal?.stage ?? '';
  const notes = p.timeline.filter((t) => t.kind === 'note');
  const brief = notes.find((n) => /research brief|pre-call brief/i.test(n.title) || /^Research brief/i.test(n.body ?? ''));
  const answers = notes.find((n) => /questionnaire|contact form/i.test(n.title));
  const lastIn = thread.filter((m) => m.folder === 'inbox').at(-1);
  const lastOut = thread.filter((m) => m.folder === 'sent').at(-1);
  const waiting = lastIn && (!lastOut || ts(lastIn.date) > ts(lastOut.date));
  const lastActivity = Math.max(...p.timeline.map((t) => ts(t.at)), 0);
  const idle = lastActivity ? Math.floor((now - lastActivity) / DAY) : 0;

  // One clear next step, most urgent first.
  let next: { title: string; why: string; tone: 'accent' | 'good' | 'bad' | 'neutral' } | null = null;
  if (waiting) next = { title: 'Reply to them', why: `They emailed ${Math.max(0, Math.floor((now - ts(lastIn!.date)) / DAY))}d ago and haven’t had an answer.`, tone: 'bad' };
  else if (stage === STAGE.auditBooked) next = brief ? { title: 'Prep for the call', why: 'Read the research brief below before you join.', tone: 'good' } : { title: 'Call booked', why: 'The research brief lands in the 13:00 digest the day before.', tone: 'neutral' };
  else if (stage === STAGE.auditDone) next = { title: 'Send the recap and proposal', why: 'Same-day recap closes best (Soul in the Horn). The proposal draft is in Google Docs.', tone: 'accent' };
  else if (stage === STAGE.scopeSent && idle >= 5) next = { title: 'Nudge the proposal', why: `Nothing for ${idle} days since the scope went out.`, tone: 'accent' };
  else if ((stage === STAGE.newEnquiry || stage === STAGE.contacted) && idle >= 2) next = { title: 'Follow up', why: `Quiet for ${idle} days. Offer the free audit.`, tone: 'accent' };
  else if (stage === STAGE.won) next = { title: 'Onboard and deliver', why: 'Testimonial ask comes up at 21 days, referral at 60.', tone: 'good' };
  else if (!stage && p.source === 'cold_email') next = { title: 'Outreach in progress', why: 'Replies show here and in Today the moment they land.', tone: 'neutral' };

  const reached = (s: string) => stage === STAGE.won || (stage !== STAGE.lost && ORDER.indexOf(stage) >= ORDER.indexOf(s));
  const firstBooking = p.timeline.find((t) => t.kind === 'booking');
  const paid = p.timeline.find((t) => t.kind === 'payment' && /^Paid/.test(t.title));
  const journey = [
    { label: 'Came in', done: true, at: p.timeline.at(-1)?.at },
    { label: 'Email course', done: !!ml?.groups.length, at: p.timeline.find((t) => t.kind === 'email')?.at },
    { label: 'Booked a call', done: reached(STAGE.auditBooked) || !!firstBooking, at: firstBooking?.at },
    { label: 'Call held', done: reached(STAGE.auditDone) || meetings.length > 0, at: meetings[0]?.recording_start_time ?? meetings[0]?.created_at },
    { label: 'Proposal sent', done: reached(STAGE.scopeSent) },
    { label: 'Paid', done: stage === STAGE.won || !!paid, at: paid?.at },
  ];

  return {
    errors,
    profile: {
      ...p,
      stageLabel: STAGE_LABEL[stage] ?? (stage ? 'Deal' : 'No deal yet'),
      idle, next, journey, waiting: !!waiting,
      brief: brief?.body, answers: answers?.body,
      thread: thread.slice(-30),
      lastInbound: lastIn ? { messageId: lastIn.messageId, subject: lastIn.subject, references: lastIn.references ?? [] } : null,
      meetings: meetings.map((m) => ({
        title: m.meeting_title ?? m.title, at: m.recording_start_time ?? m.scheduled_start_time ?? m.created_at, url: m.share_url ?? m.url,
        summary: m.default_summary?.markdown_formatted ?? '', actions: (m.action_items ?? []).map((a) => a.description),
      })),
      connected: { inbox: inboxReady(), fathom: fathomReady() },
    },
  };
}

// ---------------------------------------------------------------- Outreach
export async function outreachData() {
  if (demoOn()) { const o = demo.outreach() as { queue: Record<string, Prospect[]> }; return { ...o, reps2: demoReps(), ig: igSequence(Object.values(o.queue).flat(), true), channels: channelBoard(Object.values(o.queue).flat(), { sending: false, dailyNew: 10, dailyTotal: 25, monthlyCapUsd: 10, igNew: 10, liNew: 5 }) } as never; }
  const { errors, safe } = collector();
  if (apifyReady()) await safe('Apify', syncSearches(), [] as Search[]);
  await safe('Drafts', ingestDrafts(), 0);
  const [prospects, searches, settings, events, coldContacts, inbox] = await Promise.all([
    getProspects(), getSearches(), getSettings(),
    safe('Activity', listEvents(500), [] as OpsEvent[]),
    safe('HubSpot', crmSearch('contacts', [{ propertyName: 'naunas_lead_source', operator: 'EQ', value: 'cold_email' }], ['email', 'firstname', 'naunas_outreach_status', 'num_associated_deals', 'createdate', 'website']), { total: 0, results: [] }),
    inboxReady() ? safe('Inbox', src.recentInbound(14, 80), [] as Mail[]) : Promise.resolve([] as Mail[]),
  ]);
  const [repLog, contentRows] = await Promise.all([safe('Reps', getReps(), {}), safe('Content', getIndex(), [] as IndexRow[])]);
  const today = new Date(nowish()).toISOString().slice(0, 10);
  const todays = events.filter((e) => e.at.slice(0, 10) === today);
  const month = new Date().toISOString().slice(0, 7);
  const spent = searches.filter((s) => s.createdAt.startsWith(month)).reduce((t, s) => t + (s.costUsd ?? 0), 0);

  const statuses = tally(coldContacts.results.map((c) => c.properties.naunas_outreach_status ?? 'emailed'));
  const emailed = coldContacts.total;
  const replied = (statuses.replied ?? 0) + (statuses.interested ?? 0) + (statuses.audit_booked ?? 0) + (statuses.not_interested ?? 0);
  const positive = (statuses.interested ?? 0) + (statuses.audit_booked ?? 0);
  const withDeal = coldContacts.results.filter((c) => num(c.properties.num_associated_deals) > 0).length;

  // Inbox: only mail from people we know (prospects or cold-email contacts), so newsletters stay out.
  const known = new Map<string, { name: string; href: string }>();
  for (const c of coldContacts.results) if (c.properties.email) known.set(c.properties.email.toLowerCase(), { name: c.properties.firstname || c.properties.email, href: `/dashboard/leads/${c.id}` });
  for (const pr of prospects) if (pr.email && !known.has(pr.email)) known.set(pr.email, { name: pr.firm, href: pr.contactId ? `/dashboard/leads/${pr.contactId}` : '/dashboard/outreach' });
  const replies = inbox.filter((m) => known.has(m.from)).map((m) => ({ ...m, who: known.get(m.from)!.name, href: known.get(m.from)!.href }));

  const by = (s: Prospect['status']) => prospects.filter((p) => p.status === s);
  return {
    errors, settings, searches: searches.slice(0, 8), spent,
    queue: { review: by('new').sort((a, b) => b.fit - a.fit), approved: by('approved'), drafted: by('drafted'), scheduled: by('scheduled'), active: by('active'), replied: by('replied'), finished: by('finished') },
    reps2: repsView(repLog, events, contentRows, prospects),
    // Instagram sequence (DM playbook): warm up day 1, opener day 2, follow-ups day 5 and 9, then stop.
    ig: igSequence(prospects, false, { ig: settings.igNew, li: settings.liNew }),
    channels: channelBoard(prospects, settings),
    dmList: prospects.filter((p) => p.instagram && p.drafts?.dm && !p.dmSentAt && ['drafted', 'scheduled', 'active'].includes(p.status)).slice(0, 10),
    reps: {
      emails: todays.filter((e) => e.kind === 'outreach_email').length, emailTarget: settings.dailyNew,
      dms: todays.filter((e) => e.kind === 'outreach_dm').length, dmTarget: 10,
    },
    stats: { emailed, replied, positive, withDeal, replyRate: emailed ? Math.round((replied / emailed) * 100) : null, statuses },
    replies: replies.slice(0, 15),
    connected: { apify: apifyReady(), inbox: inboxReady() },
  };
}

// ---------------------------------------------------------------- Content plus
const PLAN = [
  { day: 'Mon', a: 'Hot take', b: 'Build-with-me · AI news' }, { day: 'Tue', a: 'Leak', b: 'Behind the build · Build-with-me' },
  { day: 'Wed', a: 'System demo', b: 'Build-with-me · Win' }, { day: 'Thu', a: 'Proof / case study', b: 'AI news · Behind the build' },
  { day: 'Fri', a: 'Leak + audit CTA', b: 'Build-with-me · Win' }, { day: 'Sat', a: 'Repurpose the week’s best', b: 'Behind the build · AI news' },
  { day: 'Sun', a: 'Hot take', b: 'What I’m building' },
];
export const HOOKS = [
  { hook: 'I cancelled HubSpot, Airtable AND Zoho last month. On purpose.', note: 'Most-commented Track A post' },
  { hook: 'A lead goes cold in 48 hours, and your follow-up is you remembering.', note: 'Track A' },
  { hook: '6 things between “interested” and “closed” that kill deals.', note: 'Track A' },
  { hook: 'There’s revenue sitting in your CRM you forgot about.', note: 'Track A' },
  { hook: 'I automated [X] with n8n + AI. Here’s the build.', note: 'Track B · 890 shares' },
];
const LAYERS = ['Attention', 'Capture', 'Pipeline', 'Follow-up', 'Conversion', 'Fulfilment', 'Retention', 'Attribution'];

export async function contentPlus(drafts: { detail?: string; runAt: string }[], posts: { timestamp: string }[]) {
  if (demoOn()) return demo.contentPlus() as never;
  const { errors, safe } = collector();
  const recent = await safe('Lead words', crmSearch('contacts', [{ propertyName: 'whats_not_working', operator: 'HAS_PROPERTY' }, { propertyName: 'createdate', operator: 'GTE', value: String(nowish() - 60 * DAY) }], ['whats_not_working', 'business_type', 'createdate']), { total: 0, results: [] });
  const weekStart = (() => { const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); d.setHours(0, 0, 0, 0); return d.getTime(); })();
  const covered = tally(drafts.flatMap((d) => (d.detail?.match(/Layer:\s*(\d)/) ?? []).slice(1)));
  return {
    errors,
    plan: PLAN, todayIdx: (new Date().getDay() + 6) % 7,
    postsThisWeek: posts.filter((p) => ts(p.timestamp) >= weekStart).length, weeklyTarget: FUNNEL.content.weeklyTarget,
    coverage: LAYERS.map((name, i) => ({ n: i + 1, name, drafts: covered[String(i + 1)] ?? 0 })),
    ideas: recent.results.map((c) => ({ text: c.properties.whats_not_working ?? '', who: c.properties.business_type ?? 'A lead', at: c.properties.createdate ?? '' })).filter((x) => x.text.length > 15).slice(0, 12),
    hooks: HOOKS,
  };
}

export type RoutineRep = RoutineReport;
export const outreachFeedUrl = `${FUNNEL.site}/api/outreach/feed/${FUNNEL.outreach.feedKey}`;
