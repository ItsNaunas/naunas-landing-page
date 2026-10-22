'use client';

import { useEffect, useRef, useState, Fragment } from 'react';
import { askNaunas } from '@/app/dashboard/actions';

// "Ask Naunas": a chat panel on every dashboard page (lib/assistant). Read-only: it answers and suggests
// next steps as links; you do the clicking. The conversation lives in this tab only (sessionStorage).

type Msg = { role: 'user' | 'assistant'; content: string; actions?: { label: string; href: string }[] };
const KEY = 'naunas-ask';
const STARTERS = ['What should I do today?', 'What am I missing out on?', 'Which channel is working best?', 'Which replies need a next step?'];

const okHref = (h: string) => /^\/dashboard(\/|$)/.test(h) || /^https:\/\/(app(-eu1)?\.hubspot\.com|www\.naunas\.co\.uk)\//.test(h);

/** Tiny, safe markdown: **bold**, [links](/dashboard/...), "- " bullets, paragraphs. No HTML is ever injected. */
function inline(text: string, key: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)\s]+\))/g);
  return parts.map((p, i) => {
    const b = /^\*\*([^*]+)\*\*$/.exec(p);
    if (b) return <b key={`${key}-${i}`} className="font-semibold text-white">{b[1]}</b>;
    const l = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(p);
    if (l && okHref(l[2])) return <a key={`${key}-${i}`} href={l[2]} className="text-[#ff8a6d] hover:underline" {...(l[2].startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{l[1]}</a>;
    if (l) return <Fragment key={`${key}-${i}`}>{l[1]}</Fragment>;
    return <Fragment key={`${key}-${i}`}>{p}</Fragment>;
  });
}
export function Markdown({ text }: { text: string }) {
  const blocks: React.ReactNode[] = [];
  let list: string[] = [];
  const flush = () => { if (list.length) { blocks.push(<ul key={`u${blocks.length}`} className="list-disc pl-5 flex flex-col gap-1">{list.map((li, i) => <li key={i}>{inline(li, `l${blocks.length}-${i}`)}</li>)}</ul>); list = []; } };
  for (const line of text.split('\n')) {
    const t = line.trim();
    const m = /^(?:[-*•]|\d+[.)])\s+(.*)$/.exec(t);
    if (m) { list.push(m[1]); continue; }
    flush();
    if (t) blocks.push(<p key={`p${blocks.length}`}>{inline(t.replace(/^#+\s*/, ''), `p${blocks.length}`)}</p>);
  }
  flush();
  return <div className="flex flex-col gap-2 text-[13.5px] leading-relaxed text-white/80">{blocks}</div>;
}

export function AskNaunas() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => { try { const s = sessionStorage.getItem(KEY); if (s) setMsgs(JSON.parse(s)); } catch { /* no storage */ } }, []);
  useEffect(() => { try { sessionStorage.setItem(KEY, JSON.stringify(msgs.slice(-20))); } catch { /* no storage */ } end.current?.scrollIntoView({ block: 'end' }); }, [msgs, open]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  async function send(q: string) {
    const question = q.trim();
    if (!question || busy) return;
    const next = [...msgs, { role: 'user' as const, content: question }];
    setMsgs(next); setText(''); setBusy(true); setError('');
    const r = await askNaunas(next.map(({ role, content }) => ({ role, content }))).catch((e) => ({ error: String(e) } as { error: string; answer?: string; actions?: Msg['actions'] }));
    setBusy(false);
    if (r.error || !r.answer) { setError(r.error ?? 'No answer came back. Try again.'); return; }
    setMsgs([...next, { role: 'assistant', content: r.answer, actions: r.actions }]);
  }

  return (
    <>
      <button onClick={() => setOpen(true)} aria-label="Ask Naunas"
        className={`fixed right-4 bottom-24 md:bottom-6 z-30 flex items-center gap-2 rounded-full bg-[#F2613F] px-4 py-3 text-sm font-medium text-white shadow-lg shadow-black/40 hover:bg-[#ff7553] ${open ? 'hidden' : ''}`}>
        <span aria-hidden>✦</span> Ask
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-label="Ask Naunas">
          <button className="absolute inset-0 bg-black/50" aria-label="Close" onClick={() => setOpen(false)} />
          <div className="relative flex h-full w-full sm:w-[440px] flex-col border-l border-white/10 bg-[#121212]" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
            <div className="flex items-center justify-between gap-2 border-b border-white/[0.07] px-4 py-3">
              <p className="font-medium">Ask Naunas <span className="hidden sm:inline text-xs font-normal text-white/40">· reads everything, changes nothing</span></p>
              <div className="flex items-center gap-3">
                {msgs.length > 0 && <button onClick={() => { setMsgs([]); setError(''); }} className="text-xs text-white/45 hover:text-white whitespace-nowrap">New chat</button>}
                <button onClick={() => setOpen(false)} className="text-white/60 hover:text-white text-lg leading-none" aria-label="Close panel">×</button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
              {!msgs.length && (
                <div className="flex flex-col gap-3">
                  <p className="text-sm text-white/55">Ask about your outreach, deals, content or what’s slipping. Answers come from your dashboard and HubSpot, with links.</p>
                  <div className="flex flex-wrap gap-2">
                    {STARTERS.map((s) => <button key={s} onClick={() => send(s)} className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-white/75 hover:border-white/30 hover:text-white">{s}</button>)}
                  </div>
                </div>
              )}
              {msgs.map((m, i) => m.role === 'user' ? (
                <p key={i} className="self-end max-w-[85%] rounded-2xl rounded-br-md bg-white/[0.08] px-3.5 py-2 text-[13.5px]">{m.content}</p>
              ) : (
                <div key={i} className="flex flex-col gap-2.5">
                  <Markdown text={m.content} />
                  {!!m.actions?.length && (
                    <div className="flex flex-wrap gap-2">
                      {m.actions.filter((a) => okHref(a.href)).map((a) => (
                        <a key={a.href + a.label} href={a.href} className="rounded-full bg-white text-black px-3 py-1.5 text-xs font-medium hover:bg-white/90" {...(a.href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{a.label} →</a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {busy && <p className="text-xs text-white/45">Looking through your dashboard…</p>}
              {error && <p className="text-xs text-rose-300">{error}</p>}
              <div ref={end} />
            </div>
            <form onSubmit={(e) => { e.preventDefault(); send(text); }} className="border-t border-white/[0.07] p-3 flex gap-2">
              <input value={text} onChange={(e) => setText(e.target.value)} placeholder="What am I missing this week?" aria-label="Your question" maxLength={1000}
                className="flex-1 min-w-0 rounded-xl bg-white/[0.05] border border-white/10 px-3 py-2.5 text-[16px] sm:text-sm text-white placeholder:text-white/30" />
              <button disabled={busy || !text.trim()} className="rounded-xl bg-[#F2613F] px-4 text-sm font-medium text-white disabled:opacity-40">Ask</button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
