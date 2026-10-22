// Deposit links made for you (2026-10-23): with a restricted Stripe key (env STRIPE_LINKS_KEY, write access to
// Products, Prices and Payment Links only), publishing a proposal creates its deposit Payment Link from the
// "Deposit to start" amount. The deal id and their email are still added on the page (lib/proposal depositHref),
// so the existing Stripe webhook marks the deal Won and sends onboarding exactly as before.

export const stripeLinksReady = () => !!process.env.STRIPE_LINKS_KEY;

/** "£1,500" → { amount: 150000, currency: 'gbp' }. Pounds, dollars or euros; null when no amount can be read. */
export function parseAmount(text: string): { amount: number; currency: 'gbp' | 'usd' | 'eur' } | null {
  const t = text.replace(/,/g, '');
  const m = t.match(/([£$€])\s*(\d+(?:\.\d{1,2})?)|(\d+(?:\.\d{1,2})?)\s*(gbp|usd|eur)/i);
  if (!m) return null;
  const sym = (m[1] ?? m[4] ?? '').toLowerCase();
  const n = Number(m[2] ?? m[3]);
  if (!n || n < 1) return null;
  const currency = sym === '$' || sym === 'usd' ? 'usd' : sym === '€' || sym === 'eur' ? 'eur' : 'gbp';
  return { amount: Math.round(n * 100), currency };
}

async function stripe<T>(path: string, form: Record<string, string>): Promise<T> {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: 'POST', cache: 'no-store',
    headers: { Authorization: `Bearer ${process.env.STRIPE_LINKS_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(form),
  });
  const body = (await res.json()) as T & { error?: { message?: string } };
  if (!res.ok) throw new Error(`Stripe ${path}: ${body.error?.message ?? res.status}`);
  return body;
}

/** A one-off Payment Link for this deposit. Returns the buy.stripe.com URL. */
export async function createDepositLink(opts: { deposit: string; client: string; proposalUrl: string; dealId?: string }): Promise<string> {
  if (!stripeLinksReady()) throw new Error('STRIPE_LINKS_KEY is not set.');
  const a = parseAmount(opts.deposit);
  if (!a) throw new Error('Write the deposit as an amount, e.g. £1,500.');
  const price = await stripe<{ id: string }>('prices', {
    currency: a.currency, unit_amount: String(a.amount), 'product_data[name]': `Deposit · ${opts.client}`.slice(0, 120),
  });
  const link = await stripe<{ url: string }>('payment_links', {
    'line_items[0][price]': price.id, 'line_items[0][quantity]': '1',
    'after_completion[type]': 'redirect', 'after_completion[redirect][url]': opts.proposalUrl,
    ...(opts.dealId ? { 'metadata[deal_id]': opts.dealId } : {}),
  });
  return link.url;
}
