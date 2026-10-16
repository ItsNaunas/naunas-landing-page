import { STAGE, hubspotUrl } from '@/lib/hubspot';
import { isTest } from '@/lib/scoreboard';
import { listEvents, type OpsEvent } from '@/lib/events';
import { getCampaigns, getStats } from '@/lib/campaigns';
import { runChecks, type Check } from '@/lib/health';
import { getJSON } from '@/lib/store';
import { FUNNEL } from '@/config/funnel';
import { DAY, num, ts, tally, monthStart, OPEN_STAGES, collector, connected, nowish, type RoutineReport } from './common';
import { src } from './cache';
import type { CalBooking, IgMedia, Charge } from './sources';
import { demo, demoOn } from './demo';

// One function per /dashboard tab. Read-only; every source fails independently (errors[] on the page).

const nameOf = (p: Record<string, string | null>) =>
  [p.firstname, p.lastname].filter(Boolean).join(' ') || (p.instagram_handle ? `@${p.instagram_handle}` : p.email) || 'Unknown';
const lastActivity = (p: Record<string, string | null>) => Math.max(ts(p.notes_last_updated), ts(p.hs_lastmodifieddate), ts(p.lastmodifieddate));
const reportsFor = src.routineReports as (email: string, take: number) => Promise<RoutineReport[]>;
const EMPTY = { total: 0, results: [] as { id: string; properties: Record<string, string | null> }[] };

// ---------------------------------------------------------------- Today
export async function todayData(lastVisit: number) {
  if (demoOn()) return demo.today(lastVisit) as never;
  const { errors, safe } = collector();
  const now = nowish();
  const [contacts, open, won, events, reports, checks, upcoming] = await Promise.all([
    safe('Leads', src.searchContacts({ since: now - 14 * DAY, limit: 200 }), EMPTY),
    safe('Pipeline', src.openDeals(), EMPTY),
    safe('Won deals', src.searchDeals([STAGE.won], monthStart()), EMPTY),
    safe('Activity', listEvents(40), [] as OpsEvent[]),
    safe('Routine', reportsFor(FUNNEL.routine.logEmail, 1), [] as RoutineReport[]),
    runChecks().catch(() => [] as Check[]),
    connected.cal() ? safe('Cal.com', src.calBookings('upcoming', 10), [] as CalBooking[]) : Promise.resolve(null),
  ]);
  const leads = contacts.results.filter((c) => !isTest(c.properties.email));
  const inRange = (a: number, b: number) => leads.filter((c) => ts(c.properties.createdate) >= a && ts(c.properties.createdate) < b).length;
  const wonMonth = won.results.reduce((s, d) => s + num(d.properties.amount), 0);
  const openValue = open.results.reduce((s, d) => s + num(d.properties.amount), 0);
  const stale = open.results
    .map((d) => ({ id: d.id, name: d.properties.dealname ?? 'Untitled', stage: d.properties.dealstage ?? '', idle: Math.floor((now - lastActivity(d.properties)) / DAY) }))
    .filter((d) => d.idle >= 7 && d.stage !== STAGE.newEnquiry).sort((a, b) => b.idle - a.idle);
  const booked = open.results.filter((d) => d.properties.dealstage === STAGE.auditBooked);
  const since = events.filter((e) => ts(e.at) > lastVisit);
  const sinceCounts = tally(since.map((e) => e.kind));
  const issues = events.filter((e) => (e.kind === 'payment_issue' || e.kind === 'alert') && ts(e.at) > now - 3 * DAY);

  type Action = { kind: 'call' | 'routine' | 'stale' | 'money' | 'system'; title: string; sub?: string; href?: string };
  const actions: Action[] = [
    ...(upcoming ?? []).filter((b) => ts(b.start) < now + 2 * DAY).map((b) => ({
      kind: 'call' as const, title: `Call with ${b.attendees[0]?.name ?? 'someone'}`, sub: b.start, href: `/dashboard/leads?q=${encodeURIComponent(b.attendees[0]?.email ?? '')}`,
    })),
    ...(upcoming ? [] : booked.map((d) => ({ kind: 'call' as const, title: `Prep the call: ${d.properties.dealname}`, href: hubspotUrl.deal(d.id) }))),
    ...(reports[0]?.needsYou ?? []).map((t) => ({ kind: 'routine' as const, title: t, href: '/dashboard/automations' })),
    ...issues.map((e) => ({ kind: (e.kind === 'alert' ? 'system' : 'money') as Action['kind'], title: e.title, sub: e.at, href: e.href })),
    ...checks.filter((c) => !c.ok).map((c) => ({ kind: 'system' as const, title: `${c.name} is failing`, sub: c.detail, href: '/dashboard/system' })),
    ...stale.slice(0, 5).map((d) => ({ kind: 'stale' as const, title: `${d.name} has gone quiet`, sub: `${d.idle} days without activity`, href: hubspotUrl.deal(d.id) })),
  ];

  return {
    errors,
    kpis: {
      leads7: inRange(now - 7 * DAY, now + 1), leadsPrev7: inRange(now - 14 * DAY, now - 7 * DAY),
      calls: upcoming ? upcoming.length : booked.length, wonMonth, openValue, openCount: open.total,
    },
    spark: Array.from({ length: 14 }, (_, i) => { const d = new Date(now - (13 - i) * DAY); d.setHours(0, 0, 0, 0); return inRange(d.getTime(), d.getTime() + DAY); }),
    goal: { target: FUNNEL.goals.monthlyRevenue, wonMonth, pct: Math.round((wonMonth / FUNNEL.goals.monthlyRevenue) * 100) },
    actions,
    since: { count: since.length, counts: sinceCounts, lastVisit },
    feed: events.slice(0, 12),
    agenda: upcoming,
    health: { ok: checks.filter((c) => c.ok).length, total: checks.length },
  };
}

// ---------------------------------------------------------------- Leads
export async function leadsData(opts: { q?: string; source?: string; stage?: string; range: number }) {
  if (demoOn()) return demo.leads(opts) as never;
  const { errors, safe } = collector();
  const since = opts.range ? nowish() - opts.range * DAY : undefined;
  const contacts = await safe('Leads', src.searchContacts({ since: opts.q ? undefined : since, query: opts.q, limit: 100 }), EMPTY);
  const people = contacts.results.filter((c) => opts.q || !isTest(c.properties.email));
  const deals = await safe('Deals', src.dealsForContacts(people.map((c) => c.id)), {} as Awaited<ReturnType<typeof src.dealsForContacts>>);
  let rows = people.map((c) => {
    const p = c.properties;
    const deal = deals[c.id];
    return {
      id: c.id, name: nameOf(p), email: p.email ?? '', ig: p.instagram_handle ?? '', source: p.naunas_lead_source ?? 'other',
      priority: p.naunas_priority ?? '', clientValue: p.client_value ?? '', business: p.business_type ?? '',
      stage: deal?.properties.dealstage ?? '', dealId: deal?.id ?? '', amount: num(deal?.properties.amount),
      createdAt: p.createdate ?? '', lastActivity: new Date(lastActivity(p) || ts(p.createdate)).toISOString(),
    };
  });
  const sources = tally(rows.map((r) => r.source));
  if (opts.source) rows = rows.filter((r) => r.source === opts.source);
  if (opts.stage) rows = rows.filter((r) => (opts.stage === 'none' ? !r.stage : r.stage === opts.stage));
  return { errors, rows, total: contacts.total, sources };
}

export async function personData(id: string) {
  if (demoOn()) return demo.person(id) as never;
  const { errors, safe } = collector();
  const contact = await safe('Contact', src.getContact(id), null);
  if (!contact) return { errors, person: null };
  const p = contact.properties;
  const email = p.email && !p.email.endsWith('@naunas.co.uk') ? p.email : '';
  const [notes, deals, sub, bookings, charges] = await Promise.all([
    safe('Notes', src.notesForContact(id), []),
    safe('Deal', src.dealsForContacts([id]), {} as Awaited<ReturnType<typeof src.dealsForContacts>>),
    email ? safe('MailerLite', src.mlSubscriber(email), null) : Promise.resolve(null),
    email && connected.cal() ? safe('Cal.com', Promise.all([src.calBookings('upcoming', 10, email), src.calBookings('past', 10, email)]).then(([a, b]) => [...a, ...b]), []) : Promise.resolve([]),
    email && connected.stripe()
      ? safe('Stripe', src.stripeCharges(365).then((all) => all.filter((c) => [c.billing_details.email, c.receipt_email].some((e) => e?.toLowerCase() === email.toLowerCase()))), [])
      : Promise.resolve([]),
  ]);
  const deal = deals[id];
  type Item = { at: string; kind: 'note' | 'booking' | 'payment' | 'created' | 'email'; title: string; body?: string };
  const timeline: Item[] = [
    { at: p.createdate ?? '', kind: 'created' as const, title: `Became a lead${p.naunas_lead_source ? ` via ${p.naunas_lead_source.replace(/_/g, ' ')}` : ''}` },
    ...(sub ? [{ at: sub.created_at.replace(' ', 'T') + 'Z', kind: 'email' as const, title: `Joined MailerLite (${sub.groups.map((g) => g.name).join(', ') || 'no group'})` }] : []),
    ...notes.map((n) => ({ at: n.at, kind: 'note' as const, title: n.text.split('\n')[0].slice(0, 120), body: n.text })),
    ...bookings.map((b) => ({ at: b.start, kind: 'booking' as const, title: `${b.status === 'cancelled' ? 'Cancelled: ' : ''}${b.title}${b.attendees[0]?.absent ? ' (no-show)' : ''}` })),
    ...charges.map((c) => ({ at: new Date(c.created * 1000).toISOString(), kind: 'payment' as const, title: `${c.refunded ? 'Refunded' : c.paid ? 'Paid' : 'Failed'} ${new Intl.NumberFormat('en-GB', { style: 'currency', currency: c.currency.toUpperCase() }).format(c.amount / 100)}` })),
  ].filter((i) => ts(i.at)).sort((a, b) => ts(b.at) - ts(a.at));
  return {
    errors,
    person: {
      id, name: nameOf(p), email, ig: p.instagram_handle ?? '', website: p.website ?? '', business: p.business_type ?? '',
      source: p.naunas_lead_source ?? '', priority: p.naunas_priority ?? '', clientValue: p.client_value ?? '', revenue: p.monthly_revenue_band ?? '',
      notWorking: p.whats_not_working ?? '', campaign: p.instagram_campaign ?? '', post: p.instagram_post ?? '',
      firstTouch: [p.first_touch_source, p.first_touch_medium].filter(Boolean).join(' / '),
      deal: deal ? { id: deal.id, name: deal.properties.dealname ?? '', stage: deal.properties.dealstage ?? '', amount: num(deal.properties.amount) } : null,
      email_status: sub ? { status: sub.status, groups: sub.groups.map((g) => g.name), opens: sub.opens_count, clicks: sub.clicks_count } : null,
      timeline,
    },
  };
}

// ---------------------------------------------------------------- Pipeline
export async function pipelineData(days = 90) {
  if (demoOn()) return demo.pipeline() as never;
  const { errors, safe } = collector();
  const now = nowish();
  const [open, closed, created] = await Promise.all([
    safe('Open deals', src.openDeals(), EMPTY),
    safe('Closed deals', src.closedDeals(now - days * DAY), EMPTY),
    safe('New deals', src.dealsCreatedSince(now - days * DAY), EMPTY),
  ]);
  const stages = OPEN_STAGES.map(([id, label]) => {
    const deals = open.results.filter((d) => d.properties.dealstage === id).map((d) => ({
      id: d.id, name: d.properties.dealname ?? 'Untitled', amount: num(d.properties.amount), priority: d.properties.naunas_deal_priority ?? '',
      source: d.properties.deal_lead_source ?? '', idle: Math.floor((now - (lastActivity(d.properties) || ts(d.properties.createdate))) / DAY),
    }));
    return { id, label, deals, value: deals.reduce((s, d) => s + d.amount, 0) };
  });
  const won = closed.results.filter((d) => d.properties.dealstage === STAGE.won);
  const lost = closed.results.filter((d) => d.properties.dealstage === STAGE.lost);
  const order = [...OPEN_STAGES.map(([s]) => s), STAGE.won];
  const reached = (stage: string) => created.results.filter((d) => {
    const s = d.properties.dealstage ?? '';
    return s === STAGE.won || (s !== STAGE.lost && order.indexOf(s) >= order.indexOf(stage));
  }).length;
  const bySource = Object.entries(tally(closed.results.map((d) => d.properties.deal_lead_source || 'unknown'))).map(([source]) => {
    const all = closed.results.filter((d) => (d.properties.deal_lead_source || 'unknown') === source);
    const w = all.filter((d) => d.properties.dealstage === STAGE.won);
    return { source, closed: all.length, won: w.length, value: w.reduce((s, d) => s + num(d.properties.amount), 0) };
  }).sort((a, b) => b.won - a.won || b.closed - a.closed);
  return {
    errors, stages,
    totals: { open: open.total, value: stages.reduce((s, st) => s + st.value, 0), stale: stages.flatMap((s) => s.deals).filter((d) => d.idle >= 7).length },
    conversion: [
      { label: `New deals (${days}d)`, value: created.total },
      { label: 'Reached audit booked', value: reached(STAGE.auditBooked) },
      { label: 'Reached audit done', value: reached(STAGE.auditDone) },
      { label: 'Reached scope sent', value: reached(STAGE.scopeSent) },
      { label: 'Won', value: created.results.filter((d) => d.properties.dealstage === STAGE.won).length },
    ],
    winRate: won.length + lost.length ? Math.round((won.length / (won.length + lost.length)) * 100) : null,
    wonValue: won.reduce((s, d) => s + num(d.properties.amount), 0),
    lostWhy: Object.entries(tally(lost.map((d) => d.properties.naunas_lost_reason ?? 'other'))).sort((a, b) => b[1] - a[1]),
    bySource,
  };
}

// ---------------------------------------------------------------- Calls
export async function callsData() {
  if (demoOn()) return demo.calls() as never;
  const { errors, safe } = collector();
  if (!connected.cal()) {
    const open = await safe('Pipeline', src.openDeals(), EMPTY);
    return { errors, connected: false as const, booked: open.results.filter((d) => d.properties.dealstage === STAGE.auditBooked).map((d) => ({ id: d.id, name: d.properties.dealname ?? '' })) };
  }
  const [upcoming, past, cancelled] = await Promise.all([
    safe('Upcoming', src.calBookings('upcoming', 30), [] as CalBooking[]),
    safe('Past', src.calBookings('past', 50), [] as CalBooking[]),
    safe('Cancelled', src.calBookings('cancelled', 50), [] as CalBooking[]),
  ]);
  const held = past.filter((b) => !b.attendees.some((a) => a.absent));
  const recent = (xs: CalBooking[]) => xs.filter((b) => ts(b.start) > nowish() - 90 * DAY);
  return {
    errors, connected: true as const, upcoming, past: past.slice(0, 20),
    stats: {
      upcoming: upcoming.length, held: recent(held).length, noShows: recent(past).length - recent(held).length,
      cancelled: recent(cancelled).length,
      showRate: recent(past).length ? Math.round((recent(held).length / recent(past).length) * 100) : null,
    },
  };
}

// ---------------------------------------------------------------- Email
export async function emailData() {
  if (demoOn()) return demo.email() as never;
  const { errors, safe } = collector();
  const [autos, groups] = await Promise.all([safe('Automations', src.mlAutomations(), []), safe('Groups', src.mlGroups(), [])]);
  const funnelAutos = autos.filter((a) => (FUNNEL.mailerlite.automations as readonly string[]).includes(a.name));
  const detailed = await Promise.all(funnelAutos.map((a) => safe(a.name, src.mlAutomation(a.id), a)));
  const groupNames = Object.values(FUNNEL.mailerlite.groups) as string[];
  return {
    errors,
    automations: detailed.map((a) => ({
      id: a.id, name: a.name, enabled: a.enabled, inQueue: a.stats.subscribers_in_queue_count, completed: a.stats.completed_subscribers_count,
      sent: a.stats.sent, openRate: a.stats.open_rate.float, clickRate: a.stats.click_rate.float, unsubs: a.stats.unsubscribes_count ?? 0,
      emails: (a.steps ?? []).filter((s) => s.type === 'email').sort((x, y) => (x.type_count ?? 0) - (y.type_count ?? 0)).map((s) => ({
        subject: s.subject ?? s.name ?? 'Email', sent: s.email?.stats.sent ?? 0, openRate: s.email?.stats.open_rate.float ?? 0, clickRate: s.email?.stats.click_rate.float ?? 0,
      })),
    })),
    otherAutomations: autos.filter((a) => !funnelAutos.includes(a)).map((a) => ({ id: a.id, name: a.name, enabled: a.enabled })),
    groups: groups.filter((g) => groupNames.includes(g.name)).map((g) => ({
      name: g.name, active: g.active_count, openRate: g.open_rate.float, clickRate: g.click_rate.float, unsubs: g.unsubscribed_count,
    })),
  };
}

// ---------------------------------------------------------------- Instagram
export async function instagramData(days = 30) {
  if (demoOn()) return demo.instagram() as never;
  const { errors, safe } = collector();
  const ok = connected.instagram();
  const since = days ? nowish() - days * DAY : undefined;
  const [profile, media, campaigns, stats, igLeads, insights] = await Promise.all([
    ok ? safe('Instagram profile', src.igProfileStats(), null) : Promise.resolve(null),
    ok ? safe('Instagram posts', src.igRecentMedia(25), [] as IgMedia[]) : Promise.resolve([] as IgMedia[]),
    getCampaigns(), getStats(),
    safe('Instagram leads', src.instagramLeads(since), EMPTY),
    ok ? src.igInsights(Math.min(30, days || 30)).catch(() => null) : Promise.resolve(null),
  ]);
  const leadsByPost = tally(igLeads.results.map((c) => c.properties.instagram_post ?? '').filter(Boolean));
  const leadsByCampaign = tally(igLeads.results.map((c) => c.properties.instagram_campaign ?? ''));
  const dealsByCampaign = tally(igLeads.results.filter((c) => num(c.properties.num_associated_deals) > 0).map((c) => c.properties.instagram_campaign ?? ''));
  return {
    errors, connected: ok, profile, insights, days,
    posts: media.filter((m) => !since || ts(m.timestamp) >= since).map((m) => ({ ...m, leads: leadsByPost[m.permalink] ?? 0 })),
    campaigns: campaigns.map((c) => ({ ...c, stats: { ...(stats[c.id] ?? { comments: 0, dms: 0, clicks: 0 }), leads: leadsByCampaign[c.id] ?? 0, deals: dealsByCampaign[c.id] ?? 0 } })),
    totalLeads: igLeads.total,
  };
}

// ---------------------------------------------------------------- Money
export async function moneyData(monthsBack = 6) {
  if (demoOn()) return demo.money() as never;
  const { errors, safe } = collector();
  if (!connected.stripe()) {
    const won = await safe('Won deals', src.searchDeals([STAGE.won], nowish() - 180 * DAY), EMPTY);
    return { errors, connected: false as const, wonMonth: won.results.filter((d) => ts(d.properties.closedate) >= monthStart()).reduce((s, d) => s + num(d.properties.amount), 0) };
  }
  const [charges, balance, invoices, subs, sessions] = await Promise.all([
    safe('Charges', src.stripeCharges(monthsBack * 31), [] as Charge[]),
    safe('Balance', src.stripeBalance(), null),
    safe('Invoices', src.stripeOpenInvoices(), []),
    safe('Subscriptions', src.stripeSubscriptions(), []),
    safe('Checkout', src.stripeSessions(), []),
  ]);
  const dealByPi = new Map(sessions.filter((s) => s.payment_intent && s.client_reference_id).map((s) => [s.payment_intent!, s.client_reference_id!]));
  const paid = charges.filter((c) => c.paid && c.status === 'succeeded');
  const net = (c: Charge) => (c.amount - c.amount_refunded) / 100;
  const months = Array.from({ length: monthsBack }, (_, i) => {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - (monthsBack - 1 - i));
    const start = monthStart(d); const end = monthStart(new Date(d.getFullYear(), d.getMonth() + 1, 1));
    return { label: d.toLocaleDateString('en-GB', { month: 'short' }), value: paid.filter((c) => c.created * 1000 >= start && c.created * 1000 < end).reduce((s, c) => s + net(c), 0) };
  });
  const mrr = subs.reduce((s, sub) => s + sub.items.data.reduce((t, it) => {
    const r = it.price.recurring; const amt = (it.price.unit_amount ?? 0) / 100 * (it.quantity ?? 1);
    if (!r) return t;
    const perMonth = r.interval === 'year' ? amt / (12 * r.interval_count) : r.interval === 'week' ? amt * 4.33 / r.interval_count : amt / r.interval_count;
    return t + perMonth;
  }, 0), 0);
  const thisMonth = months[months.length - 1].value;
  return {
    errors, connected: true as const,
    kpis: {
      thisMonth, goal: FUNNEL.goals.monthlyRevenue, mrr, mrrGoal: FUNNEL.goals.mrr,
      available: (balance?.available ?? []).reduce((s, b) => s + b.amount / 100, 0), pending: (balance?.pending ?? []).reduce((s, b) => s + b.amount / 100, 0),
      outstanding: invoices.reduce((s, i) => s + i.amount_due / 100, 0),
    },
    months, monthsBack,
    payments: charges.slice(0, 25).map((c) => ({
      id: c.id, at: new Date(c.created * 1000).toISOString(), amount: c.amount / 100, currency: c.currency, who: c.billing_details.name ?? c.billing_details.email ?? 'Unknown',
      status: c.disputed ? 'disputed' : c.refunded ? 'refunded' : c.amount_refunded ? 'part-refunded' : c.paid ? 'paid' : 'failed',
      dealId: c.payment_intent ? dealByPi.get(c.payment_intent) : undefined, receipt: c.receipt_url,
    })),
    invoices: invoices.map((i) => ({ id: i.id, number: i.number ?? '', amount: i.amount_due / 100, who: i.customer_name ?? i.customer_email ?? '', due: i.due_date ? new Date(i.due_date * 1000).toISOString() : '', url: i.hosted_invoice_url })),
    subscriptions: subs.length,
  };
}

// ---------------------------------------------------------------- Automations + System + Content
export async function automationsData(kind?: string) {
  if (demoOn()) return demo.automations(kind) as never;
  const { errors, safe } = collector();
  const [reports, autos, events, health] = await Promise.all([
    safe('Routine', reportsFor(FUNNEL.routine.logEmail, 10), [] as RoutineReport[]),
    safe('MailerLite', src.mlAutomations(), []),
    safe('Activity', listEvents(500), [] as OpsEvent[]),
    getJSON<{ at?: string; ok?: boolean }>('meta/health.json', {}),
  ]);
  const last = (kinds: OpsEvent['kind'][]) => events.find((e) => kinds.includes(e.kind))?.at ?? null;
  return {
    errors, reports,
    mailerlite: autos.map((a) => ({ name: a.name, enabled: a.enabled, expected: (FUNNEL.mailerlite.automations as readonly string[]).includes(a.name), sent: a.stats.sent, inQueue: a.stats.subscribers_in_queue_count })),
    webhooks: [
      { name: 'Website forms', detail: 'Leak Map, audit questionnaire, contact form, newsletter', last: last(['lead', 'enquiry', 'subscribe']) },
      { name: 'Cal.com bookings', detail: 'Booked, rescheduled, cancelled, no-show', last: last(['booking', 'reschedule', 'cancel', 'noshow']) },
      { name: 'Stripe payments', detail: 'Deposits, invoices, refunds, failures', last: last(['payment', 'payment_issue', 'refund']) },
      { name: 'Instagram', detail: 'Keyword comments and DMs', last: last(['ig_comment', 'ig_dm']) },
      { name: 'Tracked links', detail: '/go/<campaign> clicks', last: last(['click']) },
    ],
    crons: [{ name: 'Daily health check + Monday scoreboard', schedule: 'Every day 09:00 Zanzibar', last: health.at ?? null, ok: health.ok ?? null }],
    feed: (kind ? events.filter((e) => e.kind === kind) : events).slice(0, 100),
    kinds: tally(events.map((e) => e.kind)),
  };
}

export async function systemData() {
  const checks = await runChecks();
  const has = (k: string) => !!process.env[k];
  return {
    checks,
    integrations: [
      { name: 'HubSpot', role: 'CRM: people, deals, notes', ok: has('HUBSPOT_TOKEN'), env: 'HUBSPOT_TOKEN' },
      { name: 'MailerLite', role: 'Email sequences + newsletter', ok: has('MAILERLITE_API_TOKEN'), env: 'MAILERLITE_API_TOKEN' },
      { name: 'Zoho Mail', role: 'One-off emails from contact@', ok: has('ZOHO_SMTP_PASS'), env: 'ZOHO_SMTP_*' },
      { name: 'Cal.com webhook', role: 'Bookings → CRM + emails', ok: has('CAL_WEBHOOK_SECRET'), env: 'CAL_WEBHOOK_SECRET' },
      { name: 'Cal.com API', role: 'Calls tab (read bookings)', ok: has('CAL_API_KEY'), env: 'CAL_API_KEY' },
      { name: 'Stripe webhook', role: 'Payments → Won + onboarding', ok: has('STRIPE_WEBHOOK_SECRET'), env: 'STRIPE_WEBHOOK_SECRET' },
      { name: 'Stripe read key', role: 'Money tab', ok: has('STRIPE_READ_KEY'), env: 'STRIPE_READ_KEY' },
      { name: 'Instagram', role: 'Keyword DMs + posts', ok: has('IG_ACCESS_TOKEN'), env: 'IG_ACCESS_TOKEN' },
      { name: 'Telegram', role: 'Alerts to your phone', ok: has('TELEGRAM_BOT_TOKEN'), env: 'TELEGRAM_BOT_TOKEN' },
      { name: 'Vercel Blob', role: 'Campaigns, stats, activity feed', ok: has('BLOB_READ_WRITE_TOKEN'), env: 'BLOB_READ_WRITE_TOKEN' },
      { name: 'Fathom API', role: 'Call recordings + recaps', ok: has('FATHOM_API_KEY'), env: 'FATHOM_API_KEY' },
      { name: 'Fathom webhook', role: 'Same-day recap on Telegram + HubSpot', ok: has('FATHOM_WEBHOOK_SECRET'), env: 'FATHOM_WEBHOOK_SECRET' },
      { name: 'Apify', role: 'Find prospects (Google Maps)', ok: has('APIFY_TOKEN'), env: 'APIFY_TOKEN' },
      { name: 'Zoho inbox (IMAP)', role: 'Email threads, outreach replies', ok: has('ZOHO_SMTP_PASS'), env: 'IMAP on in Zoho' },
      { name: 'Claude routine', role: 'Daily drafts + run reports', ok: true, env: 'claude.ai routine' },
    ],
  };
}

export async function contentData() {
  if (demoOn()) return demo.content() as never;
  const { errors, safe } = collector();
  const [reports, ig] = await Promise.all([
    safe('Routine', reportsFor(FUNNEL.routine.logEmail, 10), [] as RoutineReport[]),
    instagramData(),
  ]);
  return {
    errors: [...errors, ...ig.errors],
    drafts: reports.flatMap((r) => r.items.filter((i) => i.job === 'content').map((i) => ({ ...i, runAt: r.runAt }))),
    topPosts: [...ig.posts].filter((p) => p.leads).sort((a, b) => b.leads - a.leads).slice(0, 6),
    posts: ig.posts.map((p) => ({ timestamp: p.timestamp })),
  };
}
