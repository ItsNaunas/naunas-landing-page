import { Card } from '@/components/dashboard/ui';
import { Meter } from '@/components/dashboard/kit';
import { ActionForm } from '@/components/dashboard/ActionForm';
import { setChannelTargets } from '@/app/dashboard/actions';
import type { ChannelCount } from '@/lib/channels';

const NOTE: Record<string, string> = {
  instagram: 'New = warm-up done. Openers and follow-ups come after.',
  linkedin: 'New = engaged with their posts. Only firms where the owner’s profile was found.',
  email: 'New = first email sent by the 17:00 send (needs Sending ON).',
};
const FIELD: Record<string, string> = { instagram: 'igNew', linkedin: 'liNew', email: 'dailyNew' };

/** Outreach per channel: new firms today against that channel's daily target, plus follow-ups and totals. */
export function ChannelBoard({ channels }: { channels: ChannelCount[] }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="grid sm:grid-cols-3 gap-3 md:gap-4">
        {channels.map((c) => {
          const hit = c.target > 0 && c.newToday >= c.target;
          return (
            <Card key={c.key}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">{c.label}</p>
                {hit && <span className="text-[11px] text-emerald-300">Target hit ✓</span>}
              </div>
              <p className="mt-2 text-3xl font-semibold tabular-nums" style={{ fontFamily: 'var(--font-display)' }}>{c.newToday}<span className="text-base text-white/35">/{c.target}</span></p>
              <p className="text-[11px] text-white/45">new firms today</p>
              <div className="mt-2"><Meter value={c.newToday} max={Math.max(1, c.target)} /></div>
              <p className="text-[12px] text-white/60 mt-3 tabular-nums">{c.followupsToday} follow-up{c.followupsToday === 1 ? '' : 's'} today · {c.inSequence} in sequence · {c.newThisWeek} new this week</p>
              <p className="text-[11px] text-white/35 mt-1">{NOTE[c.key]}</p>
            </Card>
          );
        })}
      </div>
      <details className="text-xs text-white/45">
        <summary className="cursor-pointer w-fit hover:text-white">Change daily targets</summary>
        <ActionForm action={setChannelTargets} className="mt-2 flex flex-wrap items-end gap-3">
          {channels.map((c) => (
            <label key={c.key} className="flex flex-col gap-1">{c.label}: new firms a day
              <input name={FIELD[c.key]} type="number" min={0} max={40} defaultValue={c.target} className="w-24 rounded-lg bg-white/[0.05] border border-white/10 px-3 py-1.5 text-sm text-white" />
            </label>
          ))}
          <button className="rounded-lg bg-white text-black text-sm font-medium px-4 py-1.5">Save</button>
        </ActionForm>
        <p className="mt-2 text-white/35">The routine researches about 10 firms a day, so targets above 10 need more approved prospects. LinkedIn: keep connection requests under about 20 a day.</p>
      </details>
    </div>
  );
}
