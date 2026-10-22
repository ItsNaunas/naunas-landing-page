import Link from 'next/link';
import { integrations } from '@/lib/ops/tabs';
import { demoOn } from '@/lib/ops/demo';
import { tiktokConfigured, tiktokConnected } from '@/lib/tiktok';
import { linkedinConfigured, linkedinAccount } from '@/lib/linkedin';
import { tiktokApproved } from '@/lib/publish';
import { TabIntro, Card, Badge } from '@/components/dashboard/ui';
import { SectionTitle } from '@/components/dashboard/kit';

export const dynamic = 'force-dynamic';

type Acct = { name: string; href: string; state: string; tone: 'good' | 'bad' | 'accent' | 'muted'; note: string };

export default async function Connections() {
  const demo = demoOn();
  const [tt, li] = await Promise.all([
    demo ? Promise.resolve(true) : tiktokConfigured() ? tiktokConnected().catch(() => false) : Promise.resolve(false),
    demo ? Promise.resolve({ daysLeft: 41, expired: false, name: 'Naufal Nassor' }) : linkedinConfigured() ? linkedinAccount().catch(() => null) : Promise.resolve(null),
  ]);
  const accounts: Acct[] = [
    {
      name: 'LinkedIn', href: '/dashboard/linkedin',
      state: !li ? 'Not connected' : li.expired ? 'Expired' : `${li.daysLeft} days left`,
      tone: !li || li.expired ? 'bad' : li.daysLeft <= 7 ? 'accent' : 'good',
      note: 'LinkedIn makes you reconnect every 60 days. The health check warns a week before.',
    },
    {
      name: 'TikTok', href: '/dashboard/tiktok',
      state: !tt ? 'Not connected' : tiktokApproved() ? 'Connected · public posting' : 'Connected · posts held',
      tone: !tt ? 'bad' : tiktokApproved() ? 'good' : 'accent',
      note: 'Until TikTok approves the app, TikTok posts wait in Content → Plan and the other channels still go out.',
    },
    {
      name: 'Instagram', href: '/dashboard/system',
      state: demo || process.env.IG_ACCESS_TOKEN ? 'Token set' : 'Not connected',
      tone: demo || process.env.IG_ACCESS_TOKEN ? 'good' : 'bad',
      note: 'Publishing permission shows as “Instagram publishing” under Health. New token: Meta app → Instagram → API setup.',
    },
  ];

  return (
    <>
      <TabIntro sub="Your accounts and keys in one place. Reconnect here when something expires." />
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">
        {accounts.map((a) => (
          <Link key={a.name} href={a.href} className="group">
            <Card>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">{a.name}</p>
                <Badge tone={a.tone}>{a.state}</Badge>
              </div>
              <p className="text-xs text-white/60 mt-2">{a.note}</p>
              <p className="text-xs text-[#ff8a6d] mt-3 group-hover:underline">{a.name === 'Instagram' ? 'See the checks →' : 'Manage connection →'}</p>
            </Card>
          </Link>
        ))}
      </div>

      <SectionTitle>All tools</SectionTitle>
      <Card pad={false}>
        <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <tbody>
            {integrations().map((i) => (
              <tr key={i.name} className="border-t border-white/[0.04] first:border-t-0">
                <td className="px-5 py-3 font-medium whitespace-nowrap">{i.name}</td>
                <td className="px-3 py-3 text-white/65 min-w-[160px]">{i.role}</td>
                <td className="px-3 py-3 hidden md:table-cell"><code className="text-[11px] text-white/60">{i.env}</code></td>
                <td className="px-5 py-3 text-right"><Badge tone={i.ok ? 'good' : 'muted'}>{i.ok ? 'Connected' : 'Not connected'}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </Card>
      <p className="text-xs text-white/55 -mt-2">Setup steps for anything not connected are in docs/client-system/RUNBOOK.md. Keys live in Vercel and Bitwarden.</p>
    </>
  );
}
