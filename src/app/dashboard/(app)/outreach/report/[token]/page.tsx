import { notFound } from 'next/navigation';
import { getReport } from '@/lib/leakReport';
import { ReportView } from '@/components/report/ReportView';

// Dashboard preview of a leak report (drafts included): the (app) layout already requires the session.
export const dynamic = 'force-dynamic';

export default async function ReportPreview({ params }: PageProps<'/dashboard/outreach/report/[token]'>) {
  const r = await getReport((await params).token);
  if (!r) notFound();
  return <div className="rounded-2xl overflow-hidden border border-white/[0.07]"><ReportView r={r} preview={!r.published} /></div>;
}
