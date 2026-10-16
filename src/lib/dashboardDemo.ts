// Sample data for /dashboard when DASHBOARD_DEMO=1: for design work and for showing prospects what
// their Client System dashboard looks like. Clearly fictional names; never shown on the real dashboard.

import { OPEN_STAGES, type RoutineReport } from '@/lib/dashboard';
import { DEFAULT_CAMPAIGN } from '@/lib/campaigns';

const DAY = 86_400_000;

export const demoOn = () => process.env.DASHBOARD_DEMO === '1';

const daysAgo = (n: number) => new Date(Date.now() - n * DAY).toISOString();
const series = Array.from({ length: 30 }, (_, i) => ({
  day: new Date(Date.now() - (29 - i) * DAY).toISOString().slice(0, 10),
  count: [0, 1, 0, 2, 1, 0, 3, 1, 2, 0, 1, 4, 2, 1, 0, 2, 3, 1, 5, 2, 1, 3, 2, 4, 1, 3, 6, 2, 4, 3][i],
}));
const report = (h: number, counts: RoutineReport['counts'], needsYou: string[], items: RoutineReport['items']): RoutineReport =>
  ({ runAt: new Date(Date.now() - h * 3600_000).toISOString(), counts, needsYou, items });
const reports = [
  report(3, { replies: 2, calls: 1, proposals: 1, retention: 0, content: 3 }, ['Send the recap + proposal to Harper Studio (draft in Docs)', 'Reply to Mia at Oakline: she asked about timelines'], [
    { job: 'replies', title: 'Mia (Oakline Interiors) asked how long an install takes' },
    { job: 'calls', title: 'Research brief: Fernwood Design Co. (call today 18:00)' },
    { job: 'proposals', title: 'Proposal: Harper Studio (draft)' },
    { job: 'content', title: 'Leak post: “Your enquiry form is a black hole”', detail: 'Hook: Your enquiry form is a black hole.\n\nReel: 1) A client fills in your form at 9pm. 2) You see it Thursday. 3) They booked someone else Tuesday. 4) Fix: instant reply + a booking link in the first email. 5) Comment LEAK for the Leak Map.' },
    { job: 'content', title: 'Hot take: “Your CRM isn’t the problem. Your follow-up is.”' },
    { job: 'content', title: 'Build: the comment-to-DM system behind this post' },
  ]),
  report(27, { replies: 1, calls: 0, proposals: 0, retention: 1, content: 0 }, [], [
    { job: 'replies', title: 'Leak Map reply from a kitchen designer (wants the audit)' },
    { job: 'retention', title: 'Testimonial ask draft: Northbank Renovations (21 days)' },
  ]),
  report(51, {}, [], []),
];

export const demo = {
  overview: () => ({
    errors: [] as string[],
    kpis: { leads7: 18, leadsPrev7: 12, booked: 3, wonMonth: 3750, wonMonthCount: 2, openValue: 14200, openCount: 9 },
    series,
    bySource: [['instagram_dm', 21], ['leak_map_popup', 14], ['audit_questionnaire', 8], ['referral', 4], ['cold_email', 3]] as [string, number][],
    funnel: [
      { label: 'Leads (30d)', value: 50 }, { label: 'Audit booked', value: 3 }, { label: 'Audit done', value: 2 },
      { label: 'Scope sent', value: 2 }, { label: 'Won (30d)', value: 2 },
    ],
    goal: { target: 5000, wonMonth: 3750, gap: 1250, openValue: 14200, coverage: 11.4, coverageTarget: 3 },
    lostWhy: [['timing', 2], ['price', 1]] as [string, number][],
    booked: [{ id: '1', name: 'Fernwood Design Co. · Free audit' }, { id: '2', name: 'Oakline Interiors · Free audit' }],
    recent: [
      { id: 'a', name: 'Mia Turner', source: 'instagram_dm', at: daysAgo(0.05) },
      { id: 'b', name: '@studio.harper', source: 'instagram_dm', at: daysAgo(0.2) },
      { id: 'c', name: 'James Okafor', source: 'leak_map_popup', at: daysAgo(0.6) },
      { id: 'd', name: 'Priya Shah', source: 'audit_questionnaire', at: daysAgo(1.2) },
      { id: 'e', name: 'Tom Ellis', source: 'referral', at: daysAgo(2.1) },
      { id: 'f', name: 'Grace Lin', source: 'leak_map_popup', at: daysAgo(3.4) },
    ],
    lastRun: reports[0],
  }),
  pipeline: () => {
    const deals: Record<string, { name: string; amount: number; priority?: string; source?: string }[]> = {
      'New enquiry': [{ name: 'Grace Lin · Leak Map', amount: 0, source: 'leak_map_popup' }, { name: 'Tom Ellis', amount: 0, source: 'referral' }],
      Contacted: [{ name: 'Priya Shah', amount: 0, source: 'audit_questionnaire' }],
      'Audit booked': [{ name: 'Fernwood Design Co.', amount: 0, priority: 'high', source: 'instagram_dm' }, { name: 'Oakline Interiors', amount: 0, source: 'instagram_dm' }],
      'Audit done': [{ name: 'Harper Studio', amount: 5000, priority: 'high', source: 'instagram_dm' }],
      'Scope sent': [{ name: 'Northside Kitchens', amount: 5000, source: 'leak_map_popup' }, { name: 'Bloom Florals', amount: 750, source: 'cold_email' }],
    };
    return {
      errors: [] as string[],
      stages: OPEN_STAGES.map(([id, label]) => {
        const ds = (deals[label] ?? []).map((d, i) => ({ id: `${id}-${i}`, createdAt: daysAgo(i * 2 + 1), priority: d.priority ?? '', source: d.source ?? '', name: d.name, amount: d.amount }));
        return { id, label, deals: ds, total: ds.length, value: ds.reduce((s, d) => s + d.amount, 0) };
      }),
    };
  },
  campaigns: () => ({
    errors: [] as string[],
    campaigns: [
      { ...DEFAULT_CAMPAIGN, stats: { comments: 64, dms: 63, clicks: 41, leads: 21, deals: 4 } },
      { id: 'free-audit', name: 'Free audit', keywords: ['AUDIT', 'BOOK'], channel: 'both' as const, postIds: [], message: 'Here’s the link to book 👇\n\n{link}', url: 'https://www.naunas.co.uk/audit', active: true, stats: { comments: 12, dms: 12, clicks: 9, leads: 6, deals: 2 } },
      { id: 'follow-up-kit', name: 'Follow-up kit', keywords: ['FOLLOWUP'], channel: 'comment' as const, postIds: ['17912345678901234'], message: '{link}', url: 'https://www.naunas.co.uk/', active: false, endsAt: daysAgo(-10), stats: { comments: 5, dms: 5, clicks: 2, leads: 1, deals: 0 } },
    ],
    topPosts: [
      { url: 'https://www.instagram.com/p/DEMO1enquiry/', leads: 9 }, { url: 'https://www.instagram.com/reel/DEMO2followup/', leads: 6 },
      { url: 'https://www.instagram.com/p/DEMO3crm/', leads: 4 }, { url: 'https://www.instagram.com/reel/DEMO4build/', leads: 2 },
    ],
  }),
  routine: () => ({ errors: [] as string[], reports }),
};
