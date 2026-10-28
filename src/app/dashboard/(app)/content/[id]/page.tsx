import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getPost, newPost, trackedLink, CHANNELS, type ContentPost } from '@/lib/content';
import { tiktokApproved } from '@/lib/publish';
import { linkedinAccount } from '@/lib/linkedin';
import { tiktokConnected, creatorInfo } from '@/lib/tiktok';
import { getCampaigns } from '@/lib/campaigns';
import { qstashReady } from '@/lib/qstash';
import { aiReady } from '@/lib/ai';
import { demoOn } from '@/lib/ops/demo';
import { FUNNEL } from '@/config/funnel';
import { PageHeader } from '@/components/dashboard/ui';
import { PostEditor } from './PostEditor';

export const dynamic = 'force-dynamic';
// Publish runs every channel inside this request (video uploads, Instagram processing).
export const maxDuration = 300;

function demoPost(): ContentPost {
  const p = newPost('Most design studios lose the client between the first call and the deposit. Three places it leaks.');
  p.id = 'p20261017-demo';
  p.master.media = { path: 'content/media/demo.mp4', kind: 'video', durationSec: 42, width: 1080, height: 1920, sizeBytes: 18_000_000, name: 'leak-3-places.mp4' };
  p.channels.linkedin = { ...p.channels.linkedin, enabled: true, status: 'ready', text: 'Most design studios don’t lose clients on price.\n\nThey lose them between the first call and the deposit.\n\n#interiordesign #smallbusiness', firstComment: 'Free Leak Map: {link}' };
  p.channels.instagram = { ...p.channels.instagram, enabled: true, status: 'ready', caption: 'Where design studios lose clients (it’s not price).\n\nComment LEAK and I’ll send you the map.' };
  p.channels.tiktok = { ...p.channels.tiktok, enabled: true, status: 'held', privacy: 'PUBLIC_TO_EVERYONE', caption: 'The 3 places design studios lose clients #interiordesign' };
  return p;
}

export default async function EditPost({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const demo = demoOn() && id === 'demo';
  const post = demo ? demoPost() : await getPost(id);
  if (!post) notFound();

  const [li, campaigns, creator] = demo
    ? [{ name: 'Naufal', daysLeft: 52, expired: false }, [{ id: 'leak-map', name: 'Leak Map', keywords: ['LEAK', 'MAP'] }], null]
    : await Promise.all([
      linkedinAccount().catch(() => null),
      getCampaigns().then((l) => l.filter((c) => c.active).map((c) => ({ id: c.id, name: c.name, keywords: c.keywords }))),
      tiktokConnected().then((ok) => (ok ? creatorInfo().catch(() => null) : null)),
    ]);

  return (
    <>
      <div className="flex items-center gap-2 text-xs text-white/60"><Link href="/dashboard/content" className="hover:text-white">← Content</Link><span>/</span><span>{post.id}</span></div>
      <PageHeader title={post.master.idea ? post.master.idea.slice(0, 60) + (post.master.idea.length > 60 ? '…' : '') : 'New post'}
        sub="Write it once, tune it for each channel, then publish now or at an exact time. Each channel goes out on its own." />
      <PostEditor initial={post} ctx={{
        campaigns: campaigns as { id: string; name: string; keywords: string[] }[],
        creator: creator ? {
          nickname: creator.creator_nickname, username: creator.creator_username, avatar: creator.creator_avatar_url,
          privacyOptions: creator.privacy_level_options, commentDisabled: creator.comment_disabled, duetDisabled: creator.duet_disabled,
          stitchDisabled: creator.stitch_disabled, maxSec: creator.max_video_post_duration_sec,
        } : null,
        linkedinName: li?.name, linkedinDays: li && !li.expired ? li.daysLeft : null,
        tiktokApproved: await tiktokApproved(), qstash: demo || qstashReady(),
        links: Object.fromEntries(CHANNELS.map((c) => [c, trackedLink(post.id, c)])) as Record<(typeof CHANNELS)[number], string>,
        quickTimes: [...FUNNEL.content.defaultTimes], usTz: FUNNEL.content.usTz, firstComment: FUNNEL.content.linkedinFirstComment, ai: demo || aiReady(),
      }} />
    </>
  );
}
