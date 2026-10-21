import { NextRequest, NextResponse } from 'next/server';
import { runOutreach, syncSearches } from '@/lib/outreach';
import { alertError } from '@/lib/alert';
import { syncProspect } from '@/lib/crmSync';

// Daily outreach cron (vercel.json, 14:00 UTC = US morning): import finished prospect searches, pull in
// the routine's drafts, stop sequences that got replies, then send what's due within the caps.
// Vercel cron calls it with `Authorization: Bearer $CRON_SECRET`. ?dry=1 reports without sending.
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    await syncSearches().catch(() => {});
    const result = await runOutreach({ dryRun: req.nextUrl.searchParams.get('dry') === '1' });
    // Email replies get the same HubSpot treatment as Instagram/LinkedIn: deal at Contacted + research note.
    for (const id of result.repliedIds) await syncProspect(id, { status: 'replied' }).catch((err) => alertError('Outreach: HubSpot sync', err, `An email reply (firm ${id}) isn't in HubSpot as a deal.`));
    if (result.errors.length) await alertError('Outreach: daily send', new Error(result.errors.join(' · ')), 'Some outreach emails may not have gone out today.');
    return NextResponse.json(result);
  } catch (err) {
    await alertError('Outreach: daily send', err, 'No outreach emails went out today.');
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}
