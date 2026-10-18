import { NextResponse } from 'next/server';
import { verifyQStash } from '@/lib/qstash';
import { runPost } from '@/lib/publish';
import { alertError, notify } from '@/lib/alert';
import { putJSON } from '@/lib/store';
import { getPost, CHANNELS, CHANNEL_LABEL } from '@/lib/content';
import { FUNNEL } from '@/config/funnel';
import { getOwed, NUDGE_D } from '@/lib/owed';

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
  try { ({ postId = '', ping = '', remind = '', owed = '', nudge = '' } = JSON.parse(body) as Record<string, string>); } catch { /* handled below */ }

  // Asset owed: 20h after a yes, if the Loom/PDF still isn't marked sent; 5 days after sending, if still open.
  if (owed || nudge) {
    const o = (await getOwed()).find((x) => x.id === (owed || nudge));
    const due = o && !o.closedAt && (owed ? !o.sentAt : !!o.sentAt);
    if (o && due) {
      await notify({
        level: owed ? 'error' : 'ok',
        title: owed ? `You owe ${o.who} a ${o.what}` : `Nudge ${o.who}`,
        lines: [owed ? `They said yes ${Math.round((Date.now() - Date.parse(o.owedAt)) / 3_600_000)} hours ago (${o.channel}). Send it today, with one real finding about them.` : `You sent the ${o.what} ${NUDGE_D} days ago and they went quiet. One short nudge, then let it go.`],
        buttons: [...(o.link ? [{ text: 'Open the conversation', url: o.link }] : []), { text: 'Outreach', url: `${FUNNEL.site}/dashboard/outreach` }],
      });
    }
    return NextResponse.json({ ok: true });
  }

  // Reply reminder, booked by runPost a set time after a post goes live.
  if (remind) {
    const p = /^p\d{8}-[a-z0-9]{4}$/.test(remind) ? await getPost(remind) : null;
    const links = p ? CHANNELS.filter((c) => c !== 'tiktok' && p.channels[c].status === 'posted' && p.channels[c].url).map((c) => ({ text: `Comments on ${CHANNEL_LABEL[c]}`, url: p.channels[c].url! })) : [];
    if (p && links.length) {
      await notify({ level: 'ok', title: 'Time to reply to comments', lines: [`Your post went out ${FUNNEL.content.replyReminderMin} minutes ago. Answer every comment now, while it is still being shown to people.`], quote: p.master.idea.slice(0, 160) || undefined, buttons: links });
    }
    return NextResponse.json({ ok: true, remind });
  }

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
