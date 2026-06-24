import type { Metadata } from 'next';
import { ManagedWaitlist } from '@/components/sections/ManagedWaitlist';

export const metadata: Metadata = {
  title: 'Managed | The AI talent manager for creators',
  description:
    'Managed triages your brand deals, drafts the replies and gets you paid, without the 20% manager cut. Join the waitlist.',
};

export default function ManagedPage() {
  return <ManagedWaitlist />;
}
