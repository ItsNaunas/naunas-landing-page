import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getProposal, proposalUrl, statusOf, STATUS_LABEL } from '@/lib/proposal';
import { ProposalView } from '@/components/proposal/ProposalView';
import { ProposalEditor } from './ProposalEditor';
import { Badge } from '@/components/dashboard/ui';
import { hubspotUrl } from '@/lib/hubspot';
import { aiReady } from '@/lib/ai';

// Edit, draft with AI, publish and preview one proposal. The (app) layout already requires the session.
export const dynamic = 'force-dynamic';
export const maxDuration = 120; // the AI draft reads the lead's notes and makes one call

export default async function ProposalEditPage({ params, searchParams }: PageProps<'/dashboard/pipeline/proposal/[token]'>) {
  const { token } = await params;
  const { preview } = (await searchParams) as { preview?: string };
  const p = await getProposal(token);
  if (!p) notFound();
  if (preview) return <div className="rounded-2xl overflow-hidden border border-white/[0.07]"><ProposalView p={p} preview /></div>;
  const status = statusOf(p);
  const tone = status === 'paid' ? 'good' : status === 'accepted' ? 'good' : status === 'opened' ? 'accent' : status === 'sent' ? 'neutral' : 'muted';
  return (
    <>
      <Link href={p.contactId ? `/dashboard/leads/${p.contactId}` : '/dashboard/pipeline'} className="text-xs text-white/45 hover:text-white -mb-3">← {p.contactId ? 'Lead' : 'Pipeline'}</Link>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-[28px] font-semibold tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>Proposal · {p.client}</h1>
          <p className="text-sm text-white/50 mt-1 flex flex-wrap items-center gap-2">
            <Badge tone={tone}>{STATUS_LABEL[status]}</Badge>
            {p.opens > 0 && <span>opened {p.opens} time{p.opens === 1 ? '' : 's'}</span>}
            {p.acceptedBy && <span>· signed “{p.acceptedBy}”</span>}
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-xs">
          <Link href={`/dashboard/pipeline/proposal/${p.token}?preview=1`} className="rounded-full border border-white/15 px-3 py-1.5 hover:border-white/30">Preview ↗</Link>
          {p.published && <a href={`/p/${p.token}`} target="_blank" rel="noopener noreferrer" className="rounded-full border border-white/15 px-3 py-1.5 hover:border-white/30">Open live (counts as a view) ↗</a>}
          {p.dealId && <a href={hubspotUrl.deal(p.dealId)} target="_blank" rel="noopener noreferrer" className="text-[#ff8a6d] hover:underline self-center">Deal in HubSpot ↗</a>}
        </div>
      </div>
      <ProposalEditor p={p} url={proposalUrl(p.token)} ai={aiReady()} />
    </>
  );
}
