import { NextResponse } from 'next/server';
import { verifyQStash } from '@/lib/qstash';
import { runPost } from '@/lib/publish';
import { alertError, notify } from '@/lib/alert';
import { putJSON } from '@/lib/store';

// QStash calls this at the minute Naufal scheduled. Only signed QStash requests get through, and a post that
// was cancelled, rescheduled or already published is skipped (runPost checks it's still "scheduled").
export const maxDuration = 300;

export async function POST(req: Request) {
  const body = await req.text();
  if (!verifyQStash(req.headers.get('upstash-signature'), body)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  let postId = '';
  let ping = '';
  try { ({ postId = '', ping = '' } = JSON.parse(body) as { postId?: string; ping?: string }); } catch { /* handled below */ }

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
