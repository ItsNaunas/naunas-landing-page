'use client';

import { useInView } from '@/hooks/useInView';
import { useCountUp } from '@/hooks/useCountUp';

type Stat =
  | { target: number; format: (n: number) => string; label: string; static?: never }
  | { target?: never; static: string; label: string; format?: never };

const STATS: Stat[] = [
  { target: 18, format: (n) => `£${n}K+`, label: 'Avg. revenue leak fixed / client' },
  { static: '< 48hrs', label: 'Client onboarding time' },
  { target: 3, format: (n) => `${n}×`, label: 'Service pillars delivered' },
  { target: 100, format: (n) => `${n}%`, label: 'Done-for-you implementation' },
  { target: 12, format: (n) => `${n}+`, label: 'Systems installed' },
];

function CountStat({
  target,
  format,
  label,
  inView,
}: {
  target: number;
  format: (n: number) => string;
  label: string;
  inView: boolean;
}) {
  const count = useCountUp(target, 1600, inView);
  return (
    <div className="flex flex-col items-center text-center min-w-[100px]">
      <span className="text-white text-2xl font-bold leading-none">{format(count)}</span>
      <span className="text-white/70 text-xs mt-1 leading-snug max-w-[120px]">{label}</span>
    </div>
  );
}

export function StatBar() {
  const { ref, inView } = useInView();

  return (
    <div ref={ref as React.RefObject<HTMLDivElement>} style={{ background: '#F2613F' }} className="py-6 px-6">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-6">
        {STATS.map((stat, i) =>
          stat.target !== undefined ? (
            <CountStat key={i} target={stat.target} format={stat.format!} label={stat.label} inView={inView} />
          ) : (
            <div key={i} className="flex flex-col items-center text-center min-w-[100px]">
              <span className="text-white text-2xl font-bold leading-none">{stat.static}</span>
              <span className="text-white/70 text-xs mt-1 leading-snug max-w-[120px]">{stat.label}</span>
            </div>
          )
        )}
      </div>
    </div>
  );
}
