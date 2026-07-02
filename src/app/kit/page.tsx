import type { Metadata } from 'next';
import { KitShowcase } from '@/components/sections/KitShowcase';

export const metadata: Metadata = {
  title: 'The Kit | Naunas',
  description:
    'The prompts, guides and systems I use to take AI-built apps from "works on my machine" to production. Start free.',
};

export default function KitPage() {
  return <KitShowcase />;
}
