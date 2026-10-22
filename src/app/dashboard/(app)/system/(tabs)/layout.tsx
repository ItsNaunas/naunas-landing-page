import { SectionHeader } from '@/components/dashboard/Tabs';
import { FUNNEL } from '@/config/funnel';
import { linkProps } from '@/components/dashboard/ui';

export default function SystemLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SectionHeader title="System"
        action={<a href={FUNNEL.logsUrl} {...linkProps} className="text-sm rounded-full border border-white/10 px-4 py-2 text-white/70 hover:text-white hover:border-white/25">Vercel logs ↗</a>}
        tabs={[
          { href: '/dashboard/system', label: 'Health & connections' },
          { href: '/dashboard/system/automations', label: 'Activity' },
        ]} />
      {children}
    </>
  );
}
