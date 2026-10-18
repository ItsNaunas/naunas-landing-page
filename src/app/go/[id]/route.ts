import { NextRequest, NextResponse, after } from 'next/server';
import { getCampaigns, destination, bump } from '@/lib/campaigns';
import { parseTracked, destinationFor, CHANNEL_LABEL } from '@/lib/content';
import { updateJSON } from '@/lib/store';
import { FUNNEL } from '@/config/funnel';
import { logEvent } from '@/lib/events';

// Tracked links: /go/<campaignId> (Instagram keyword DMs) and /go/p-<postId>-<li|ig|tt> (content posts,
// one per channel). Count the click, then redirect with utm tags; the site's attribution carries them into
// HubSpot (first_touch_campaign = campaign or post id). Unknown ids go home.
export async function GET(req: NextRequest, ctx: RouteContext<'/go/[id]'>) {
  const { id } = await ctx.params;

  const post = parseTracked(id);
  if (post) {
    after(async () => {
      await updateJSON<Record<string, Record<string, number>>>('stats/content.json', {}, (s) => {
        const row = s[post.postId] ?? {};
        return { ...s, [post.postId]: { ...row, [post.ch]: (row[post.ch] ?? 0) + 1 } };
      }).catch(() => {});
      await logEvent('click', `Link clicked · ${CHANNEL_LABEL[post.ch]} post`, `/dashboard/content/${post.postId}`);
    });
    return NextResponse.redirect(destinationFor(post.postId, post.ch), 302);
  }

  const campaign = (await getCampaigns()).find((c) => c.id === id);
  if (!campaign) return NextResponse.redirect(FUNNEL.site, 302);
  after(async () => {
    await bump(campaign.id, 'clicks');
    await logEvent('click', `Link clicked · ${campaign.name}`);
  });
  const medium = req.nextUrl.searchParams.get('m') ?? (campaign.channel === 'dm' ? 'dm' : 'comment');
  return NextResponse.redirect(destination(campaign, medium), 302);
}
