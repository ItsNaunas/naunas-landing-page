import { FUNNEL } from '@/config/funnel';

/** "Work I've done" lines on the client pages. Renders nothing until FUNNEL.proof.approved. */
export function Proof() {
  if (!FUNNEL.proof.approved || !FUNNEL.proof.items.length) return null;
  return (
    <section className="mt-12" aria-labelledby="proof-title">
      <h2 id="proof-title" className="text-xs uppercase tracking-wider text-white/60">Recent work</h2>
      <ul className="mt-3 flex flex-col gap-3">
        {FUNNEL.proof.items.map((p) => (
          <li key={p.client} className="p-5" style={{ border: '1px solid rgba(255,255,255,0.08)', background: '#111' }}>
            <p className="text-base font-semibold">{p.client} <span className="text-sm font-normal text-white/60">· {p.what}</span></p>
            <p className="text-sm leading-relaxed text-white/75 mt-1.5">{p.line}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Who wrote this, at the foot of a client page. */
export function Signature() {
  return (
    <div className="mt-10 flex items-center gap-3">
      <span className="size-11 shrink-0 rounded-full grid place-items-center text-lg font-semibold text-[#0C0C0C]" style={{ background: '#F2613F', fontFamily: 'var(--font-display)' }} aria-hidden>N</span>
      <div>
        <p className="text-sm font-semibold">Naufal Nassor</p>
        <p className="text-xs text-white/60">Naunas · I build the system between an enquiry and a signed client</p>
      </div>
    </div>
  );
}
