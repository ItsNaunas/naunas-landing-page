import type { Metadata } from 'next';
import { LinksHub } from '@/components/sections/LinksHub';

export const metadata: Metadata = {
  title: { absolute: 'Naunas | Links' },
  description:
    'Everything Naunas in one place: the free business audit, the weekly systems newsletter, and where to follow the builds.',
};

export default function LinksPage() {
  return <LinksHub />;
}
