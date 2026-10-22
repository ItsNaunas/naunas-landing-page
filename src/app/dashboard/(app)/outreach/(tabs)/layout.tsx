import { SectionHeader } from '@/components/dashboard/Tabs';
import { OutreachSettings } from '../OutreachSettings';

// Today's contact list lives on /dashboard (Today) now; /dashboard/outreach redirects there.
export default function OutreachLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SectionHeader title="Outreach"
        action={<OutreachSettings />}
        tabs={[
          { href: '/dashboard/outreach/prospects', label: 'Prospects' },
          { href: '/dashboard/outreach/sequences', label: 'Sequences' },
          { href: '/dashboard/outreach/results', label: 'Results' },
        ]} />
      {children}
    </>
  );
}
