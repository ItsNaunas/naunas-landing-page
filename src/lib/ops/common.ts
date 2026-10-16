import { STAGE } from '@/lib/hubspot';

// Shared bits for the /dashboard data layer.

export const DAY = 86_400_000;
/** Now, rounded down to 2 minutes, so time-window queries share cache keys. */
export const nowish = () => Math.floor(Date.now() / 120_000) * 120_000;
export const num = (v?: string | number | null) => Number(v ?? 0) || 0;
export const ts = (v?: string | null) => Date.parse(v ?? '') || 0;
export const tally = (xs: string[]) => xs.reduce<Record<string, number>>((a, x) => ({ ...a, [x]: (a[x] ?? 0) + 1 }), {});
export const monthStart = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), 1).getTime();

export const OPEN_STAGES: [string, string][] = [
  [STAGE.newEnquiry, 'New enquiry'], [STAGE.contacted, 'Contacted'], [STAGE.auditBooked, 'Audit booked'],
  [STAGE.auditDone, 'Audit done'], [STAGE.scopeSent, 'Scope sent'],
];
export const STAGE_LABEL: Record<string, string> = {
  ...Object.fromEntries(OPEN_STAGES), [STAGE.won]: 'Won', [STAGE.lost]: 'Lost',
};
export const SOURCE_LABEL: Record<string, string> = {
  leak_map_popup: 'Leak Map', audit_questionnaire: 'Audit form', cold_email: 'Cold email', instagram_dm: 'Instagram',
  linkedin: 'LinkedIn', referral: 'Referral', contact_form: 'Contact form', other: 'Newsletter / other',
};
export const LOST_LABEL: Record<string, string> = {
  price: 'Price', timing: 'Timing', competitor: 'Went elsewhere', diy: 'DIY', no_fit: 'Not a fit', ghosted: 'Went quiet', other: 'Other',
};

export type RoutineReport = {
  runAt: string;
  counts: Partial<Record<'replies' | 'calls' | 'proposals' | 'retention' | 'content', number>>;
  needsYou: string[];
  items: { job: string; title: string; detail?: string; link?: string }[];
};

/** Collects per-source errors so one failing API shows a warning instead of breaking the page. */
export function collector() {
  const errors: string[] = [];
  const safe = <T,>(label: string, p: Promise<T>, fallback: T): Promise<T> =>
    p.catch((err) => {
      errors.push(`${label}: ${err instanceof Error ? err.message.slice(0, 140) : String(err)}`);
      console.warn(`[dashboard] ${label} failed:`, err instanceof Error ? err.message.slice(0, 400) : err);
      return fallback;
    });
  return { errors, safe };
}

export const connected = {
  cal: () => !!process.env.CAL_API_KEY,
  stripe: () => !!process.env.STRIPE_READ_KEY,
  instagram: () => !!process.env.IG_ACCESS_TOKEN,
  blob: () => !!process.env.BLOB_READ_WRITE_TOKEN,
};
