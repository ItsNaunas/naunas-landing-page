import { Badge, Card, Empty, ago, linkProps } from '@/components/dashboard/ui';
import { ActionForm } from '@/components/dashboard/ActionForm';
import { Meter } from '@/components/dashboard/kit';
import { lintMessage } from '@/lib/dmLint';
import { dueAt, type Owed } from '@/lib/owed';
import type { Prospect } from '@/lib/outreach';
import type { WarmLead } from '@/lib/checkins';
import type { IgPost } from '@/lib/igPosts';
import { markOwedSent, closeOwed, markIgFollowup, markIgReplied, markDmSent, markWarmed, markCheckin, markLiStep } from '@/app/dashboard/actions';
import { CopyText } from './OutreachClient';
import { CheckinMessage } from './CheckinMessage';
import { FocusShell, OpenCopy } from './FocusShell';

// One ranked list for the day, built from both playbooks: who to contact, what to do, the message to send,
// and a tick. Order = money first: promises you made, people who replied, warm leads going cold, then the
// Instagram sequence (follow-ups before new openers before warm-ups). Every button only records what YOU did.

type Reply = { messageId?: string; uid?: number | string; who: string; href: string; subject: string; text: string; date: string };
type Props = {
  owed: { toSend: Owed[]; toNudge: Owed[] };
  replies: Reply[];
  checkins: WarmLead[]; drafts: Record<string, { text: string }>;
  ig: { warm: Prospect[]; openers: Prospect[]; followups: { p: Prospect; n: 1 | 2 }[]; linkedin: { p: Prospect; step: 'engage' | 'connect' | 'dm' | 'fu' }[] };
  posts: Record<string, { items: IgPost[] }>;
  doneToday: number;
};

const CH: Record<string, string> = { Instagram: 'IG', LinkedIn: 'LI', Email: 'Email' };
const btn = 'rounded-full bg-white text-black text-xs font-medium px-3 py-1.5';
const quiet = 'text-xs text-white/45 hover:text-white';

function Row({ itemId, who, channel, task, href, hrefLabel = 'Open chat', copy, firmId, children }: { itemId: string; who: string; channel: string; task: string; href?: string; hrefLabel?: string; copy?: string; firmId?: string; children?: React.ReactNode }) {
  return (
    <li data-item={itemId} className="px-5 py-3.5 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13.5px]"><b className="font-medium">{who}</b> <Badge tone="muted">{CH[channel] ?? channel}</Badge>{firmId && <a href={`/dashboard/outreach/firm/${encodeURIComponent(firmId)}`} className="ml-2 text-[11px] text-white/40 hover:text-white">firm ›</a>}</p>
          <p className="text-[12.5px] text-white/55 mt-0.5">{task}</p>
        </div>
        {href && (copy ? <OpenCopy href={href} text={copy} label={`${hrefLabel} & copy`} /> : <a href={href} {...linkProps} className="shrink-0 text-xs text-[#ff8a6d] hover:underline">{hrefLabel} ↗</a>)}
      </div>
      {children}
    </li>
  );
}

function Group({ n, title, count, children }: { n: number; title: string; count: number; children: React.ReactNode }) {
  if (!count) return null;
  return (
    <div data-group>
      <p className="px-5 pt-4 pb-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-white/40">{title} <span className="text-white/25">({count})</span></p>
      <ul className="divide-y divide-white/[0.05]">{children}</ul>
    </div>
  );
}

const Msg = ({ text }: { text: string }) => <p className="text-[13px] text-white/80 rounded-lg bg-white/[0.03] border border-white/[0.06] p-2.5">{text}</p>;
const checkBackMonth = () => new Date(Date.now() + 60 * 86_400_000).toLocaleDateString('en-GB', { month: 'long' });
const igChat = (h?: string) => (h ? `https://ig.me/m/${h}` : undefined);
const igProfile = (h?: string) => (h ? `https://instagram.com/${h}` : undefined);

export function TodayList({ owed, replies, checkins, drafts, ig, posts, doneToday }: Props) {
  const left = owed.toSend.length + replies.length + owed.toNudge.length + checkins.length + ig.followups.length + ig.linkedin.length + ig.openers.length + ig.warm.length;
  const total = left + doneToday;
  return (
    <Card pad={false}>
      <div className="px-5 pt-4 pb-3 flex flex-wrap items-center gap-3 border-b border-white/[0.06]">
        <p className="font-medium">Today’s list</p>
        <span className="text-sm text-white/50 tabular-nums">{doneToday} done · {left} to go</span>
        <div className="w-40 ml-auto"><Meter value={doneToday} max={Math.max(1, total)} /></div>
      </div>
      {!left ? <Empty>{doneToday ? 'All done for today. Nice.' : 'Nothing queued. Approve firms on the Prospects tab and the Instagram sequence fills up from tomorrow.'}</Empty> : (
        <div className="pb-2 px-5 pt-3"><FocusShell><div className="-mx-5">
          <Group n={1} title="You promised something" count={owed.toSend.length}>
            {owed.toSend.map((o) => {
              const late = dueAt(o) < Date.now();
              return (
                <Row key={o.id} itemId={String(o.id)} who={o.who} channel={o.channel} href={o.link} task={`Send the ${o.what} you promised${late ? ' (late)' : ''}. Include one real finding about them.`}>
                  <div className="flex gap-3 items-center">
                    <ActionForm action={markOwedSent}><input type="hidden" name="id" value={o.id} /><button className={btn}>Sent it</button></ActionForm>
                    <ActionForm action={closeOwed}><input type="hidden" name="id" value={o.id} /><input type="hidden" name="outcome" value="dropped" /><button className={quiet}>Drop</button></ActionForm>
                  </div>
                </Row>
              );
            })}
          </Group>

          <Group n={2} title="They replied" count={replies.length}>
            {replies.map((m) => (
              <Row key={m.messageId || String(m.uid)} itemId={String(m.messageId || String(m.uid))} who={m.who} channel="Email" href={m.href} hrefLabel="Open lead (draft reply there)" task={`Replied ${ago(m.date)}: ${m.subject}`}>
                <p className="text-[12.5px] text-white/65 line-clamp-2">“{m.text}”</p>
              </Row>
            ))}
          </Group>

          <Group n={3} title="Nudge after you sent something" count={owed.toNudge.length}>
            {owed.toNudge.map((o) => {
              const text = `Did the ${o.what.toLowerCase()} make sense? Happy to walk you through it in 15 minutes this week if useful.`;
              return (
                <Row key={o.id} itemId={String(o.id)} who={o.who} channel={o.channel} href={o.link} copy={text} task={`Quiet since you sent the ${o.what}. One nudge, then let it go.`}>
                  <Msg text={text} />
                  <div className="flex flex-wrap gap-3 items-center">
                    <CopyText text={text} label="Copy message" />
                    <ActionForm action={closeOwed}><input type="hidden" name="id" value={o.id} /><input type="hidden" name="outcome" value="nudged" /><button className={btn}>Nudged</button></ActionForm>
                    <ActionForm action={closeOwed}><input type="hidden" name="id" value={o.id} /><input type="hidden" name="outcome" value="replied" /><button className={quiet}>They replied</button></ActionForm>
                  </div>
                </Row>
              );
            })}
          </Group>

          <Group n={4} title="Warm leads going cold" count={checkins.length}>
            {checkins.map((l) => (
              <Row key={l.id} itemId={String(l.id)} who={`${l.name}${l.company ? ` · ${l.company}` : ''}`} channel={l.channel} href={l.href}
                task={`${l.status === 'interested' ? 'Was interested' : 'Replied before'}, then went quiet. Re-open the conversation.`}>
                <CheckinMessage lead={{ id: l.id, name: l.name, company: l.company, channel: l.channel }} initial={drafts[l.id]?.text} />
                <div className="flex gap-3 items-center">
                  <ActionForm action={markCheckin}><input type="hidden" name="id" value={l.id} /><input type="hidden" name="channel" value={l.channel} /><input type="hidden" name="outcome" value="sent" /><button className={btn}>Sent</button></ActionForm>
                  <ActionForm action={markCheckin}><input type="hidden" name="id" value={l.id} /><input type="hidden" name="outcome" value="snoozed" /><button className={quiet}>Not now (30 days)</button></ActionForm>
                  <ActionForm action={markCheckin}><input type="hidden" name="id" value={l.id} /><input type="hidden" name="outcome" value="dropped" /><button className="text-xs text-white/30 hover:text-rose-300">Drop</button></ActionForm>
                </div>
              </Row>
            ))}
          </Group>

          <Group n={5} title="Instagram follow-ups" count={ig.followups.length}>
            {ig.followups.map(({ p, n }) => {
              const text = n === 1
                ? 'Recorded a quick 60-second walkthrough of how a firm like yours could handle new enquiries. Happy to send it over?'
                : `No worries if the timing’s off. I’ll leave it with you and check back in ${checkBackMonth()}.`;
              return (
                <Row key={p.id} itemId={`fu-${p.id}`} firmId={p.id} who={`@${p.instagram}`} channel="Instagram" href={igChat(p.instagram)} copy={text} task={n === 1 ? `${p.firm}: day 5 follow-up. Only send the walkthrough offer if you’ll record it today.` : `${p.firm}: day 9, the last one. Then stop.`}>
                  <Msg text={text} />
                  <div className="flex flex-wrap gap-3 items-center">
                    <CopyText text={text} label="Copy message" />
                    <ActionForm action={markIgFollowup}><input type="hidden" name="id" value={p.id} /><input type="hidden" name="n" value={n} /><button className={btn}>Sent</button></ActionForm>
                    <ActionForm action={markIgReplied}><input type="hidden" name="id" value={p.id} /><button className={quiet}>They replied</button></ActionForm>
                  </div>
                </Row>
              );
            })}
          </Group>

          <Group n={5} title="LinkedIn" count={ig.linkedin.length}>
            {ig.linkedin.map(({ p, step }) => {
              const r = p.drafts!.research!;
              const first = (r.owner ?? p.drafts?.firstName ?? '').split(' ')[0];
              const profile = r.ownerLinkedin!.replace(/\/$/, '');
              const who = `${r.owner ?? p.firm}${r.owner ? ` · ${p.firm}` : ''}`;
              const texts = {
                engage: '',
                connect: `Hi${first ? ` ${first}` : ''}, I’ve been admiring ${p.firm}’s projects. Would be good to connect.`,
                dm: `Thanks for connecting${first ? `, ${first}` : ''}. Genuine question: how do most new enquiries reach ${p.firm} these days, the website or referrals?`,
                fu: `No pressure at all. If enquiries ever start slipping between the first message and the consultation, happy to show you what I’d change.`,
              };
              const tasks = {
                engage: 'Like 2 of their recent posts and leave one real comment about the work. No connect yet.',
                connect: 'Send a connection request with this note (no pitch).',
                dm: 'Have they accepted? If yes, send this DM. If not, check again in 2 days.',
                fu: 'One follow-up, then stop.',
              };
              const text = texts[step];
              return (
                <Row key={`li-${step}-${p.id}`} itemId={`li-${step}-${p.id}`} firmId={p.id} who={who} channel="LinkedIn"
                  href={step === 'engage' ? `${profile}/recent-activity/all/` : profile} hrefLabel={step === 'engage' ? 'Open their posts' : 'Open profile'} copy={text || undefined} task={tasks[step]}>
                  {text && <Msg text={text} />}
                  <div className="flex flex-wrap gap-3 items-center">
                    {text && <CopyText text={text} label="Copy" />}
                    <ActionForm action={markLiStep}><input type="hidden" name="id" value={p.id} /><input type="hidden" name="step" value={{ engage: 'engaged', connect: 'connected', dm: 'dm', fu: 'fu' }[step]} /><button className={btn}>{{ engage: 'Done', connect: 'Request sent', dm: 'Accepted · DM sent', fu: 'Sent' }[step]}</button></ActionForm>
                    {step === 'dm' && <ActionForm action={markLiStep}><input type="hidden" name="id" value={p.id} /><input type="hidden" name="step" value="notyet" /><button className={quiet}>Not accepted yet</button></ActionForm>}
                  </div>
                </Row>
              );
            })}
          </Group>

          <Group n={6} title="Instagram openers" count={ig.openers.length}>
            {ig.openers.map((p) => {
              const options = p.drafts?.dms?.length ? p.drafts.dms : [{ style: 'default', text: p.drafts?.dm ?? '' }];
              return (
                <Row key={p.id} itemId={`op-${p.id}`} firmId={p.id} who={`@${p.instagram}`} channel="Instagram" href={igChat(p.instagram)} task={`${p.firm}: you warmed them up yesterday. Pick one opener, send it, tick it.${p.drafts?.research?.gap ? ` Their gap: ${p.drafts.research.gap}` : ''}`}>
                  {options.map((o) => {
                    const lint = lintMessage(o.text, { dm: true });
                    return (
                      <div key={o.style} className="flex flex-col gap-1.5">
                        {options.length > 1 && <span className="text-[10px] uppercase tracking-wider text-white/35">Style {o.style}</span>}
                        <Msg text={o.text} />
                        {(lint.block.length > 0 || lint.warn.length > 0) && <p className="text-[11px]">{lint.block.map((b) => <span key={b} className="text-rose-300 mr-2">✕ {b}</span>)}{lint.warn.map((w) => <span key={w} className="text-amber-300/90 mr-2">⚠ {w}</span>)}</p>}
                        {lint.ok ? (
                          <div className="flex gap-3 items-center">
                            <CopyText text={o.text} label="Copy" />
                            <ActionForm action={markDmSent}><input type="hidden" name="id" value={p.id} /><input type="hidden" name="style" value={o.style} /><button className={btn}>Sent this one</button></ActionForm>
                          </div>
                        ) : <span className="text-[11px] text-white/40">Fix it on Prospects → Drafts first</span>}
                      </div>
                    );
                  })}
                </Row>
              );
            })}
          </Group>

          <Group n={7} title="Instagram warm-ups" count={ig.warm.length}>
            {ig.warm.map((p) => {
              const found = posts[(p.instagram ?? '').toLowerCase()]?.items ?? [];
              return (
                <Row key={p.id} itemId={`wu-${p.id}`} firmId={p.id} who={`@${p.instagram}`} channel="Instagram" href={igProfile(p.instagram)} hrefLabel="Open profile" task={`${p.firm}: follow, like these posts, leave one comment, view their story. No DM today.`}>
                  {found.length ? (
                    <div className="grid sm:grid-cols-3 gap-2">
                      {found.map((post) => (
                        <div key={post.url} className="rounded-lg border border-white/[0.07] bg-white/[0.02] p-2 flex flex-col gap-1.5 min-w-0">
                          <a href={post.url} {...linkProps} className="text-[11px] text-[#ff8a6d] hover:underline">Open post ↗{post.at ? ` · ${ago(post.at)}` : ''}</a>
                          {post.caption && <p className="text-[11px] text-white/45 line-clamp-2">{post.caption}</p>}
                          {post.comment && <><p className="text-[12.5px] text-white/85">“{post.comment}”</p><CopyText text={post.comment} label="Copy comment" /></>}
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-[11px] text-white/35">Fetching their latest posts and comment ideas (a minute or two after the drafts arrive). Meanwhile, open the profile and pick 2 recent project posts.</p>}
                  <ActionForm action={markWarmed}><input type="hidden" name="id" value={p.id} /><button className={btn}>Done</button></ActionForm>
                </Row>
              );
            })}
          </Group>
        </div></FocusShell></div>
      )}
    </Card>
  );
}
