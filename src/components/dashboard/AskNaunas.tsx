'use client';

import { useEffect, useRef, useState, Fragment } from 'react';
import { askNaunas } from '@/app/dashboard/actions';
import { usePathname } from 'next/navigation';
import { answerText, type Answer, type Urgency } from '@/lib/answerShape';

// "Ask Naunas": a chat panel on every dashboard page (lib/assistant). Read-only: it answers and suggests
// next steps as links; you do the clicking. Answers are cards (headline, sections with urgency, follow-ups,
// sources). It knows the page you asked from. The conversation lives in this tab only (sessionStorage).

type Msg = { role: 'user' | 'assistant'; content: string; answer?: Answer; at?: string; page?: string; actions?: { label: string; href: string }[] };
const KEY = 'naunas-ask';
const STARTERS = ['What should I do today?', 'What am I missing out on?', 'Where is each client at?', 'What broke this week?', 'Which channel is working best?', 'What’s left to build on the dashboard?'];

const okHref = (h: string) => /^\/dashboard(\/|$)/.test(h) || /^https:\/\/(app(-eu1)?\.hubspot\.com|www\.naunas\.co\.uk)\//.test(h);
const ext = (h: string) => (h.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {});

/** Tiny, safe markdown: **bold**, [links](/dashboard/...), bullets, numbered lists, headings, paragraphs. No HTML is ever injected. */
function inline(text: string, key: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)\s]+\))/g);
  return parts.map((p, i) => {
    const b = /^\*\*([^*]+)\*\*$/.exec(p);
    if (b) return <b key={`${key}-${i}`} className="font-semibold text-white">{b[1]}</b>;
    const l = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(p);
    if (l && okHref(l[2])) return <a key={`${key}-${i}`} href={l[2]} className="text-[#ff8a6d] hover:underline" {...ext(l[2])}>{l[1]}</a>;
    if (l) return <Fragment key={`${key}-${i}`}>{l[1]}</Fragment>;
    return <Fragment key={`${key}-${i}`}>{p}</Fragment>;
  });
}
export function Markdown({ text }: { text: string }) {
  const blocks: React.ReactNode[] = [];
  let list: string[] = [];
  let ordered = false;
  const flush = () => {
    if (!list.length) return;
    const items = list.map((li, i) => <li key={i}>{inline(li, `l${blocks.length}-${i}`)}</li>);
    blocks.push(ordered
      ? <ol key={`o${blocks.length}`} className="list-decimal pl-5 flex flex-col gap-1 marker:text-white/50">{items}</ol>
      : <ul key={`u${blocks.length}`} className="list-disc pl-5 flex flex-col gap-1 marker:text-white/40">{items}</ul>);
    list = [];
  };
  for (const line of text.split('\n')) {
    const t = line.trim();
    const m = /^([-*•]|\d+[.)])\s+(.*)$/.exec(t);
    if (m) {
      const isNum = /^\d/.test(m[1]);
      if (list.length && isNum !== ordered) flush();
      ordered = isNum; list.push(m[2]); continue;
    }
    flush();
    const h = /^#+\s*(.*)$/.exec(t);
    if (h) blocks.push(<p key={`h${blocks.length}`} className="pt-1 text-[11px] font-medium uppercase tracking-wider text-white/50">{h[1]}</p>);
    else if (t) blocks.push(<p key={`p${blocks.length}`}>{inline(t, `p${blocks.length}`)}</p>);
  }
  flush();
  return <div className="flex flex-col gap-2 text-sm leading-relaxed text-white/80">{blocks}</div>;
}

const DOT: Record<Urgency, string> = { high: 'bg-rose-400', medium: 'bg-amber-300', low: 'bg-white/25' };
const URGENCY_LABEL: Record<Urgency, string> = { high: 'Urgent', medium: 'This week', low: 'FYI' };

/** One answer laid out as cards. Used by the panel and by Today's plan on the home page. */
export function AnswerView({ a, actions = true }: { a: Answer; actions?: boolean }) {
  const [done, setDone] = useState<Record<string, boolean>>({});
  const legacy = !a.sections?.length && !!a.answer;
  return (
    <div className="flex flex-col gap-3 min-w-0">
      {legacy ? <Markdown text={a.answer!} /> : <p className="text-[15px] font-medium leading-snug text-white">{a.headline}</p>}
      {(a.sections ?? []).map((s, si) => (
        <div key={si} role="group" className="flex flex-col gap-1.5" aria-label={s.title}>
          {s.title && <p className="text-[11px] font-medium uppercase tracking-wider text-white/50">{s.title}</p>}
          {s.kind === 'plan' ? (
            <ol className="flex flex-col gap-1">
              {s.items.map((it, i) => {
                const k = `${si}-${i}`;
                return (
                  <li key={k} className="flex items-start gap-2.5 rounded-lg px-2 py-1.5 hover:bg-white/[0.04]">
                    <button type="button" onClick={() => setDone((d) => ({ ...d, [k]: !d[k] }))} aria-pressed={!!done[k]} aria-label={done[k] ? `Mark step ${i + 1} not done` : `Mark step ${i + 1} done`}
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] tabular-nums ${done[k] ? 'border-emerald-400 bg-emerald-400 text-black' : 'border-white/25 text-white/70 hover:border-white/50'}`}>
                      {done[k] ? '✓' : i + 1}
                    </button>
                    <Row it={it} struck={!!done[k]} />
                  </li>
                );
              })}
            </ol>
          ) : (
            <ul className="flex flex-col gap-1">
              {s.items.map((it, i) => (
                <li key={i} className="flex items-start gap-2.5 rounded-lg px-2 py-1.5 hover:bg-white/[0.04]">
                  <span className={`mt-[7px] h-2 w-2 shrink-0 rounded-full ${DOT[it.urgency]}`} title={URGENCY_LABEL[it.urgency]} aria-label={URGENCY_LABEL[it.urgency]} />
                  <Row it={it} />
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
      {!legacy && a.notes && <Markdown text={a.notes} />}
      {actions && !!a.actions?.length && (
        <div className="flex flex-wrap gap-2">
          {a.actions.filter((x) => okHref(x.href)).map((x) => (
            <a key={x.href + x.label} href={x.href} className="rounded-full bg-white text-black px-3 py-1.5 text-xs font-medium hover:bg-white/90" {...ext(x.href)}>{x.label} →</a>
          ))}
        </div>
      )}
      {(!!a.sources?.length || !!a.steps?.length) && (
        <details className="group text-[11px] text-white/50">
          <summary className="cursor-pointer list-none select-none hover:text-white/75">
            {a.sources?.length ? `From: ${a.sources.join(' · ')}` : 'How I checked'}{a.steps?.length ? <span className="ml-1 group-open:hidden">· how I checked ▸</span> : null}
          </summary>
          {!!a.steps?.length && <ul className="mt-1.5 flex flex-col gap-0.5 pl-3">{a.steps.map((s) => <li key={s}>✓ {s}</li>)}</ul>}
        </details>
      )}
    </div>
  );
}

function Row({ it, struck }: { it: Answer['sections'][number]['items'][number]; struck?: boolean }) {
  const body = (
    <>
      <span className={`block text-sm leading-snug ${struck ? 'text-white/40 line-through' : 'text-white/90'}`}>{it.text}{it.href && <span aria-hidden className="ml-1 text-[#ff8a6d]">→</span>}</span>
      {it.detail && <span className={`block text-xs leading-snug ${struck ? 'text-white/30' : 'text-white/55'}`}>{it.detail}</span>}
    </>
  );
  return it.href && okHref(it.href)
    ? <a href={it.href} className="min-w-0 flex-1 hover:[&>span:first-child]:text-white" {...ext(it.href)}>{body}</a>
    : <span className="min-w-0 flex-1">{body}</span>;
}

export const ASK_EVENT = 'naunas:ask';
/** Open the Ask panel from anywhere, optionally with a question typed in. */
export const openAsk = (question?: string) => window.dispatchEvent(new CustomEvent(ASK_EVENT, { detail: question }));

/** Top-bar trigger (desktop). */
export function AskButton() {
  return (
    <button type="button" onClick={() => openAsk()} title="Ask Naunas (Ctrl+J)" aria-label="Ask Naunas"
      className="hidden md:flex items-center gap-2 rounded-xl bg-[#F2613F] px-3.5 py-2 text-sm font-medium text-[#0C0C0C] hover:bg-[#ff7553]">
      <span aria-hidden>✦</span> Ask <kbd className="rounded border border-white/30 px-1 text-[11px] font-mono text-white/80">Ctrl J</kbd>
    </button>
  );
}

// Older sessionStorage turns were { content, actions }.
const asAnswer = (m: Msg): Answer => m.answer ?? { headline: '', sections: [], notes: '', followups: [], actions: m.actions ?? [], sources: [], answer: m.content };
const timeOf = (iso?: string) => (iso ? new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '');

/** The page in words, for the "asking about" chip. */
function pageLabel(p: string): string {
  const seg = p.replace(/^\/dashboard\/?/, '').split('/').filter(Boolean);
  if (!seg.length) return 'Home';
  if (seg[0] === 'outreach' && seg[1] === 'firm') return 'this firm';
  if (seg[0] === 'leads' && seg[1]) return 'this lead';
  if (seg[0] === 'content' && /^p/.test(seg[1] ?? '')) return 'this post';
  if (seg[0] === 'pipeline' && seg[1] === 'proposal') return 'this proposal';
  return seg.map((s) => s.replace(/-/g, ' ')).join(' › ').replace(/^\w/, (c) => c.toUpperCase());
}

export function AskNaunas() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname() ?? '/dashboard';
  // A single post (/dashboard/content/<id>), not the Content tabs.
  const onPost = /^\/dashboard\/content\/(?!performance$|newsletter$|keywords$)[^/]+$/.test(pathname);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(-1);
  const end = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => { try { const s = sessionStorage.getItem(KEY); if (s) setMsgs(JSON.parse(s)); } catch { /* no storage */ } }, []);
  useEffect(() => { try { sessionStorage.setItem(KEY, JSON.stringify(msgs.slice(-20))); } catch { /* no storage */ } end.current?.scrollIntoView({ block: 'end' }); }, [msgs, open, busy]);
  useEffect(() => { if (open) input.current?.focus(); }, [open]);
  useEffect(() => {
    if (!busy) return;
    setElapsed(0);
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [busy]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
      if (e.key.toLowerCase() === 'j' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); setOpen((o) => !o); }
    };
    // The top-bar button and the command palette open the panel with this event.
    const onOpen = (e: Event) => { setOpen(true); const q = (e as CustomEvent<string | undefined>).detail; if (q) setText(q); };
    window.addEventListener('keydown', onKey);
    window.addEventListener(ASK_EVENT, onOpen);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener(ASK_EVENT, onOpen); };
  }, []);

  async function run(next: Msg[]) {
    setMsgs(next); setText(''); setBusy(true); setError('');
    const history = next.map((m) => ({ role: m.role, content: m.role === 'assistant' ? answerText(asAnswer(m)) : m.content }));
    const r = await askNaunas(history, pathname).catch((e) => ({ error: String(e) } as { error: string; answer?: Answer }));
    setBusy(false);
    if (r.error || !r.answer) { setError(r.error ?? 'No answer came back. Try again.'); return; }
    setMsgs([...next, { role: 'assistant', content: r.answer.headline, answer: r.answer, at: new Date().toISOString() }]);
  }
  function send(q: string) {
    const question = q.trim();
    if (!question || busy) return;
    run([...msgs, { role: 'user', content: question, at: new Date().toISOString(), page: pathname }]);
  }
  /** Ask the last question again (drops the answer it replaces). */
  function retry() {
    if (busy) return;
    const lastUser = msgs.map((m) => m.role).lastIndexOf('user');
    if (lastUser >= 0) run(msgs.slice(0, lastUser + 1));
  }
  async function copy(i: number, m: Msg) {
    try { await navigator.clipboard.writeText(answerText(asAnswer(m))); setCopied(i); setTimeout(() => setCopied(-1), 1500); } catch { /* clipboard blocked */ }
  }
  const lastAssistant = msgs.map((m) => m.role).lastIndexOf('assistant');

  return (
    <>
      {/* Phones only: on desktop the button sits in the top bar (AskButton) so it never covers content.
          Hidden on a single post, where the sticky Schedule bar lives in the same corner. */}
      {!onPost && <button onClick={() => setOpen(true)} aria-label="Ask Naunas"
        className={`md:hidden fixed right-4 bottom-24 z-30 flex items-center gap-2 rounded-full bg-[#F2613F] px-4 py-3 text-sm font-medium text-[#0C0C0C] shadow-lg shadow-black/40 hover:bg-[#ff7553] ${open ? 'hidden' : ''}`}>
        <span aria-hidden>✦</span> Ask
      </button>}
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-label="Ask Naunas">
          <button className="absolute inset-0 bg-black/50" aria-label="Close" onClick={() => setOpen(false)} />
          <div className="relative flex h-full w-full sm:w-[460px] flex-col border-l border-white/10 bg-[#121212]" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
            <div className="flex items-center justify-between gap-2 border-b border-white/[0.07] px-4 py-3">
              <p className="font-medium">Ask Naunas <span className="hidden sm:inline text-xs font-normal text-white/60">· reads everything, changes nothing</span></p>
              <div className="flex items-center gap-3">
                {msgs.length > 0 && <button onClick={() => { setMsgs([]); setError(''); }} className="text-xs text-white/60 hover:text-white whitespace-nowrap">New chat</button>}
                <button onClick={() => setOpen(false)} className="text-white/60 hover:text-white text-lg leading-none" aria-label="Close panel">×</button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-5" aria-live="polite">
              {!msgs.length && (
                <div className="flex flex-col gap-3">
                  <p className="text-sm text-white/60">Ask about outreach, deals, clients, content, what broke or what’s left to build. Answers come from the dashboard, HubSpot, the activity log and your vault, with links.</p>
                  <div className="flex flex-wrap gap-2">
                    {STARTERS.map((s) => <button key={s} onClick={() => send(s)} className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-white/75 hover:border-white/30 hover:text-white">{s}</button>)}
                  </div>
                </div>
              )}
              {msgs.map((m, i) => m.role === 'user' ? (
                <div key={i} className="self-end flex max-w-[85%] flex-col items-end gap-1">
                  <p className="rounded-2xl rounded-br-md bg-white/[0.08] px-3.5 py-2 text-sm">{m.content}</p>
                  {m.page && m.page !== '/dashboard' && <span className="text-[10px] text-white/40">on {pageLabel(m.page)}</span>}
                </div>
              ) : (
                <div key={i} className="flex flex-col gap-2.5 border-l-2 border-[#F2613F]/40 pl-3">
                  <AnswerView a={asAnswer(m)} />
                  <div className="flex items-center gap-3 text-[11px] text-white/45">
                    {m.at && <span>{timeOf(m.at)}</span>}
                    <button type="button" onClick={() => copy(i, m)} className="hover:text-white">{copied === i ? 'Copied ✓' : 'Copy'}</button>
                    {i === lastAssistant && <button type="button" onClick={retry} disabled={busy} className="hover:text-white disabled:opacity-40">Retry ↻</button>}
                  </div>
                  {i === lastAssistant && !busy && !!m.answer?.followups?.length && (
                    <div className="flex flex-wrap gap-2">
                      {m.answer.followups.map((f) => <button key={f} onClick={() => send(f)} className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-white/75 hover:border-white/30 hover:text-white">{f}</button>)}
                    </div>
                  )}
                </div>
              ))}
              {busy && (
                <div className="flex items-center gap-2 text-xs text-white/60" role="status">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-[#F2613F]" aria-hidden />
                  {elapsed < 4 ? 'Reading your dashboard…' : elapsed < 12 ? `Looking further (HubSpot, activity, vault)… ${elapsed}s` : `Still working, big question… ${elapsed}s`}
                </div>
              )}
              {error && (
                <div className="flex items-center gap-3 text-xs text-rose-300">
                  <span>{error}</span>
                  <button type="button" onClick={retry} className="underline hover:text-white">Try again</button>
                </div>
              )}
              <div ref={end} />
            </div>
            <form onSubmit={(e) => { e.preventDefault(); send(text); }} className="border-t border-white/[0.07] p-3 flex flex-col gap-1.5">
              {pathname !== '/dashboard' && <span className="text-[10px] text-white/45">Asking about: {pageLabel(pathname)}</span>}
              <div className="flex gap-2">
                <input ref={input} value={text} onChange={(e) => setText(e.target.value)} placeholder="What am I missing this week?" aria-label="Your question" maxLength={1000}
                  className="flex-1 min-w-0 rounded-xl bg-white/[0.05] border border-white/10 px-3 py-2.5 text-[16px] sm:text-sm text-white placeholder:text-white/50" />
                <button disabled={busy || !text.trim()} className="rounded-xl bg-[#F2613F] px-4 text-sm font-medium text-[#0C0C0C] disabled:opacity-40">Ask</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
