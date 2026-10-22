// Small SVG charts, rendered on the server (no chart library, no client JS).

const ACCENT = '#F2613F';

export function Sparkline({ values, width = 96, height = 32 }: { values: number[]; width?: number; height?: number }) {
  const max = Math.max(1, ...values);
  const step = values.length > 1 ? width / (values.length - 1) : width;
  const pts = values.map((v, i) => [i * step, height - 2 - (v / max) * (height - 4)] as const);
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="shrink-0" aria-hidden>
      <defs>
        <linearGradient id="spark" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={ACCENT} stopOpacity="0.35" />
          <stop offset="1" stopColor={ACCENT} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line} L${width} ${height} L0 ${height} Z`} fill="url(#spark)" />
      <path d={line} fill="none" stroke={ACCENT} strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/** Daily bars with a few date labels and a value on hover (title). */
export function BarSeries({ data, height = 180 }: { data: { day: string; count: number }[]; height?: number }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const ticks = [0, Math.ceil(max / 2), max];
  const fmt = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  return (
    <div className="flex gap-3">
      <div className="flex flex-col justify-between text-[11px] text-white/55 tabular-nums pb-5" style={{ height }}>
        {ticks.slice().reverse().map((t) => <span key={t}>{t}</span>)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="relative flex items-end gap-[3px]" style={{ height: height - 20 }}>
          {ticks.map((t) => (
            <div key={t} className="absolute inset-x-0 border-t border-white/[0.05]" style={{ bottom: `${(t / max) * 100}%` }} />
          ))}
          {data.map((d) => (
            <div key={d.day} title={`${fmt(d.day)}: ${d.count} lead${d.count === 1 ? '' : 's'}`}
              className="group relative flex-1 h-full flex items-end">
              <div className="w-full rounded-t-[3px] transition-colors group-hover:bg-[#ff8a6d]"
                style={{ height: `${Math.max(d.count ? 4 : 1.5, (d.count / max) * 100)}%`, background: d.count ? ACCENT : 'rgba(255,255,255,0.06)' }} />
            </div>
          ))}
        </div>
        <div className="flex justify-between text-[11px] text-white/55 mt-2">
          <span>{fmt(data[0].day)}</span><span>{fmt(data[Math.floor(data.length / 2)].day)}</span><span>Today</span>
        </div>
      </div>
    </div>
  );
}

/** Horizontal funnel: each step's bar relative to the first, with step-to-step conversion. */
export function Funnel({ steps }: { steps: { label: string; value: number }[] }) {
  const top = Math.max(1, steps[0]?.value ?? 1);
  return (
    <div className="flex flex-col gap-3">
      {steps.map((s, i) => {
        const prev = steps[i - 1]?.value;
        const conv = i && prev ? Math.round((s.value / prev) * 100) : null;
        return (
          <div key={s.label} className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between text-[13px]">
              <span className="text-white/70">{s.label}</span>
              <span className="tabular-nums">
                <b className="font-semibold">{s.value}</b>
                {conv !== null && <span className="text-white/55 text-xs ml-2">{conv}%</span>}
              </span>
            </div>
            <div className="h-2 rounded-full bg-white/[0.05] overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${Math.max(s.value ? 3 : 0, (s.value / top) * 100)}%`, background: `color-mix(in srgb, ${ACCENT} ${100 - i * 14}%, #ffffff ${i * 4}%)` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function Ring({ pct, size = 112, label }: { pct: number; size?: number; label: React.ReactNode }) {
  const r = size / 2 - 8;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(100, pct));
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="8" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={ACCENT} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={`${(p / 100) * c} ${c}`} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{label}</div>
    </div>
  );
}

/** Labelled horizontal bars (sources, lost reasons). */
export function HBars({ rows, format = (n: number) => String(n) }: { rows: [string, number][]; format?: (n: number) => string }) {
  const max = Math.max(1, ...rows.map(([, n]) => n));
  return (
    <div className="flex flex-col gap-2.5">
      {rows.map(([label, n]) => (
        <div key={label} className="grid grid-cols-[minmax(0,7rem)_1fr_auto] items-center gap-3 text-[13px]">
          <span className="text-white/65 truncate">{label}</span>
          <div className="h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
            <div className="h-full rounded-full bg-[#F2613F]/80" style={{ width: `${(n / max) * 100}%` }} />
          </div>
          <span className="tabular-nums text-white/80 w-6 text-right">{format(n)}</span>
        </div>
      ))}
    </div>
  );
}
