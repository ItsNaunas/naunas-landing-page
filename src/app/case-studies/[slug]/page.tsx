import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CASE_STUDIES, getCaseStudy } from '@/lib/caseStudies';
import { CaseStudyShell } from '@/components/sections/CaseStudyShell';

export function generateStaticParams() {
  return CASE_STUDIES.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const c = getCaseStudy(slug);
  if (!c) return {};
  return { title: `${c.client} case study | Naunas`, description: c.summary };
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-medium uppercase tracking-widest mb-5" style={{ color: '#F2613F' }}>
      {children}
    </p>
  );
}

export default async function CaseStudyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = getCaseStudy(slug);
  if (!c) notFound();

  return (
    <CaseStudyShell>
      {/* Title */}
      <div className="pt-12 pb-10">
        <span className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>{c.sector}</span>
        <h1 className="text-4xl md:text-6xl font-bold leading-tight mt-2" style={{ color: '#fff' }}>{c.client}</h1>
        <p className="text-lg md:text-xl mt-4 max-w-3xl leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)' }}>{c.summary}</p>
        {c.layers && (
          <div className="flex flex-wrap gap-2 mt-6">
            {c.layers.map((l) => (
              <span key={l} className="text-xs px-3 py-1" style={{ border: '1px solid #2A2A2A', color: 'rgba(255,255,255,0.55)' }}>
                {l}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Results strip */}
      {c.results && (
        <div
          className="grid grid-cols-2 md:grid-cols-4 mb-16"
          style={{ borderTop: '1px solid #2A2A2A', borderBottom: '1px solid #2A2A2A' }}
        >
          {c.results.map((r) => (
            <div key={r.label} className="px-4 py-6 md:px-6 md:py-8">
              <p className="font-bold leading-none" style={{ fontSize: 'clamp(1.25rem, 3.5vw, 2rem)', color: '#F2613F' }}>{r.value}</p>
              <p className="text-xs mt-2 leading-snug" style={{ color: 'rgba(255,255,255,0.4)' }}>{r.label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-16 max-w-3xl">
        {c.started && (
          <section>
            <Label>Where it started</Label>
            <p className="text-base md:text-lg leading-relaxed" style={{ color: 'rgba(255,255,255,0.75)' }}>{c.started.intro}</p>
            {c.started.bullets && (
              <ul className="mt-5 flex flex-col gap-3">
                {c.started.bullets.map((b) => (
                  <li key={b} className="text-base leading-relaxed pl-5 relative" style={{ color: 'rgba(255,255,255,0.6)' }}>
                    <span className="absolute left-0" style={{ color: '#F2613F' }}>·</span>{b}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {c.approach && (
          <section>
            <Label>How I approached it</Label>
            <p className="text-base md:text-lg leading-relaxed" style={{ color: 'rgba(255,255,255,0.75)' }}>{c.approach}</p>
          </section>
        )}

        {c.built && (
          <section>
            <Label>What I built</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-px" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.08)' }}>
              {c.built.map((b) => (
                <div key={b.title} className="p-5" style={{ background: '#0C0C0C' }}>
                  <p className="text-sm font-semibold" style={{ color: '#fff' }}>{b.title}</p>
                  <p className="text-sm leading-relaxed mt-2" style={{ color: 'rgba(255,255,255,0.55)' }}>{b.text}</p>
                </div>
              ))}
              {c.built.length % 2 === 1 && <div className="hidden sm:block" style={{ background: '#0C0C0C' }} />}
            </div>
          </section>
        )}

        {c.steps && (
          <section>
            <Label>How it works, start to finish</Label>
            <ol className="flex flex-col gap-4">
              {c.steps.map((s, i) => (
                <li key={s} className="flex gap-4">
                  <span className="text-sm font-bold shrink-0 w-6" style={{ color: '#F2613F' }}>{String(i + 1).padStart(2, '0')}</span>
                  <span className="text-base leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)' }}>{s}</span>
                </li>
              ))}
            </ol>
          </section>
        )}

        {c.decisions && (
          <section>
            <Label>Decisions behind it</Label>
            <div className="flex flex-col gap-5">
              {c.decisions.map((d) => (
                <div key={d.title}>
                  <p className="text-base font-semibold" style={{ color: '#fff' }}>{d.title}</p>
                  <p className="text-base leading-relaxed mt-1" style={{ color: 'rgba(255,255,255,0.6)' }}>{d.text}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {c.changed && (
          <section>
            <Label>What changed</Label>
            <ul className="flex flex-col gap-3">
              {c.changed.map((b) => (
                <li key={b} className="text-base leading-relaxed pl-5 relative" style={{ color: 'rgba(255,255,255,0.7)' }}>
                  <span className="absolute left-0" style={{ color: '#F2613F' }}>·</span>{b}
                </li>
              ))}
            </ul>
          </section>
        )}

        {c.quote && (
          <section style={{ borderTop: '1px solid #2A2A2A' }} className="pt-10">
            <p className="font-medium leading-relaxed" style={{ fontSize: 'clamp(1.15rem, 2.5vw, 1.5rem)', color: 'rgba(255,255,255,0.85)' }}>
              &ldquo;{c.quote.text}&rdquo;
            </p>
            <p className="text-sm mt-4" style={{ color: 'rgba(255,255,255,0.4)' }}>{c.quote.author}</p>
          </section>
        )}
      </div>
    </CaseStudyShell>
  );
}
