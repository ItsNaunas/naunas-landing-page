import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { after } from 'next/server';
import { getReport, recordReportOpen } from '@/lib/leakReport';
import { ReportView } from '@/components/report/ReportView';

// A firm's leak report (lib/leakReport). Only reachable by its unguessable link, never indexed, and 404 until
// Naufal publishes it. Drafts are previewed inside the dashboard (/dashboard/outreach/report/<token>).
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Leak report | Naunas', robots: { index: false, follow: false } };

export default async function ReportPage({ params }: PageProps<'/r/[token]'>) {
  const r = await getReport((await params).token);
  if (!r?.published) notFound();
  const { token } = await params;
  after(() => recordReportOpen(token).catch(() => undefined));
  return <ReportView r={r} />;
}
