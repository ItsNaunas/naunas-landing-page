// Sample data for /dashboard when DASHBOARD_DEMO=1: design QA and showing prospects what their Client
// System dashboard looks like. Fictional businesses only; never enable on the real dashboard.

import { STAGE } from '@/lib/hubspot';
import { DEFAULT_CAMPAIGN } from '@/lib/campaigns';
import type { OpsEvent } from '@/lib/events';
import { OPEN_STAGES, type RoutineReport } from './common';

export const demoOn = () => process.env.DASHBOARD_DEMO === '1';

const H = 3600_000;
const ago = (h: number) => new Date(Date.now() - h * H).toISOString();
const ahead = (h: number) => new Date(Date.now() + h * H).toISOString();

const people = [
  { id: 'p1', name: 'Mia Turner', email: 'mia@oakline.example', ig: '', source: 'instagram_dm', priority: 'high', clientValue: '$25k-100k', business: 'Interior design studio', stage: STAGE.auditBooked, amount: 0, h: 1 },
  { id: 'p2', name: '@studio.harper', email: '', ig: 'studio.harper', source: 'instagram_dm', priority: '', clientValue: '', business: '', stage: '', amount: 0, h: 5 },
  { id: 'p3', name: 'James Okafor', email: 'james@fernwood.example', ig: '', source: 'leak_map_popup', priority: 'normal', clientValue: '$5k-25k', business: 'Kitchen design', stage: STAGE.newEnquiry, amount: 0, h: 14 },
  { id: 'p4', name: 'Priya Shah', email: 'priya@shahliving.example', ig: '', source: 'audit_questionnaire', priority: 'high', clientValue: '$100k+', business: 'Luxury interiors', stage: STAGE.auditDone, amount: 5000, h: 29 },
  { id: 'p5', name: 'Tom Ellis', email: 'tom@northbank.example', ig: '', source: 'referral', priority: 'normal', clientValue: '$5k-25k', business: 'Renovations', stage: STAGE.scopeSent, amount: 750, h: 50 },
  { id: 'p6', name: 'Grace Lin', email: 'grace@bloom.example', ig: '', source: 'leak_map_popup', priority: 'small', clientValue: 'Under $5k', business: 'Florist', stage: '', amount: 0, h: 82 },
  { id: 'p7', name: 'Daniel Reyes', email: 'dan@reyesbuild.example', ig: '', source: 'cold_email', priority: 'normal', clientValue: '$25k-100k', business: 'Design-build', stage: STAGE.won, amount: 5000, h: 140 },
  { id: 'p8', name: 'Ava Brooks', email: 'ava@brooksdesign.example', ig: 'ava.designs', source: 'instagram_dm', priority: 'normal', clientValue: '$5k-25k', business: 'Interior design', stage: STAGE.contacted, amount: 0, h: 190 },
];

const events: OpsEvent[] = [
  { at: ago(0.3), kind: 'ig_comment', title: 'Comment LEAK → Leak Map (default) · @ava.designs' },
  { at: ago(0.5), kind: 'click', title: 'Link clicked · Leak Map (default)' },
  { at: ago(1), kind: 'booking', title: 'Audit booked · Mia Turner · Friday 17 October, 6:00 pm' },
  { at: ago(5), kind: 'ig_dm', title: 'DM keyword → Free audit · @studio.harper' },
  { at: ago(14), kind: 'lead', title: 'Leak Map sign-up · James Okafor ($5k-25k)' },
  { at: ago(26), kind: 'payment', title: 'Payment received · £2,500.00 · Daniel Reyes' },
  { at: ago(29), kind: 'enquiry', title: 'Audit questionnaire · Priya Shah · Luxury interiors' },
  { at: ago(40), kind: 'payment_issue', title: 'Card declined · £375.00' },
  { at: ago(50), kind: 'subscribe', title: 'Newsletter sign-up · Tom Ellis' },
  { at: ago(60), kind: 'reschedule', title: 'Call rescheduled · Tom Ellis → Monday 20 October, 5:00 pm' },
  { at: ago(80), kind: 'noshow', title: 'No-show · Grace Lin' },
  { at: ago(100), kind: 'alert', title: 'Problem: LeakMap: HubSpot' },
];

const report = (h: number, counts: RoutineReport['counts'], needsYou: string[], items: RoutineReport['items']): RoutineReport =>
  ({ runAt: ago(h), counts, needsYou, items });
const reports: RoutineReport[] = [
  report(3, { replies: 2, calls: 1, proposals: 1, retention: 0, content: 3 }, ['Send the recap + proposal to Priya (draft in Docs)', 'Reply to Mia: she asked about timelines'], [
    { job: 'replies', title: 'Mia (Oakline) asked how long an install takes' },
    { job: 'calls', title: 'Research brief: Mia Turner (call tomorrow 18:00)' },
    { job: 'proposals', title: 'Proposal: Shah Living (draft)', link: 'https://docs.google.com/' },
    { job: 'content', title: 'Leak post: “Your enquiry form is a black hole”', detail: 'Hook: Your enquiry form is a black hole.\n\nReel:\n1. A client fills in your form at 9pm.\n2. You see it Thursday.\n3. They booked someone else Tuesday.\n4. Fix: instant reply + booking link in the first email.\n\nCTA: Comment LEAK and I’ll send you the Leak Map.' },
    { job: 'content', title: 'Hot take: “Your CRM isn’t the problem. Your follow-up is.”', detail: 'Carousel (6 slides): the CRM you pay for vs the follow-up you never send…\n\nCTA: Comment AUDIT for a free audit.' },
    { job: 'content', title: 'Build: the comment-to-DM system behind this post', detail: 'Reel: show the comment → DM → HubSpot → Telegram in 20 seconds.\n\nCTA: Follow for the build.' },
  ]),
  report(27, { replies: 1, retention: 1 }, [], [
    { job: 'replies', title: 'Leak Map reply from a kitchen designer (wants the audit)' },
    { job: 'retention', title: 'Testimonial ask draft: Reyes Build (21 days)' },
  ]),
  report(51, {}, [], []),
];

const pipelineStages = () => OPEN_STAGES.map(([id, label]) => {
  const deals = people.filter((p) => p.stage === id).map((p, i) => ({
    id: p.id, name: `${p.name}${p.business ? ` · ${p.business}` : ''}`, amount: p.amount, priority: p.priority, source: p.source, idle: [1, 9, 16, 3][i % 4],
  }));
  return { id, label, deals, value: deals.reduce((s, d) => s + d.amount, 0) };
});

export const demo = {
  today: (lastVisit: number) => ({
    errors: [] as string[],
    kpis: { leads7: 18, leadsPrev7: 12, calls: 2, wonMonth: 3750, openValue: 14200, openCount: 9 },
    spark: [1, 0, 2, 1, 3, 1, 2, 4, 2, 1, 3, 2, 5, 3],
    goal: { target: 5000, wonMonth: 3750, pct: 75 },
    actions: [
      { kind: 'call', title: 'Call with Mia Turner', sub: ahead(5), href: '/dashboard/leads?person=p1' },
      { kind: 'routine', title: 'Send the recap + proposal to Priya (draft in Docs)', href: '/dashboard/automations' },
      { kind: 'routine', title: 'Reply to Mia: she asked about timelines', href: '/dashboard/automations' },
      { kind: 'money', title: 'Card declined · £375.00', sub: ago(40) },
      { kind: 'stale', title: 'Tom Ellis · Renovations has gone quiet', sub: '16 days without activity', href: '/dashboard/pipeline' },
    ],
    since: { count: 5, counts: { ig_comment: 1, click: 1, booking: 1, ig_dm: 1, lead: 1 }, lastVisit },
    feed: events,
    agenda: demo.calls().upcoming,
    health: { ok: 6, total: 6 },
  }),
  leads: (opts: { q?: string; source?: string; stage?: string }) => {
    let rows = people.map((p) => ({ ...p, dealId: p.stage ? `d-${p.id}` : '', createdAt: ago(p.h), lastActivity: ago(p.h / 2) }));
    const sources = rows.reduce<Record<string, number>>((a, r) => ({ ...a, [r.source]: (a[r.source] ?? 0) + 1 }), {});
    if (opts.q) rows = rows.filter((r) => `${r.name} ${r.email} ${r.ig}`.toLowerCase().includes(opts.q!.toLowerCase()));
    if (opts.source) rows = rows.filter((r) => r.source === opts.source);
    if (opts.stage) rows = rows.filter((r) => (opts.stage === 'none' ? !r.stage : r.stage === opts.stage));
    return { errors: [] as string[], rows, total: people.length, sources };
  },
  person: (id: string) => {
    const p = people.find((x) => x.id === id) ?? people[0];
    return {
      errors: [] as string[],
      person: {
        id: p.id, name: p.name, email: p.email, ig: p.ig, website: 'oakline.example', business: p.business, source: p.source, priority: p.priority,
        clientValue: p.clientValue, revenue: '$75k-250k', notWorking: 'Enquiries come in through Instagram and the website and half of them never get a reply within a day.',
        campaign: p.ig ? 'leak-map' : '', post: p.ig ? 'https://www.instagram.com/p/DEMO1/' : '', firstTouch: 'instagram / comment',
        deal: p.stage ? { id: `d-${p.id}`, name: `${p.name} · ${p.business}`, stage: p.stage, amount: p.amount } : null,
        email_status: { status: 'active', groups: ['Leak Map', 'Audit booked'], opens: 6, clicks: 2 },
        timeline: [
          { at: ahead(5), kind: 'booking', title: 'Free audit (30 min)' },
          { at: ago(1), kind: 'note', title: 'Research brief', body: 'Research brief\n\nWhat they sell: full-service interior design for homeowners.\nLeaks: 2 Capture (no instant reply), 4 Follow-up (no nudge after the proposal).\nQuestions: …' },
          { at: ago(20), kind: 'note', title: 'Free-audit questionnaire (audit)', body: 'Free-audit questionnaire\n\nEnquiries come in through Instagram and the website and half of them never get a reply within a day.' },
          { at: ago(22), kind: 'email', title: 'Joined MailerLite (Leak Map)' },
          { at: ago(22), kind: 'created', title: 'Became a lead via instagram dm' },
        ],
      },
    };
  },
  pipeline: () => {
    const stages = pipelineStages();
    return {
      errors: [] as string[], stages,
      totals: { open: stages.reduce((s, st) => s + st.deals.length, 0), value: stages.reduce((s, st) => s + st.value, 0), stale: 2 },
      conversion: [
        { label: 'New deals (90d)', value: 24 }, { label: 'Reached audit booked', value: 11 }, { label: 'Reached audit done', value: 8 },
        { label: 'Reached scope sent', value: 6 }, { label: 'Won', value: 3 },
      ],
      winRate: 43, wonValue: 10750,
      lostWhy: [['timing', 2], ['price', 1], ['ghosted', 1]] as [string, number][],
      bySource: [
        { source: 'instagram_dm', closed: 3, won: 2, value: 7500 }, { source: 'leak_map_popup', closed: 2, won: 1, value: 2500 },
        { source: 'cold_email', closed: 2, won: 0, value: 0 },
      ],
    };
  },
  calls: () => ({
    errors: [] as string[], connected: true as const,
    upcoming: [
      { uid: 'c1', title: 'Free audit between Naunas and Mia Turner', status: 'accepted', start: ahead(5), end: ahead(5.5), meetingUrl: 'https://meet.google.com/', attendees: [{ name: 'Mia Turner', email: 'mia@oakline.example', timeZone: 'America/New_York' }] },
      { uid: 'c2', title: 'Free audit between Naunas and Tom Ellis', status: 'accepted', start: ahead(52), end: ahead(52.5), attendees: [{ name: 'Tom Ellis', email: 'tom@northbank.example', timeZone: 'America/Los_Angeles' }] },
    ],
    past: [
      { uid: 'c3', title: 'Free audit between Naunas and Priya Shah', status: 'accepted', start: ago(30), end: ago(29.5), attendees: [{ name: 'Priya Shah', email: 'priya@shahliving.example', timeZone: 'America/Chicago' }] },
      { uid: 'c4', title: 'Free audit between Naunas and Grace Lin', status: 'accepted', start: ago(80), end: ago(79.5), attendees: [{ name: 'Grace Lin', email: 'grace@bloom.example', timeZone: 'Europe/London', absent: true }] },
      { uid: 'c5', title: 'Free audit between Naunas and Daniel Reyes', status: 'accepted', start: ago(160), end: ago(159.5), attendees: [{ name: 'Daniel Reyes', email: 'dan@reyesbuild.example', timeZone: 'America/Denver' }] },
    ],
    stats: { upcoming: 2, held: 8, noShows: 2, cancelled: 1, showRate: 80 },
  }),
  email: () => {
    const course = ['Your Leak Map (and a test you just passed)', 'Leak 1/8: they loved your work, then went nowhere', 'Leak 2/8: the 5-minute rule', 'Leak 3/8: four inboxes, one lost client', 'Leak 4/8: booked, then didn’t show', 'Leak 5/8: “loved the proposal”', 'Leak 6/8: “so what happens next?”', 'Leak 7/8: your best marketing moment', 'Leak 8/8: which source brings the big ones?', 'Last one from me on this'];
    return {
      errors: [] as string[],
      automations: [
        { id: 'a1', name: 'map leak', enabled: true, inQueue: 31, completed: 12, sent: 412, openRate: 0.58, clickRate: 0.09, unsubs: 3,
          emails: course.map((subject, i) => ({ subject, sent: Math.max(12, 52 - i * 4), openRate: Math.max(0.31, 0.78 - i * 0.05), clickRate: Math.max(0.03, 0.16 - i * 0.012) })) },
        { id: 'a2', name: 'Audit enquiry: booking nudge', enabled: true, inQueue: 4, completed: 9, sent: 26, openRate: 0.69, clickRate: 0.23, unsubs: 0,
          emails: [{ subject: 'Did the calendar not work?', sent: 14, openRate: 0.71, clickRate: 0.29 }, { subject: 'Last nudge, promise', sent: 12, openRate: 0.66, clickRate: 0.17 }] },
        { id: 'a3', name: 'Newsletter: welcome', enabled: true, inQueue: 0, completed: 38, sent: 38, openRate: 0.62, clickRate: 0.11, unsubs: 1,
          emails: [{ subject: 'You’re in (and here’s the Leak Map)', sent: 38, openRate: 0.62, clickRate: 0.11 }] },
      ],
      otherAutomations: [{ id: 'x', name: 'Audit booked: before we talk', enabled: false }],
      groups: [
        { name: 'Leak Map', active: 43, openRate: 0.58, clickRate: 0.09, unsubs: 3 },
        { name: 'Audit enquiry: not booked', active: 4, openRate: 0.69, clickRate: 0.23, unsubs: 0 },
        { name: 'Audit booked', active: 2, openRate: 0.8, clickRate: 0.4, unsubs: 0 },
        { name: 'Naunas Newsletter', active: 61, openRate: 0.44, clickRate: 0.06, unsubs: 2 },
      ],
    };
  },
  instagram: () => ({
    errors: [] as string[], connected: true, profile: { username: 'naunas_builds', followers_count: 1840, media_count: 96 }, insights: { reach: 12400, profile_views: 830, accounts_engaged: 610 }, days: 30,
    posts: [
      { id: 'm1', caption: 'Your enquiry form is a black hole. Comment LEAK.', media_type: 'VIDEO', permalink: 'https://www.instagram.com/reel/DEMO1/', timestamp: ago(30), like_count: 214, comments_count: 61, leads: 9 },
      { id: 'm2', caption: 'Your CRM isn’t the problem. Your follow-up is.', media_type: 'CAROUSEL_ALBUM', permalink: 'https://www.instagram.com/p/DEMO2/', timestamp: ago(80), like_count: 132, comments_count: 18, leads: 6 },
      { id: 'm3', caption: 'Built the comment → DM system live.', media_type: 'VIDEO', permalink: 'https://www.instagram.com/reel/DEMO3/', timestamp: ago(130), like_count: 301, comments_count: 22, leads: 2 },
      { id: 'm4', caption: '6 moments deals die.', media_type: 'CAROUSEL_ALBUM', permalink: 'https://www.instagram.com/p/DEMO4/', timestamp: ago(200), like_count: 97, comments_count: 9, leads: 1 },
      { id: 'm5', caption: 'A day building client systems from Zanzibar.', media_type: 'VIDEO', permalink: 'https://www.instagram.com/reel/DEMO5/', timestamp: ago(260), like_count: 412, comments_count: 30, leads: 0 },
      { id: 'm6', caption: 'There’s revenue sitting in your CRM you forgot about.', media_type: 'IMAGE', permalink: 'https://www.instagram.com/p/DEMO6/', timestamp: ago(330), like_count: 88, comments_count: 7, leads: 0 },
    ],
    campaigns: [
      { ...DEFAULT_CAMPAIGN, stats: { comments: 64, dms: 63, clicks: 41, leads: 21, deals: 4 } },
      { id: 'free-audit', name: 'Free audit', keywords: ['AUDIT', 'BOOK'], channel: 'both' as const, postIds: [], message: 'Here’s the link to book 👇\n\n{link}', url: 'https://www.naunas.co.uk/audit', active: true, stats: { comments: 12, dms: 12, clicks: 9, leads: 6, deals: 2 } },
      { id: 'follow-up-kit', name: 'Follow-up kit', keywords: ['FOLLOWUP'], channel: 'comment' as const, postIds: ['17912345678901234'], message: '{link}', url: 'https://www.naunas.co.uk/', active: false, endsAt: ago(-240), stats: { comments: 5, dms: 5, clicks: 2, leads: 1, deals: 0 } },
    ],
    totalLeads: 28,
  }),
  money: () => ({
    errors: [] as string[], connected: true as const,
    kpis: { thisMonth: 3750, goal: 5000, mrr: 850, mrrGoal: 1000, available: 2310, pending: 1250, outstanding: 750 },
    months: [{ label: 'May', value: 1500 }, { label: 'Jun', value: 2400 }, { label: 'Jul', value: 1150 }, { label: 'Aug', value: 3300 }, { label: 'Sep', value: 4100 }, { label: 'Oct', value: 3750 }],
    payments: [
      { id: 'ch1', at: ago(26), amount: 2500, currency: 'gbp', who: 'Daniel Reyes', status: 'paid', dealId: 'd-p7', receipt: undefined },
      { id: 'ch2', at: ago(40), amount: 375, currency: 'gbp', who: 'Bloom Florals', status: 'failed', dealId: undefined, receipt: undefined },
      { id: 'ch3', at: ago(200), amount: 1250, currency: 'gbp', who: 'Northbank Renovations', status: 'paid', dealId: undefined, receipt: undefined },
      { id: 'ch4', at: ago(400), amount: 750, currency: 'gbp', who: 'Harper Studio', status: 'part-refunded', dealId: undefined, receipt: undefined },
    ],
    invoices: [{ id: 'in1', number: 'NAU-0042', amount: 750, who: 'Northbank Renovations', due: ahead(72), url: undefined }],
    subscriptions: 2,
  }),
  automations: (kind?: string) => ({
    errors: [] as string[], reports,
    mailerlite: [
      { name: 'map leak', enabled: true, expected: true, sent: 412, inQueue: 31 },
      { name: 'Audit enquiry: booking nudge', enabled: true, expected: true, sent: 26, inQueue: 4 },
      { name: 'Newsletter: welcome', enabled: true, expected: true, sent: 38, inQueue: 0 },
      { name: 'Audit booked: before we talk', enabled: false, expected: false, sent: 9, inQueue: 0 },
    ],
    webhooks: [
      { name: 'Website forms', detail: 'Leak Map, audit questionnaire, contact form, newsletter', last: ago(14) },
      { name: 'Cal.com bookings', detail: 'Booked, rescheduled, cancelled, no-show', last: ago(1) },
      { name: 'Stripe payments', detail: 'Deposits, invoices, refunds, failures', last: ago(26) },
      { name: 'Instagram', detail: 'Keyword comments and DMs', last: ago(0.3) },
      { name: 'Tracked links', detail: '/go/<campaign> clicks', last: ago(0.5) },
    ],
    crons: [{ name: 'Daily health check + Monday scoreboard', schedule: 'Every day 09:00 Zanzibar', last: ago(4), ok: true }],
    feed: kind ? events.filter((e) => e.kind === kind) : events,
    kinds: events.reduce<Record<string, number>>((a, e) => ({ ...a, [e.kind]: (a[e.kind] ?? 0) + 1 }), {}),
  }),
  content: () => ({
    errors: [] as string[],
    drafts: reports.flatMap((r) => r.items.filter((i) => i.job === 'content').map((i) => ({ ...i, runAt: r.runAt }))),
    topPosts: demo.instagram().posts.filter((p) => p.leads).slice(0, 6),
    posts: demo.instagram().posts.map((p) => ({ timestamp: p.timestamp })),
  }),
  leadProfile: (id: string) => {
    const base = demo.person(id).person;
    return {
      errors: [] as string[],
      profile: {
        ...base,
        stageLabel: 'Audit booked', idle: 1, waiting: true,
        next: { title: 'Reply to them', why: 'They emailed 0d ago and haven’t had an answer.', tone: 'bad' as const },
        journey: [
          { label: 'Came in', done: true, at: ago(22) }, { label: 'Email course', done: true, at: ago(22) },
          { label: 'Booked a call', done: true, at: ago(20) }, { label: 'Call held', done: false }, { label: 'Proposal sent', done: false }, { label: 'Paid', done: false },
        ],
        brief: 'Research brief\n\nWhat they sell: full-service interior design for homeowners in Austin, mostly whole-home renovations.\n\nHow enquiries reach them: website form + Instagram DMs ("DM to book a consult" in bio).\n\nLikely leaks:\n- 2 Capture: the form promises a reply "within a week".\n- 4 Follow-up: no sign of a nurture after the consult.\n\nQuestions:\n1. What happens between the consult and the proposal?\n2. How many enquiries a month never get a reply?\n3. Where do your best clients come from?\n\nQuick win: an instant reply with the booking link on the form.',
        answers: 'Free-audit questionnaire\n\nEnquiries come in through Instagram and the website and half of them never get a reply within a day.',
        thread: [
          { uid: 1, folder: 'inbox' as const, messageId: '<a1@x>', date: ago(26), from: 'mia@oakline.example', fromName: 'Mia Turner', to: ['contact@naunas.co.uk'], subject: 'Re: Your Leak Map', text: 'Hi Naufal, layer 4 hit home. We lose people after the consult. Would love to chat.' },
          { uid: 2, folder: 'sent' as const, messageId: '<s1@x>', date: ago(24), from: 'contact@naunas.co.uk', fromName: 'Naufal', to: ['mia@oakline.example'], subject: 'Re: Your Leak Map', text: 'Hi Mia, that’s the most common one I see. Grab a slot here and I’ll map it with you: naunas.co.uk/audit\n\nNaufal' },
          { uid: 3, folder: 'inbox' as const, messageId: '<a2@x>', date: ago(3), from: 'mia@oakline.example', fromName: 'Mia Turner', to: ['contact@naunas.co.uk'], subject: 'Re: Your Leak Map', text: 'Booked for Friday! Quick question: how long does an install usually take?' },
        ],
        lastInbound: { messageId: '<a2@x>', subject: 'Re: Your Leak Map', references: ['<a1@x>', '<s1@x>'] },
        meetings: [] as { title: string; at: string; url: string; summary: string; actions: string[] }[],
        connected: { inbox: true, fathom: true },
      },
    };
  },
  outreach: () => {
    const mk = (i: number, firm: string, status: string, fit: number, extra: Record<string, unknown> = {}) => ({
      id: `pr${i}`, firm, website: `https://${firm.toLowerCase().replace(/[^a-z]+/g, '')}.example`, domain: `${firm.toLowerCase().replace(/[^a-z]+/g, '')}.example`,
      email: fit >= 3 ? `hello@${firm.toLowerCase().replace(/[^a-z]+/g, '')}.example` : undefined, instagram: fit >= 5 ? firm.toLowerCase().replace(/[^a-z]+/g, '.') : undefined,
      city: ['Nashville', 'Austin', 'Scottsdale'][i % 3], state: ['TN', 'TX', 'AZ'][i % 3], tz: 'America/Chicago', rating: 4.9, reviews: 12 + i * 5,
      category: 'Interior designer', fit, fitWhy: fit >= 5 ? ['Design practice', 'Direct email', 'On Instagram', `${12 + i * 5} reviews`] : ['Design practice', 'No Instagram found'],
      searchId: 's1', createdAt: ago(30 + i), status, ...extra,
    });
    const drafts = { dossier: 'Owner-led studio; enquiry form promises a reply "within 5 business days".', firstName: 'Kate', subject: 'the 5-day reply on your form', steps: ['Hi Kate,\n\nYour Hillsboro kitchen is lovely. Noticed your form says replies take up to 5 business days. Is that by design, or just capacity?\n\nNaufal', 'Hi Kate, one pattern from studios like yours: ...', 'Hi Kate, I recorded a 2-minute teardown of your enquiry flow. Want me to send it?', 'Hi Kate, I’ll leave it here. If enquiries ever pile up, the Leak Map is free: naunas.co.uk'], dm: 'Hi Kate, your Hillsboro kitchen is lovely. Genuine question: how do you handle the enquiries that come in over the weekend?' };
    const p = [
      mk(1, 'Hillsboro Interiors', 'new', 7), mk(2, 'Pine & Linen Design', 'new', 6), mk(3, 'Studio Marlowe', 'new', 5), mk(4, 'The Design Loft', 'new', 3),
      mk(5, 'Cedar House Interiors', 'approved', 6), mk(6, 'Kate Moss Design Co', 'drafted', 7, { drafts }),
      mk(7, 'Arden Interiors', 'scheduled', 6, { drafts }), mk(8, 'Whitfield Studio', 'active', 6, { drafts, startedAt: ago(80), sent: [{ step: 0, at: ago(80), messageId: '<m>' }] }),
      mk(9, 'Oakline Interiors', 'replied', 7, { drafts, startedAt: ago(200), repliedAt: ago(5), contactId: 'p1' }),
    ];
    const by = (s: string) => p.filter((x) => x.status === s);
    return {
      errors: [] as string[],
      settings: { sending: false, dailyNew: 15, dailyTotal: 25, monthlyCapUsd: 10 },
      searches: [{ id: 's1', term: 'interior designer', location: 'Nashville, TN', max: 30, runId: 'r', datasetId: 'd', status: 'SUCCEEDED', createdAt: ago(30), found: 30, added: 12, costUsd: 0.21 }],
      spent: 0.21,
      queue: { review: by('new'), approved: by('approved'), drafted: by('drafted'), scheduled: by('scheduled'), active: by('active'), replied: by('replied'), finished: by('finished') },
      dmList: [p[5], p[6]],
      reps: { emails: 6, emailTarget: 15, dms: 4, dmTarget: 10 },
      stats: { emailed: 34, replied: 5, positive: 3, withDeal: 2, replyRate: 15, statuses: { emailed: 12, followed_up: 17, replied: 2, interested: 2, audit_booked: 1, not_interested: 0 } },
      replies: [
        { uid: 1, folder: 'inbox' as const, messageId: '<r1>', date: ago(5), from: 'hello@oaklineinteriors.example', fromName: 'Mia', to: [], subject: 'Re: the 5-day reply on your form', text: 'Ha, capacity honestly. What would you suggest?', who: 'Oakline Interiors', href: '/dashboard/leads/p1' },
      ],
      connected: { apify: true, inbox: true },
    };
  },
  contentPlus: () => ({
    errors: [] as string[],
    plan: [
      { day: 'Mon', a: 'Hot take', b: 'Build-with-me · AI news' }, { day: 'Tue', a: 'Leak', b: 'Behind the build' }, { day: 'Wed', a: 'System demo', b: 'Build-with-me · Win' },
      { day: 'Thu', a: 'Proof / case study', b: 'AI news' }, { day: 'Fri', a: 'Leak + audit CTA', b: 'Build-with-me · Win' }, { day: 'Sat', a: 'Repurpose the week’s best', b: 'AI news' }, { day: 'Sun', a: 'Hot take', b: 'What I’m building' },
    ],
    todayIdx: (new Date().getDay() + 6) % 7, postsThisWeek: 9, weeklyTarget: 21,
    coverage: ['Attention', 'Capture', 'Pipeline', 'Follow-up', 'Conversion', 'Fulfilment', 'Retention', 'Attribution'].map((name, i) => ({ n: i + 1, name, drafts: [2, 3, 0, 4, 1, 0, 0, 1][i] })),
    ideas: [
      { text: 'Enquiries come in through Instagram and the website and half never get a reply within a day.', who: 'Interior design studio', at: ago(22) },
      { text: 'We send proposals and then it goes quiet. I never know when to chase.', who: 'Kitchen design', at: ago(60) },
      { text: 'No idea which of our marketing actually brings the big projects.', who: 'Design-build', at: ago(140) },
    ],
    hooks: [
      { hook: 'I cancelled HubSpot, Airtable AND Zoho last month. On purpose.', note: 'Most-commented Track A post' },
      { hook: 'A lead goes cold in 48 hours, and your follow-up is you remembering.', note: 'Track A' },
      { hook: '6 things between “interested” and “closed” that kill deals.', note: 'Track A' },
    ],
  }),
};
