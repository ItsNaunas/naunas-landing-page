import { listProposals, STATUS_LABEL, type ProposalRow, type ProposalStatus } from '@/lib/proposal';
import { demoOn } from '@/lib/ops/demo';
import { newProposal } from '@/app/dashboard/actions';
import { TabIntro, Badge, Card, Empty, ago, type Tone } from '@/components/dashboard/ui';
import { SectionTitle } from '@/components/dashboard/kit';

export const dynamic = 'force-dynamic';

const TONE: Record<ProposalStatus, Tone> = { draft: 'muted', sent: 'neutral', opened: 'info', accepted: 'good', paid: 'good' };
const DAY = 86_400_000;

/** What to do next with a proposal, from its status and when it last changed. */
function nextStep(r: ProposalRow): string | null {
  const days = Math.floor((Date.now() - Date.parse(r.updatedAt)) / DAY);
  if (r.status === 'draft') return 'Finish and publish';
  if (r.status === 'sent' && days >= 3) return `Not opened in ${days} days: check they got it`;
  if (r.status === 'opened' && days >= 2) return `Opened ${days} days ago: follow up`;
  if (r.status === 'accepted') return 'Waiting for the deposit';
  return null;
}

export default async function Proposals() {
  const proposals = demoOn() ? [] : await listProposals().catch(() => [] as ProposalRow[]);
  const open = proposals.filter((p) => p.status !== 'paid');
  const done = proposals.filter((p) => p.status === 'paid');
  const row = (r: ProposalRow) => {
    const next = nextStep(r);
    return (
      <li key={r.token}><a href={`/dashboard/pipeline/proposal/${r.token}`} className="px-5 py-3 flex items-center gap-3 hover:bg-white/[0.02]">
        <span className="min-w-0 flex-1">
          <span className="block text-sm text-white/90 truncate">{r.client}</span>
          <span className="block text-xs text-white/60 truncate">{r.title}</span>
        </span>
        {next && <span className={`hidden sm:block text-xs ${/follow up|check/.test(next) ? 'text-amber-200' : 'text-white/60'}`}>{next}</span>}
        <span className="w-16 text-right text-xs text-white/60 tabular-nums">{ago(r.updatedAt)}</span>
        <span className="w-[92px] text-right"><Badge tone={TONE[r.status]}>{STATUS_LABEL[r.status]}</Badge></span>
      </a></li>
    );
  };

  return (
    <>
      <TabIntro sub="Scope, price, accept by name and the Stripe deposit, in one link. Start one from a lead page to pull in their brief and call notes." />
      <Card pad={false}>
        <form id="new-proposal" action={newProposal} className="px-5 py-4 flex flex-wrap items-end gap-2 scroll-mt-24">
          <label className="flex flex-col gap-1 text-[11px] text-white/60 flex-1 min-w-[160px]">Client or firm<input name="client" required placeholder="e.g. Oakline Interiors" className="rounded-lg bg-white/[0.05] border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/50" /></label>
          <label className="flex flex-col gap-1 text-[11px] text-white/60 flex-1 min-w-[160px]">Their email (for the deposit link)<input name="email" type="email" placeholder="optional" className="rounded-lg bg-white/[0.05] border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/50" /></label>
          <button className="rounded-lg bg-[#F2613F] hover:bg-[#ff7553] text-[#0C0C0C] text-sm font-medium px-4 py-2">New proposal</button>
        </form>
      </Card>

      <SectionTitle>Open · {open.length}</SectionTitle>
      <Card pad={false}>
        {open.length ? <ul className="divide-y divide-white/[0.05]">{open.map(row)}</ul>
          : <Empty>No proposals yet. Start one above, or from a lead page.</Empty>}
      </Card>
      {done.length > 0 && (
        <>
          <SectionTitle>Deposit paid · {done.length}</SectionTitle>
          <Card pad={false}><ul className="divide-y divide-white/[0.05]">{done.map(row)}</ul></Card>
        </>
      )}
    </>
  );
}
