import { SectionHeader } from '@/components/dashboard/Tabs';
import { newContentPost } from '@/app/dashboard/actions';
import { attention } from '@/lib/ops/attention';

export default async function ContentLayout({ children }: { children: React.ReactNode }) {
  const a = await attention();
  return (
    <>
      <SectionHeader title="Content"
        action={<form action={newContentPost}><button className="rounded-lg bg-[#F2613F] px-4 py-2 text-sm font-medium text-white hover:bg-[#ff7553]">+ New post</button></form>}
        tabs={[
          { href: '/dashboard/content', label: 'Plan', badge: a.content },
          { href: '/dashboard/content/performance', label: 'Performance' },
          { href: '/dashboard/content/newsletter', label: 'Newsletter' },
          { href: '/dashboard/content/keywords', label: 'Keyword DMs' },
        ]} />
      {children}
    </>
  );
}
