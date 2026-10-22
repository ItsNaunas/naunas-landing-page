import { outreachData } from '@/lib/ops/more';
import { ActionForm } from '@/components/dashboard/ActionForm';
import { TabIntro, Errors } from '@/components/dashboard/ui';

export const dynamic = 'force-dynamic';

import { warmLeads, dueCheckins, getTouches, getCheckinDrafts, type WarmLead } from '@/lib/checkins';
import { repDay } from '@/lib/reps';
import { TodayList } from '../TodayList';
import { openAsks } from '@/lib/asks';
import { ChannelBoard } from '../ChannelBoard';
import { syncIgPosts, getIgPosts } from '@/lib/igPosts';
import { FUNNEL } from '@/config/funnel';
import { getOwed, needsYou } from '@/lib/owed';
import { demoOn } from '@/lib/ops/demo';
import { addOwedAsset } from '@/app/dashboard/actions';
import { Plan } from '@/app/dashboard/(app)/StartOfDay';
import { triageInbox, openTriaged, type Triaged } from '@/lib/triage';
import { after } from 'next/server';
export default async function OutreachToday() {
  const d = await outreachData();
  const owedAll = demoOn() ? [{ id: 'o1', who: 'Laurence Grant', what: 'Loom teardown', channel: 'LinkedIn', owedAt: new Date(Date.now() - 18 * 3_600_000).toISOString() }] : await getOwed().catch(() => []);
  const owed = needsYou(owedAll);
  const warmOn = FUNNEL.outreach.warmCheckins;
  // Latest Instagram posts + comment ideas for today's warm-ups (fetched through Apify in the background).
  if (!demoOn()) await syncIgPosts(d.ig.warm.map((p: { instagram?: string }) => p.instagram ?? '').filter(Boolean)).catch((err) => console.error('[outreach] ig posts', err));
  const igPosts = demoOn() ? {} : await getIgPosts().catch(() => ({}));
  const [leads, touches, drafts] = !warmOn ? [[] as WarmLead[], {}, {}] : demoOn() ? [[{ id: '1', name: 'Josh Yarwood', status: 'interested', source: 'instagram_dm', instagram: 'josh.yarw', channel: 'Instagram', href: 'https://ig.me/m/josh.yarw' }, { id: '2', name: 'Laurence Grant', status: 'interested', source: 'linkedin', channel: 'LinkedIn', href: 'https://www.linkedin.com/in/laurencegrant/' }] as WarmLead[], {}, { '1': { text: 'Hey Josh, it’s been a while since our call in April. How did things settle on your side, and is anything still slipping between enquiry and booking?', at: '' } }] : await Promise.all([
    warmLeads().catch(() => [] as WarmLead[]), getTouches().catch(() => ({})), getCheckinDrafts().catch(() => ({})),
  ]);
  const checkins = dueCheckins(leads, touches);
  const asks = demoOn() ? [] : await openAsks().catch(() => []);
  // Reply triage (was the routine's job 1): new mail from known people, with a drafted answer. Runs in the background, every 15 min at most.
  if (!demoOn()) after(() => triageInbox().then(() => undefined).catch((err) => console.error('[triage]', err)));
  const triaged = demoOn() ? [] as Triaged[] : await openTriaged().catch(() => [] as Triaged[]);
  const replies = triaged.length ? triaged.map((t) => ({ messageId: t.messageId, who: t.who, href: t.contactId ? `/dashboard/leads/${t.contactId}` : t.firmId ? `/dashboard/outreach/firm/${encodeURIComponent(t.firmId)}` : '/dashboard/outreach', subject: t.summary, text: t.text, date: t.at, draft: t.draft, needsYou: t.needsYou, kind: t.kind }))
    : d.replies;
  const today = repDay();
  const isToday = (t?: string) => !!t && repDay(t) === today;
  const everyone = Object.values(d.queue).flat();
  const emailWaiting = d.queue.scheduled.filter((p: { channel?: string; email?: string }) => (!p.channel || p.channel === 'email') && p.email).length;
  const doneToday = owedAll.filter((o) => isToday(o.sentAt) || isToday(o.closedAt)).length
    + Object.values(touches).filter((t) => t.outcome !== 'dropped' && isToday(t.at)).length
    + everyone.reduce((n, p) => n + [p.warmedAt, p.dmSentAt, p.fu1At, p.fu2At, p.igRepliedAt].filter(isToday).length, 0);

  return (
    <>
      <TabIntro sub="Work the list top to bottom: who to contact, what to do, the message to send. Tick each one off." />
      <Errors errors={d.errors} />
      {emailWaiting > 0 && (!d.settings.sending || !d.connected.inbox) && (
        <div className="rounded-xl border border-amber-400/25 bg-amber-400/[0.06] px-4 py-3 text-sm text-amber-100/90">
          {emailWaiting} firm{emailWaiting > 1 ? 's are' : ' is'} waiting for their first email, but {!d.connected.inbox ? 'the ZOHO_SMTP_* keys aren’t set (replies can’t be read, so cold email is blocked)' : 'Sending is OFF'}. {!d.connected.inbox ? 'Add them in Vercel, then check System → Health.' : 'Fix it in ⚙ Settings above.'}
        </div>
      )}
      <Plan />
      <ChannelBoard channels={d.channels} />

      <TodayList owed={owed} replies={replies} checkins={checkins} drafts={drafts} ig={d.ig} posts={igPosts} doneToday={doneToday} asks={asks} />

      <details className="rounded-2xl border border-white/[0.07] bg-[#121212]">
        <summary className="cursor-pointer px-5 py-3 text-sm">+ Someone said yes to a Loom or PDF</summary>
        <ActionForm action={addOwedAsset} className="px-5 py-3.5 flex flex-wrap items-end gap-2 ">
          <label className="flex flex-col gap-1 text-[11px] text-white/60 flex-1 min-w-[160px]">Who said yes
            <input name="who" required placeholder="Name · firm" className="rounded-lg bg-white/[0.05] border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/50" />
          </label>
          <label className="flex flex-col gap-1 text-[11px] text-white/60">What you promised
            <select name="what" className="rounded-lg bg-white/[0.05] border border-white/10 px-3 py-2 text-sm text-white">
              {['Loom teardown', 'PDF', 'Leak Map', 'Voice note', 'Proposal'].map((w) => <option key={w}>{w}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[11px] text-white/60">Where
            <select name="channel" className="rounded-lg bg-white/[0.05] border border-white/10 px-3 py-2 text-sm text-white">
              {['LinkedIn', 'Instagram', 'Email'].map((w) => <option key={w}>{w}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[11px] text-white/60 flex-1 min-w-[160px]">Link to the chat (optional)
            <input name="link" type="url" placeholder="https://" className="rounded-lg bg-white/[0.05] border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/50" />
          </label>
          <button className="rounded-lg bg-white text-black text-sm font-medium px-4 py-2">Add</button>
        </ActionForm>
        <p className="px-5 pb-3 text-[11px] text-white/55">It goes to the top of the list with a 24-hour clock. Overdue ones go to Overview and the morning brief; a nudge comes back 5 days after you send it.</p>
      </details>

    </>
  );
}
