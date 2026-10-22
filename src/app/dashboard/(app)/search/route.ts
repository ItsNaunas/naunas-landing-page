import { NextResponse, type NextRequest } from 'next/server';
import { DASH_COOKIE, validSession } from '@/lib/dashAuth';
import { leadsData } from '@/lib/ops/tabs';
import { getProspects, type Prospect } from '@/lib/outreach';
import { getIndex, type IndexRow } from '@/lib/content';
import { listProposals, type ProposalRow } from '@/lib/proposal';

// Ctrl+K search: people (HubSpot), firms (outreach list), posts and proposals, a few of each. Read-only.
export type Hit = { kind: 'Person' | 'Firm' | 'Post' | 'Proposal'; title: string; sub?: string; href: string };

const has = (q: string, ...v: (string | undefined)[]) => v.some((s) => s?.toLowerCase().includes(q));

export async function GET(req: NextRequest) {
  if (!(await validSession(req.cookies.get(DASH_COOKIE)?.value))) return NextResponse.json({ error: 'Signed out' }, { status: 401 });
  const q = (req.nextUrl.searchParams.get('q') ?? '').trim().toLowerCase();
  if (q.length < 2) return NextResponse.json({ hits: [] });
  const [people, firms, posts, proposals] = await Promise.all([
    leadsData({ q, range: 0 }).then((d) => d.rows).catch(() => []),
    getProspects().catch(() => [] as Prospect[]),
    getIndex().catch(() => [] as IndexRow[]),
    listProposals().catch(() => [] as ProposalRow[]),
  ]);
  const hits: Hit[] = [
    ...people.slice(0, 6).map((p: { id: string; name: string; email?: string; business?: string }) => ({ kind: 'Person' as const, title: p.name, sub: [p.business, p.email].filter(Boolean).join(' · '), href: `/dashboard/leads/${p.id}` })),
    ...firms.filter((f) => has(q, f.firm, f.instagram, f.email, f.domain, f.city)).slice(0, 6)
      .map((f) => ({ kind: 'Firm' as const, title: f.firm, sub: [f.city, f.instagram && `@${f.instagram}`, f.status].filter(Boolean).join(' · '), href: `/dashboard/outreach/firm/${encodeURIComponent(f.id)}` })),
    ...posts.filter((p) => has(q, p.idea)).slice(0, 5).map((p) => ({ kind: 'Post' as const, title: p.idea || 'Untitled post', sub: p.status, href: `/dashboard/content/${p.id}` })),
    ...proposals.filter((p) => has(q, p.client, p.title)).slice(0, 5).map((p) => ({ kind: 'Proposal' as const, title: p.client, sub: `${p.title} · ${p.status}`, href: `/dashboard/pipeline/proposal/${p.token}` })),
  ];
  return NextResponse.json({ hits });
}
