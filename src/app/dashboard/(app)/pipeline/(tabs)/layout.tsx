import { SectionHeader } from '@/components/dashboard/Tabs';

// Calls is always a tab: without CAL_API_KEY it shows how to connect Cal.com instead of disappearing.
export default function PipelineLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SectionHeader title="Pipeline" tabs={[
        { href: '/dashboard/pipeline', label: 'Deals' },
        { href: '/dashboard/pipeline/proposals', label: 'Proposals' },
        { href: '/dashboard/pipeline/calls', label: 'Calls' },
      ]} />
      {children}
    </>
  );
}
