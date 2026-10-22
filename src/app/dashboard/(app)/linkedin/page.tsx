import { linkedinConfigured, linkedinAccount, getPosts, postUrl, SCOPES } from '@/lib/linkedin';
import { PageHeader, Badge, Card, ago, linkProps } from '@/components/dashboard/ui';
import { SectionTitle, ConnectCard } from '@/components/dashboard/kit';
import { disconnectLinkedIn } from '../../actions';

export const dynamic = 'force-dynamic';

export default async function LinkedIn({ searchParams }: { searchParams: Promise<{ connected?: string; error?: string }> }) {
  const q = await searchParams;
  const configured = linkedinConfigured();
  const account = configured ? await linkedinAccount() : null;
  const live = !!account && !account.expired;
  const posts = live ? await getPosts() : [];
  const renewSoon = live && account.daysLeft <= 7;

  return (
    <>
      <a href="/dashboard/system#connections" className="text-xs text-white/60 hover:text-white -mb-3">← System</a>
      <PageHeader title="LinkedIn"
        sub={live ? `${account.name ?? 'Connected'} · your profile connection` : 'Connect your profile so Content can post to it'}
        action={account ? <form action={disconnectLinkedIn}><button className="text-xs text-white/60 hover:text-rose-300">Disconnect</button></form> : undefined} />

      {q.connected && <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] px-4 py-3 text-sm text-emerald-200/90">LinkedIn connected.</div>}
      {q.error && <div className="rounded-xl border border-rose-400/20 bg-rose-400/[0.06] px-4 py-3 text-sm text-rose-200/90">LinkedIn didn’t connect: {q.error === 'state' ? 'the login took too long or came from another browser. Try again.' : q.error}</div>}

      {!configured && <ConnectCard title="Set up the LinkedIn app" why="Needed to post to your LinkedIn profile from here." steps={['linkedin.com/developers/apps → your app → Auth', 'Copy the Client ID and Primary Client Secret']} env="LINKEDIN_CLIENT_ID + LINKEDIN_CLIENT_SECRET" />}

      {configured && (!live || renewSoon) && (
        <Card>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
            <div>
              <p className="font-medium">{account?.expired ? 'Your LinkedIn connection expired' : renewSoon ? `Your LinkedIn connection expires in ${account!.daysLeft} day${account!.daysLeft === 1 ? '' : 's'}` : 'Connect your LinkedIn profile'}</p>
              <p className="text-sm text-white/65 mt-1 max-w-xl">You’ll log in on LinkedIn and approve access. Naunas can then post to your profile, only when you press Publish here. LinkedIn makes you reconnect every 60 days.</p>
              <div className="flex flex-wrap gap-1 mt-2.5">{SCOPES.map((s) => <Badge key={s} tone="muted">{s}</Badge>)}</div>
            </div>
            <a href="/dashboard/linkedin/connect" className="shrink-0 rounded-lg bg-[#F2613F] px-4 py-2 text-sm font-medium text-white hover:bg-[#ff7553]">{account ? 'Reconnect LinkedIn' : 'Connect LinkedIn'}</a>
          </div>
        </Card>
      )}

      {live && (
        <>
          <Card>
            <p className="text-sm">Connected and good for <b>{account.daysLeft} more days</b>.</p>
            <p className="text-xs text-white/60 mt-1">Write LinkedIn posts in Content → New post (tick LinkedIn only if it’s just for here).</p>
          </Card>
          <SectionTitle>Posted from here</SectionTitle>
          {posts.length ? (
            <Card pad={false}>
              <ul className="divide-y divide-white/[0.05]">
                {posts.slice(0, 15).map((p) => (
                  <li key={p.urn || p.at} className="px-5 py-3 flex items-center gap-3 text-sm">
                    <Badge tone="good">{p.visibility === 'CONNECTIONS' ? 'Connections' : 'Public'}</Badge>
                    {p.media && <Badge tone="muted">{p.media}</Badge>}
                    <span className="truncate flex-1 min-w-0">{p.text}</span>
                    {p.urn && <a href={postUrl(p.urn)} {...linkProps} className="text-xs text-white/55 hover:text-white shrink-0">View ↗</a>}
                    <span className="text-xs text-white/55 shrink-0">{ago(p.at)}</span>
                  </li>
                ))}
              </ul>
            </Card>
          ) : <Card><p className="text-sm text-white/60">Nothing posted from the dashboard yet.</p></Card>}
          <p className="text-xs text-white/55">LinkedIn doesn’t give apps the stats on personal posts. See impressions and reactions in LinkedIn’s own analytics.</p>
        </>
      )}
    </>
  );
}
