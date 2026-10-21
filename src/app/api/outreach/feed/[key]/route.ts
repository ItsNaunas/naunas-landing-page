import { NextRequest, NextResponse } from 'next/server';
import { getProspects } from '@/lib/outreach';
import { FUNNEL } from '@/config/funnel';

// Read by the Claude routine (WebFetch): approved prospects that still need drafts. Public business data
// only (firm, website, Instagram, city, Google rating); behind an unguessable path, never indexed.
export async function GET(_req: NextRequest, ctx: RouteContext<'/api/outreach/feed/[key]'>) {
  const { key } = await ctx.params;
  if (key !== FUNNEL.outreach.feedKey) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const list = (await getProspects()).filter((p) => p.status === 'approved').slice(0, 25).map((p) => ({
    id: p.id, firm: p.firm, website: p.website, instagram: p.instagram ? `https://instagram.com/${p.instagram}` : undefined,
    city: [p.city, p.state].filter(Boolean).join(', '), category: p.category, rating: p.rating, reviews: p.reviews, hasEmail: !!p.email,
  }));
  return NextResponse.json({ prospects: list }, { headers: { 'X-Robots-Tag': 'noindex', 'Cache-Control': 'no-store' } });
}
