export const INDUSTRY_CONTEXT: Record<string, string> = {
  'Marketing Agency':
    'Benchmarks: Close rate 20-30% warm leads, 5-15% cold outreach. Retainers typically £1,500-£8,000/mo. Churn spikes at months 3 and 6 when clients question ROI. 68% of agencies lose clients due to communication failures not results. Average proposal-to-close time is 14 days — every day without follow-up drops close rate by 8%. Onboarding friction is the #1 cause of early churn; clients who get a structured first 30 days stay 3x longer. Most agencies have no automated follow-up on open proposals and rely on manual check-ins for retention.',

  'Coaching / Consulting':
    'Benchmarks: Discovery call close rates 20-40% when leads are pre-qualified, 8-15% unqualified. Programme prices £1,000-£5,000, retainers £500-£2,500/mo. 72% of coaches cite lead acquisition as top challenge despite having strong offers. Most rely on DMs and manual booking — no nurture sequence means 60% of warm leads forget who you are within 2 weeks. Post-programme retention is almost always zero — no structured upsell or continuation path means revenue resets every cohort.',

  'Web Design / Dev':
    'Benchmarks: Average project £1,500-£15,000. Close rate on inbound 30-50%, cold outreach 5-10%. Project-based revenue is volatile — most studios have no retainer conversion strategy. 80% of clients never get a follow-up after project delivery, killing referral and repeat business. Scope creep adds 20-40% to project time with no additional revenue. Most studios have no CRM — leads tracked in email, Notion, or memory.',

  'Recruitment':
    'Benchmarks: Placement fees 15-25% of salary. Average sales cycle 2-6 weeks. 70% of recruiters lose placements due to slow response times — candidates accept other offers within 48-72h. Follow-up cadence is the single biggest revenue lever. Most recruitment businesses have no structured pipeline visibility — deals lost to silence, not competition. Retainer/exclusive model conversion is low because value is not communicated during early relationship stages.',

  'Real Estate':
    'Benchmarks: Average commission 1-2% UK residential, 10-15% of annual rent for lettings. Lead-to-viewing conversion 15-30%, viewing-to-offer 10-20%. 44% of enquiries never get a second contact. Nurture sequences are almost non-existent — most agents rely on reactive contact. Landlord retention requires proactive communication; agents who automate quarterly check-ins retain 40% more landlords long-term.',

  'Legal / Finance':
    'Benchmarks: Consultation-to-client conversion 25-45% for warm referrals. Average matter value £500-£15,000+. Client acquisition is 5x more expensive than retention yet most firms have no structured client communication post-matter. Follow-up after consultations drops off after 1 contact in 70% of firms. Referral systems are informal — most firms have no mechanism to systematically generate referrals from satisfied clients.',

  'Health & Wellness':
    'Benchmarks: Gym/PT close rate on trials 30-50%. Average PT package £300-£1,500/mo. Client churn is highest in months 2-3 when initial motivation drops. Most practitioners have no re-engagement sequence for churned clients — yet 40% would return with a single well-timed message. Booking and payment friction cause 20-30% drop-off at intake. Upsell from single sessions to packages happens manually if at all.',

  'E-commerce':
    'Benchmarks: Average cart abandonment rate 70-75%. Email capture rate from traffic 2-5% without lead magnets. Repeat purchase rate under 20% for most stores without lifecycle emails. Post-purchase sequence is the single highest-ROI automation available — stores with it see 25-40% higher LTV. Most stores have no win-back sequence for lapsed customers, leaving significant revenue on the table.',
};

export function getIndustryContext(industry: string): string {
  return INDUSTRY_CONTEXT[industry] ?? '';
}
