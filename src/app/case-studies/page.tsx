import type { Metadata } from 'next';
import Link from 'next/link';
import { CASE_STUDIES } from '@/lib/caseStudies';
import { CaseStudyShell } from '@/components/sections/CaseStudyShell';

export const metadata: Metadata = {
  title: 'Case Studies | Naunas',
  description: 'Client systems built for a design studio, a Brooklyn live-music brand, a subscription platform, a cleaning company and more.',
};

export default function CaseStudiesPage() {
  return (
    <CaseStudyShell>
      <div className="pt-12 pb-12">
        <span className="text-[11px] font-medium text-[#F2613F] uppercase tracking-widest">Case Studies</span>
        <h1 className="text-4xl md:text-6xl font-bold leading-tight mt-3" style={{ color: '#fff' }}>
          Systems I&apos;ve built.
        </h1>
        <p className="text-base md:text-lg mt-4 max-w-2xl" style={{ color: 'rgba(255,255,255,0.55)' }}>
          What was in the way, what I built, and what changed.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.08)' }}>
        {CASE_STUDIES.map((c) => (
          <Link
            key={c.slug}
            href={`/case-studies/${c.slug}`}
            className="group flex flex-col p-7 transition-colors bg-[#0C0C0C] hover:bg-[#111111]"
          >
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{c.sector}</span>
            <h2 className="text-xl font-bold mt-2" style={{ color: '#fff' }}>{c.client}</h2>
            <p className="font-bold leading-none mt-6 text-2xl" style={{ color: '#F2613F' }}>{c.metric.value}</p>
            <p className="text-xs mt-2" style={{ color: 'rgba(255,255,255,0.4)' }}>{c.metric.label}</p>
            <p className="text-sm leading-relaxed mt-5 flex-1" style={{ color: 'rgba(255,255,255,0.6)' }}>{c.summary}</p>
            <span className="text-sm font-medium mt-5 transition-colors group-hover:text-[#F2613F]" style={{ color: '#fff' }}>
              Read →
            </span>
          </Link>
        ))}
        {/* Fillers so the hairline grid never shows a solid empty cell */}
        {CASE_STUDIES.length % 2 === 1 && <div className="hidden md:block lg:hidden bg-[#0C0C0C]" />}
        {Array.from({ length: (3 - (CASE_STUDIES.length % 3)) % 3 }).map((_, i) => (
          <div key={i} className="hidden lg:block bg-[#0C0C0C]" />
        ))}
      </div>
    </CaseStudyShell>
  );
}
