'use client';

import { useState } from 'react';

/** Content → Plan: the three idea sources (routine drafts, hook bank, leads' words) as one tabbed panel. */
export function IdeaTabs({ panels }: { panels: { label: string; count: number; content: React.ReactNode }[] }) {
  const [on, setOn] = useState(0);
  return (
    <section className="rounded-2xl border border-white/[0.07] bg-[#121212] min-w-0 flex flex-col">
      <div className="flex items-center gap-1 overflow-x-auto [scrollbar-width:none] border-b border-white/[0.07] px-3 pt-2" role="tablist" aria-label="Ideas">
        <p className="shrink-0 px-2 pb-2 text-[13px] font-medium text-white/60 mr-2">Ideas</p>
        {panels.map((p, i) => (
          <button key={p.label} type="button" role="tab" aria-selected={i === on} aria-controls={`idea-panel-${i}`} onClick={() => setOn(i)}
            className={`relative shrink-0 px-3 py-2 text-sm whitespace-nowrap ${i === on ? 'text-white' : 'text-white/65 hover:text-white/85'}`}>
            {p.label} <span className="text-white/55 tabular-nums">{p.count}</span>
            {i === on && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-[#F2613F]" />}
          </button>
        ))}
      </div>
      {panels.map((p, i) => <div key={p.label} id={`idea-panel-${i}`} role="tabpanel" hidden={i !== on} className="min-w-0">{p.content}</div>)}
    </section>
  );
}
