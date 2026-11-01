// Content strategy (decided with Naufal 2026-11-01): the same market as Quam/Agentryx, so posts lead with a
// PROBLEM every service business shares (a Leak Map layer) and use ONE industry as the example. The hook names
// the problem, never "service businesses" in general (31 Oct research: generic agency content gets ~0
// engagement; specific problems and "here's what I built" demos win). Outbound stays one industry at a time.

export const LAYERS = [
  { key: 'attention', label: 'Attention', problem: 'Nobody finds them, or AI search skips them' },
  { key: 'capture', label: 'Capture', problem: 'Enquiries land in four inboxes and some are never seen' },
  { key: 'pipeline', label: 'Pipeline', problem: 'No idea which leads are live or what they are worth' },
  { key: 'followup', label: 'Follow-up', problem: 'Leads go cold because follow-up is someone remembering' },
  { key: 'conversion', label: 'Conversion', problem: 'Quotes and proposals sit unread; deposits get chased' },
  { key: 'fulfilment', label: 'Fulfilment', problem: 'Onboarding is a mess of emails, forms and chasing' },
  { key: 'retention', label: 'Retention', problem: 'No reviews, repeat work or referrals asked for' },
  { key: 'attribution', label: 'Attribution', problem: 'No idea which channel or post brings paying clients' },
] as const;
export type LayerKey = (typeof LAYERS)[number]['key'];

/** The 2026-10-11 market (same mix as Agentryx). Healthcare stays out (patient data). Edit freely. */
export const INDUSTRIES = [
  { key: 'design', label: 'Design studios', example: 'interior designers, architects, design-build' },
  { key: 'property', label: 'Property', example: 'estate and letting agents, property investors, developers' },
  { key: 'construction', label: 'Construction & trades', example: 'builders, remodelers, roofers, landscapers' },
  { key: 'agencies', label: 'Agencies & B2B services', example: 'marketing agencies, consultancies, IT providers' },
  { key: 'education', label: 'Education & academies', example: 'training academies, course businesses, tutoring firms' },
  { key: 'professional', label: 'Professional services', example: 'accountants, law firms, financial advisers, insurance brokers' },
] as const;
export type IndustryKey = (typeof INDUSTRIES)[number]['key'];

export const layerLabel = (k?: string) => LAYERS.find((l) => l.key === k)?.label ?? '';
export const industryLabel = (k?: string) => INDUSTRIES.find((i) => i.key === k)?.label ?? '';

/** The week (Mon..Sun): format from what works in the research, and the layers it suits. */
export const WEEK = [
  { day: 'Mon', format: 'Build demo', how: '“Here’s the system I built for…” on screen', layers: ['capture', 'fulfilment'] },
  { day: 'Tue', format: 'Problem carousel', how: 'A problem they haven’t noticed yet, then the reframe', layers: ['attention', 'capture'] },
  { day: 'Wed', format: 'The awkward-moment script', how: 'Exactly what to send when a client goes quiet', layers: ['followup'] },
  { day: 'Thu', format: 'System walkthrough', how: '“This system does X for your business”', layers: ['pipeline', 'fulfilment'] },
  { day: 'Fri', format: 'Carousel + keyword', how: 'Problem → fix, then “Comment LEAK”', layers: ['conversion', 'followup'] },
  { day: 'Sat', format: 'Rank the tools', how: 'Rate the tools they already use', layers: ['attribution', 'pipeline'] },
  { day: 'Sun', format: 'Behind the scenes', how: 'Your view, what you’re building (the Quam lane)', layers: ['retention'] },
] as const;

/** The industry example for a given day: rotates so a week covers the market, steady for the whole day. */
export function industryFor(date: Date) {
  const day = Math.floor(date.getTime() / 86_400_000);
  return INDUSTRIES[day % INDUSTRIES.length];
}
