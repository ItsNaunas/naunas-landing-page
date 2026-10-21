import { Meter } from '@/components/dashboard/kit';
import type { ChannelCount } from '@/lib/channels';

/** One compact strip: new firms today per channel against its target. Targets are changed in ⚙ Settings. */
export function ChannelBoard({ channels }: { channels: ChannelCount[] }) {
  return (
    <div className="grid grid-cols-3 rounded-2xl border border-white/[0.07] bg-[#121212] divide-x divide-white/[0.06]">
      {channels.map((c) => {
        const hit = c.target > 0 && c.newToday >= c.target;
        return (
          <div key={c.key} className="px-3 sm:px-5 py-3 min-w-0" title={`${c.followupsToday} follow-ups today · ${c.inSequence} in sequence · ${c.newThisWeek} new this week`}>
            <p className="text-[11px] sm:text-xs text-white/50 truncate">{c.label}{hit ? ' ✓' : ''}</p>
            <p className="text-lg sm:text-2xl font-semibold tabular-nums leading-tight" style={{ fontFamily: 'var(--font-display)' }}>
              {c.newToday}<span className="text-xs sm:text-sm text-white/35">/{c.target} new</span>
            </p>
            <div className="mt-1.5"><Meter value={c.newToday} max={Math.max(1, c.target)} /></div>
            <p className="hidden sm:block text-[11px] text-white/40 mt-1.5 truncate">{c.followupsToday} follow-ups today · {c.inSequence} in sequence</p>
          </div>
        );
      })}
    </div>
  );
}
