import { NextRequest, NextResponse, after } from 'next/server';
import { getCampaigns, destination, bump } from '@/lib/campaigns';
import { FUNNEL } from '@/config/funnel';

// Tracked link sent in campaign DMs: /go/<campaignId> → count the click → the campaign's URL with
// utm tags, which the site's attribution then carries into HubSpot on sign-up. Unknown ids go home.
export async function GET(req: NextRequest, ctx: RouteContext<'/go/[id]'>) {
  const { id } = await ctx.params;
  const campaign = (await getCampaigns()).find((c) => c.id === id);
  if (!campaign) return NextResponse.redirect(FUNNEL.site, 302);
  after(() => bump(campaign.id, 'clicks'));
  const medium = req.nextUrl.searchParams.get('m') ?? (campaign.channel === 'dm' ? 'dm' : 'comment');
  return NextResponse.redirect(destination(campaign, medium), 302);
}
