// Apify (env APIFY_TOKEN): Google Maps Scraper (compass/crawler-google-places) for finding prospects.
// Runs on demand from /dashboard/outreach, with website-only + contact enrichment (≈ $0.007 per place on
// the free tier) and a hard per-run charge cap. Read the results once the run succeeds.

const API = 'https://api.apify.com/v2';
const ACTOR = 'compass~crawler-google-places';

export const apifyReady = () => !!process.env.APIFY_TOKEN;

async function apify<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = process.env.APIFY_TOKEN;
  if (!token) throw new Error('Missing APIFY_TOKEN');
  const res = await fetch(`${API}${path}`, { ...init, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) }, cache: 'no-store' });
  if (!res.ok) throw new Error(`Apify ${path.split('?')[0]} → ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json() as Promise<T>;
}

export type ApifyRun = { id: string; status: string; defaultDatasetId: string; usageTotalUsd?: number };

/** Start a Google Maps search. `maxChargeUsd` caps what this one run can cost. */
export async function startMapsSearch(opts: { term: string; location: string; max: number; maxChargeUsd: number }): Promise<ApifyRun> {
  const input = {
    searchStringsArray: [opts.term],
    locationQuery: opts.location,
    maxCrawledPlacesPerSearch: Math.min(100, Math.max(5, opts.max)),
    language: 'en',
    website: 'withWebsite',
    skipClosedPlaces: true,
    scrapeContacts: true,
  };
  const r = await apify<{ data: ApifyRun }>(`/acts/${ACTOR}/runs?maxTotalChargeUsd=${opts.maxChargeUsd}`, { method: 'POST', body: JSON.stringify(input) });
  return r.data;
}

export const getRun = (id: string) => apify<{ data: ApifyRun }>(`/actor-runs/${id}`).then((r) => r.data);

export type Place = {
  placeId?: string; title: string; website?: string; domain?: string; categoryName?: string; categories?: string[];
  city?: string; state?: string; countryCode?: string; address?: string; phone?: string;
  totalScore?: number | null; reviewsCount?: number | null; url?: string;
  emails?: string[]; instagrams?: string[]; facebooks?: string[]; linkedIns?: string[];
  permanentlyClosed?: boolean;
};

export const datasetItems = (datasetId: string) => apify<Place[]>(`/datasets/${datasetId}/items?clean=true&format=json&limit=200`);

export async function checkApify(): Promise<string> {
  const r = await apify<{ data: { username?: string; plan?: { id?: string } } }>('/users/me');
  return `API ok (${r.data.username ?? 'account'})`;
}
