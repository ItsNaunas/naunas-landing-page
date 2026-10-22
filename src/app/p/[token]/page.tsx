import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { after } from 'next/server';
import { getProposal, recordOpen } from '@/lib/proposal';
import { ProposalView } from '@/components/proposal/ProposalView';

// A client's proposal (lib/proposal). Unguessable link, never indexed, 404 until published. Each visit is
// counted after the response (first one pings Telegram); Naufal previews drafts inside the dashboard.
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Proposal | Naunas', robots: { index: false, follow: false } };

export default async function ProposalPage({ params }: PageProps<'/p/[token]'>) {
  const { token } = await params;
  const p = await getProposal(token);
  if (!p?.published) notFound();
  after(() => recordOpen(token).catch(() => undefined));
  return <ProposalView p={p} />;
}
