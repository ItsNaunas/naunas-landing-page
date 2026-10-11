// Client-side attribution: remembers where a visitor FIRST came from (kept for 90 days) and the
// most recent tagged visit, so every form can send both to HubSpot. No third-party cookies.

const FIRST_KEY = 'nx_first_touch';
const LAST_KEY = 'nx_last_touch';
const NINETY_DAYS = 90 * 24 * 60 * 60 * 1000;

export type Touch = { source: string; medium: string; campaign: string; page: string; at: number };

export type Attribution = {
  first_touch_source?: string;
  first_touch_medium?: string;
  first_touch_campaign?: string;
  first_landing_page?: string;
  last_touch_source?: string;
  last_touch_medium?: string;
  last_touch_campaign?: string;
  converted_on_page?: string;
};

function read(key: string): Touch | null {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as Touch) : null;
  } catch {
    return null;
  }
}

function write(key: string, t: Touch) {
  try { localStorage.setItem(key, JSON.stringify(t)); } catch { /* private mode */ }
}

function referrerSource(): { source: string; medium: string } {
  const ref = document.referrer;
  if (!ref) return { source: 'direct', medium: 'none' };
  try {
    const host = new URL(ref).hostname.replace(/^www\./, '');
    if (host.endsWith('naunas.co.uk')) return { source: '', medium: '' };
    if (/google\./.test(host)) return { source: 'google', medium: 'organic' };
    if (/bing\.|duckduckgo\./.test(host)) return { source: host.split('.')[0], medium: 'organic' };
    if (/instagram\./.test(host)) return { source: 'instagram', medium: 'referral' };
    if (/linkedin\.|lnkd\.in/.test(host)) return { source: 'linkedin', medium: 'referral' };
    if (/tiktok\./.test(host)) return { source: 'tiktok', medium: 'referral' };
    if (/facebook\.|fb\./.test(host)) return { source: 'facebook', medium: 'referral' };
    return { source: host, medium: 'referral' };
  } catch {
    return { source: 'direct', medium: 'none' };
  }
}

/** Call once per page load. */
export function captureTouch() {
  const q = new URLSearchParams(window.location.search);
  const tagged = q.get('utm_source') || q.get('src');
  const fromRef = tagged ? null : referrerSource();
  if (!tagged && !fromRef?.source) return; // internal navigation: nothing new

  const touch: Touch = {
    source: (q.get('utm_source') || (q.get('src') ? 'naunas-link' : '') || fromRef?.source || '').slice(0, 80),
    medium: (q.get('utm_medium') || q.get('src') || fromRef?.medium || '').slice(0, 80),
    campaign: (q.get('utm_campaign') || '').slice(0, 120),
    page: window.location.pathname,
    at: Date.now(),
  };

  const first = read(FIRST_KEY);
  if (!first || Date.now() - first.at > NINETY_DAYS) write(FIRST_KEY, touch);
  if (tagged || !read(LAST_KEY)) write(LAST_KEY, touch);
}

/** Attach to every form submission. */
export function getAttribution(): Attribution {
  const first = read(FIRST_KEY);
  const last = read(LAST_KEY) ?? first;
  return {
    first_touch_source: first?.source,
    first_touch_medium: first?.medium,
    first_touch_campaign: first?.campaign,
    first_landing_page: first?.page,
    last_touch_source: last?.source,
    last_touch_medium: last?.medium,
    last_touch_campaign: last?.campaign,
    converted_on_page: typeof window !== 'undefined' ? window.location.pathname : undefined,
  };
}
