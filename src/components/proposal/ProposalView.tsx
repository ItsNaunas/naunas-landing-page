import Link from 'next/link';
import { depositHref, type Proposal } from '@/lib/proposal';
import { AcceptForm } from './AcceptForm';
import { Proof, Signature } from './Proof';
import { FUNNEL } from '@/config/funnel';

const day = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '');

/** The proposal as the client sees it (public /p/<token>) and the dashboard preview. */
export function ProposalView({ p, preview = false }: { p: Proposal; preview?: boolean }) {
  const pay = depositHref(p);
  return (
    <div className="min-h-screen" style={{ background: '#0C0C0C' }}>
      {preview && <p className="bg-[#F2613F] text-black text-center text-xs font-medium py-2 px-4">{p.published ? 'Preview. This is what the client sees; opens from here are not counted.' : 'Draft preview. Only you can see this until you press Publish.'}</p>}
      <header className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="text-lg font-semibold tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>Naunas<span className="text-[#F2613F]">.</span></Link>
        <span className="text-xs text-white/60">Proposal{p.publishedAt ? ` · ${day(p.publishedAt)}` : ''}</span>
      </header>
      <main className="max-w-3xl mx-auto px-6 pb-24">
        <p className="text-[11px] font-medium text-[#F2613F] uppercase tracking-widest mt-8">For {p.client}</p>
        <h1 className="text-3xl md:text-4xl font-bold leading-tight mt-3">{p.title}</h1>
        {p.intro && <p className="text-base md:text-lg leading-relaxed text-white/70 mt-6 whitespace-pre-line">{p.intro}</p>}

        {p.blocks.length > 0 && (
          <ol className="mt-10 flex flex-col gap-4">
            {p.blocks.map((b, i) => (
              <li key={i} className="p-5 md:p-6" style={{ border: '1px solid rgba(255,255,255,0.08)', background: '#111' }}>
                <h2 className="text-xl font-semibold">{b.title}</h2>
                <p className="text-base leading-relaxed text-white/75 mt-3 whitespace-pre-line">{b.text}</p>
              </li>
            ))}
          </ol>
        )}

        <Proof />

        {(p.timeline || p.price || p.deposit) && (
          <section className="mt-10 grid sm:grid-cols-3 gap-4">
            {p.timeline && <div className="sm:col-span-3 p-5" style={{ borderLeft: '3px solid #F2613F', background: '#141110' }}><p className="text-xs uppercase tracking-wider text-[#F2613F]">Timeline</p><p className="text-base leading-relaxed text-white/80 mt-2 whitespace-pre-line">{p.timeline}</p></div>}
            {p.price && <div className="sm:col-span-2 p-5" style={{ border: '1px solid rgba(255,255,255,0.08)' }}><p className="text-xs uppercase tracking-wider text-white/60">Price</p><p className="text-2xl font-bold mt-2">{p.price}</p></div>}
            {p.deposit && <div className="p-5" style={{ border: '1px solid rgba(255,255,255,0.08)' }}><p className="text-xs uppercase tracking-wider text-white/60">To start</p><p className="text-2xl font-bold mt-2">{p.deposit}</p></div>}
          </section>
        )}

        <section id="accept" className="mt-12 p-6 md:p-8 scroll-mt-6" style={{ border: '1px solid rgba(255,255,255,0.08)', background: '#0f0f0f' }}>
          {p.paidAt ? (
            <>
              <h2 className="text-xl font-bold">Deposit received. Thank you{p.firstName ? `, ${p.firstName}` : ''}.</h2>
              <p className="text-sm text-white/55 mt-2">Accepted by {p.acceptedBy} on {day(p.acceptedAt)}. Your onboarding email is on its way; the kickoff booking link is in it.</p>
            </>
          ) : p.acceptedAt ? (
            <>
              <h2 className="text-xl font-bold">Accepted by {p.acceptedBy} on {day(p.acceptedAt)}.</h2>
              <p className="text-sm text-white/55 mt-2">{p.nextSteps}</p>
              {pay ? <a href={pay} className="mt-5 inline-flex items-center justify-center text-sm font-semibold text-[#0C0C0C] px-6 py-3 rounded-full" style={{ background: '#F2613F' }}>Pay the deposit{p.deposit ? ` · ${p.deposit}` : ''} →</a>
                : <p className="text-sm text-white/55 mt-4">Naufal will send the deposit link to {p.email ?? 'you'} shortly.</p>}
              <p className="text-xs text-white/55 mt-4">Payments are handled by Stripe. Nothing is built until the deposit is in.</p>
            </>
          ) : (
            <>
              <h2 className="text-xl font-bold">Ready to go?</h2>
              <p className="text-sm text-white/55 mt-2">{p.nextSteps}{p.validUntil ? ` This proposal is open until ${p.validUntil}.` : ''}</p>
              {preview ? <p className="text-xs text-white/60 mt-4 border border-dashed border-white/15 rounded-lg p-3">The accept form (name + agreement) and the deposit button appear here for the client.</p>
                : <AcceptForm token={p.token} firstName={p.firstName} />}
              <p className="text-sm text-white/65 mt-5">Not sure yet? <a href={`https://cal.com/${FUNNEL.cal.link}${p.email ? `?email=${encodeURIComponent(p.email)}&name=${encodeURIComponent(p.firstName ?? p.client)}` : ''}`} target="_blank" rel="noopener noreferrer" className="text-[#ff8a6d] underline-offset-2 hover:underline">Book 15 minutes and ask me anything</a>.</p>
            </>
          )}
        </section>
        <p className="text-xs text-white/60 mt-8">Questions? Reply to the email this came with, or write to contact@naunas.co.uk. Everything is built in your own accounts and documented at handover.</p>
        <Signature />
      </main>
      {/* Phones: the accept form sits at the very end, so keep a way to it on screen. */}
      {!preview && !p.acceptedAt && (
        <div className="sm:hidden fixed inset-x-0 bottom-0 z-20 border-t border-white/10 px-4 pt-3" style={{ background: 'rgba(12,12,12,0.95)', paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))' }}>
          <a href="#accept" className="flex items-center justify-between gap-3 rounded-full px-5 py-3 text-sm font-semibold text-[#0C0C0C]" style={{ background: '#F2613F' }}>
            <span>{p.price ? `Accept · ${p.price}` : 'Accept the proposal'}</span><span aria-hidden>↓</span>
          </a>
        </div>
      )}
    </div>
  );
}
