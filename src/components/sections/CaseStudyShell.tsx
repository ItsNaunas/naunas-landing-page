import Link from 'next/link';

export function CaseStudyShell({ children, hideCta = false }: { children: React.ReactNode; hideCta?: boolean }) {
  return (
    <div className="relative min-h-screen" style={{ background: '#0C0C0C' }}>
      <header className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="text-lg font-semibold text-[var(--fg)] tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
          Naunas<span className="text-[var(--accent)]">.</span>
        </Link>
        <Link href="/case-studies" className="text-sm transition-colors hover:text-[#F2613F]" style={{ color: 'rgba(255,255,255,0.5)' }}>
          All work
        </Link>
      </header>

      <main className="max-w-5xl mx-auto px-6 pb-24">{children}</main>

      {!hideCta && (
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <div className="p-8 md:p-12 flex flex-col md:flex-row md:items-center md:justify-between gap-6" style={{ background: '#0f0f0f', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div>
            <h2 className="text-2xl md:text-3xl font-bold" style={{ color: '#fff' }}>Want one built for your business?</h2>
            <p className="text-sm mt-2" style={{ color: 'rgba(255,255,255,0.5)' }}>Start with the free audit. I&apos;ll show you which part is costing you the most.</p>
          </div>
          <Link
            href="/audit?src=case-study"
            className="inline-flex items-center justify-center text-sm font-semibold text-[#0C0C0C] px-6 py-3 rounded-full glow-accent shrink-0"
            style={{ background: '#F2613F' }}
          >
            Get your free audit →
          </Link>
        </div>
      </section>
      )}
    </div>
  );
}
