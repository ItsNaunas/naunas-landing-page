import Link from 'next/link';
import { LAYERS, type LeakReport } from '@/lib/leakReport';
import { Proof, Signature } from '@/components/proposal/Proof';

/** The leak report as the firm sees it (public /r/<token>, and the dashboard preview). */
export function ReportView({ r, preview = false }: { r: LeakReport; preview?: boolean }) {
  const host = (() => { try { return new URL(r.site).hostname.replace(/^www\./, ''); } catch { return r.site; } })();

  return (
    <div className="min-h-screen" style={{ background: '#0C0C0C' }}>
      {preview && <p className="bg-[#F2613F] text-black text-center text-xs font-medium py-2 px-4">Draft preview. Only you can see this until you press Publish in the dashboard.</p>}
      <header className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="text-lg font-semibold tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>Naunas<span className="text-[#F2613F]">.</span></Link>
        <span className="text-xs text-white/60">Leak report</span>
      </header>
      <main className="max-w-3xl mx-auto px-6 pb-24">
        <p className="text-[11px] font-medium text-[#F2613F] uppercase tracking-widest mt-8">For {r.firm}</p>
        <h1 className="text-3xl md:text-4xl font-bold leading-tight mt-3">Where enquiries could be slipping away</h1>
        <p className="text-sm text-white/60 mt-2">From {host}{r.publishedAt ? ` · ${new Date(r.publishedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}` : ''}</p>
        <p className="text-base md:text-lg leading-relaxed text-white/70 mt-6 whitespace-pre-line">{r.intro}</p>

        <ol className="mt-10 flex flex-col gap-5">
          {r.findings.map((f, i) => (
            <li key={i} className="p-5 md:p-6" style={{ border: '1px solid rgba(255,255,255,0.08)', background: '#111' }}>
              <p className="text-[11px] uppercase tracking-widest text-white/60">{String(i + 1).padStart(2, '0')} · Layer {f.layer}: {LAYERS[f.layer - 1]}</p>
              <h2 className="text-xl font-semibold mt-2">{f.title}</h2>
              <div className="mt-4 grid gap-3 text-[15px] leading-relaxed">
                <p><span className="block text-xs uppercase tracking-wider text-white/60 mb-1">What I saw</span><span className="text-white/80">{f.seen}</span>{' '}
                  <a href={f.url} target="_blank" rel="noopener noreferrer nofollow" className="text-[#F2613F] text-sm hover:underline whitespace-nowrap">see page ↗</a></p>
                <p><span className="block text-xs uppercase tracking-wider text-white/60 mb-1">Why it matters</span><span className="text-white/70">{f.why}</span></p>
                <p><span className="block text-xs uppercase tracking-wider text-white/60 mb-1">The fix</span><span className="text-white/80">{f.fix}</span></p>
              </div>
            </li>
          ))}
        </ol>

        {r.quickWin && (
          <section className="mt-10 p-5 md:p-6" style={{ borderLeft: '3px solid #F2613F', background: '#141110' }}>
            <p className="text-xs uppercase tracking-wider text-[#F2613F]">One thing you could change this week</p>
            <p className="text-[15px] leading-relaxed text-white/80 mt-2">{r.quickWin}</p>
          </section>
        )}

        {r.askOnCall.length > 0 && (
          <section className="mt-10">
            <h2 className="text-lg font-semibold">What can’t be seen from outside</h2>
            <p className="text-sm text-white/65 mt-1">The rest of the 8 layers happen inside your inbox and calendar. These are worth a look:</p>
            <ul className="mt-4 flex flex-col gap-2">
              {r.askOnCall.map((q, i) => <li key={i} className="text-[15px] text-white/70 pl-5 relative"><span className="absolute left-0 text-[#F2613F]">·</span>{q}</li>)}
            </ul>
          </section>
        )}

        <Proof />

        <section className="mt-14 p-6 md:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-5" style={{ border: '1px solid rgba(255,255,255,0.08)', background: '#0f0f0f' }}>
          <div>
            <h2 className="text-xl font-bold">Want to go through it together?</h2>
            <p className="text-sm mt-1 text-white/65">30 minutes, free. I’ll show you which of these is costing you the most and what I’d fix first.</p>
          </div>
          <Link href="/audit?src=leak-report" className="inline-flex items-center justify-center text-sm font-semibold text-[#0C0C0C] px-6 py-3 rounded-full shrink-0" style={{ background: '#F2613F' }}>Book the free audit →</Link>
        </section>
        <p className="text-xs text-white/55 mt-8">Prepared by Naufal at Naunas from what’s publicly visible on your website and Instagram. Nothing was submitted or tested.</p>
        <Signature />
      </main>
    </div>
  );
}
