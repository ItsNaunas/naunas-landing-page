import { SectionHeader } from '@/components/dashboard/Tabs';

export default function PipelineLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SectionHeader title="Pipeline" tabs={[
        { href: '/dashboard/pipeline', label: 'Deals' },
        { href: '/dashboard/pipeline/calls', label: 'Calls' },
      ]} />
      {children}
    </>
  );
}
