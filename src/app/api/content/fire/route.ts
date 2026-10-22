import { NextResponse } from 'next/server';
import { verifyQStash } from '@/lib/qstash';
import { runPost } from '@/lib/publish';
import { alertError, notify } from '@/lib/alert';
import { putJSON } from '@/lib/store';
import { FUNNEL } from '@/config/funnel';
import { researchProspect } from '@/lib/research';

// QStash calls this at the minute Naufal scheduled. Only signed QStash requests get through, and a post that
// was cancelled, rescheduled or already published is skipped (runPost checks it's still "scheduled").
export const maxDuration = 300;

export async function POST(req: Request) {
  const body = await req.text();
  if (!verifyQStash(req.headers.get('upstash-signature'), body)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  let postId = '';
  let ping = '';
  let remind = '';
  let owed = '';
  let nudge = '';
  let research = '';
  let job = '';
  try { ({ postId = '', ping = '', remind = '', owed = '', nudge = '', research = '', job = '' } = JSON.parse(body) as Record<string, string>); } catch { /* handled below */ }

  // One of the 09:00 jobs (lib/dailyJobs), queued by the health cron.
  if (job) {
    const { runJob } = await import('@/lib/dailyJobs');
    return NextResponse.json({ ok: true, job, result: await runJob(job) });
  }

  // Prospect research, queued from Prospects (Approve / Research now), one firm per call.
  if (research) {
    const r = await researchProspect(research);
    return NextResponse.json({ ok: true, research, result: r });
  }

  // Older QStash reminders (owed / nudge / remind) are no longer scheduled: overdue promises show on Overview and in
  // the morning brief instead. Any still queued from before just return ok.
  if (owed || nudge || remind) return NextResponse.json({ ok: true });

  // "Test scheduling" from the dashboard: proves QStash → signature → this route works, and posts nothing.
  if (ping) {
    await putJSON('meta/qstash-ping.json', { ping, firedAt: new Date().toISOString() });
    await notify({ level: 'ok', title: 'Scheduling works', lines: ['QStash called the site on time and the signature checked out. Scheduled posts will go out.'] });
    return NextResponse.json({ ok: true, ping });
  }
  if (!/^p\d{8}-[a-z0-9]{4}$/.test(postId)) return NextResponse.json({ error: 'bad post id' }, { status: 400 });
  try {
    const r = await runPost(postId, { expectScheduled: true });
    return NextResponse.json({ ok: true, skipped: r.skipped, status: r.post.status });
  } catch (err) {
    await alertError('Scheduled post', err, 'This scheduled post did not go out. Open it in the dashboard and press Publish.');
    return NextResponse.json({ ok: false }, { status: 200 }); // 200: QStash retries are off; the alert is the follow-up.
  }
}
