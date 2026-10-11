import type { Metadata } from 'next';
import { LinksHub } from '@/components/sections/LinksHub';

export const metadata: Metadata = {
  title: { absolute: 'Naunas | Links' },
  description: 'The free audit, the Leak Map, recent client work and where to follow Naunas.',
};

export default function LinksPage() {
  return <LinksHub />;
}
