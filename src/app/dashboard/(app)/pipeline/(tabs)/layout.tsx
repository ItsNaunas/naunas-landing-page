import { SectionHeader } from '@/components/dashboard/Tabs';
import { connected } from '@/lib/ops/common';

export default function PipelineLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SectionHeader title="Pipeline" tabs={[
        { href: '/dashboard/pipeline', label: 'Deals' },
        // Needs CAL_API_KEY; until then the tab is a setup card (still at /dashboard/pipeline/calls and under Connections).
        ...(connected.cal() ? [{ href: '/dashboard/pipeline/calls', label: 'Calls' }] : []),
      ]} />
      {children}
    </>
  );
}
