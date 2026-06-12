import type { Metadata } from 'next';
import { NewsletterSignup } from '@/components/sections/NewsletterSignup';

export const metadata: Metadata = {
  title: 'The Naunas Newsletter',
  description:
    'Every system Naufal builds plus the resources from his videos, in your inbox once a week. Free.',
};

export default function NewsletterPage() {
  return <NewsletterSignup />;
}
