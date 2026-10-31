'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { upload } from '@vercel/blob/client';
import {
  saveContentPost, checkContentPost, publishContentNow, scheduleContent, cancelContentSchedule,
  retryContentChannel, discardHeldTikTok, deleteContentDraft, adaptContent, copyAsTextPost,
} from '../../../actions';
import type { ContentPost, ChannelKey, Issue, Media } from '@/lib/content';
import { FUNNEL } from '@/config/funnel';
import { CopyButton } from '@/components/dashboard/client';
import { nextAt } from '@/lib/slots';

type Campaign = { id: string; name: string; keywords: string[] };
type Creator = { nickname?: string; username?: string; avatar?: string; privacyOptions: string[]; commentDisabled: boolean; duetDisabled: boolean; stitchDisabled: boolean; maxSec: number } | null;
type Ctx = {
  campaigns: Campaign[]; creator: Creator; linkedinName?: string; linkedinDays: number | null;
  tiktokApproved: boolean; qstash: boolean; links: Record<ChannelKey, string>; quickTimes: string[]; usTz: string; firstComment: boolean; ai: boolean;
  /** Short-lived signed link to the stored video/image, so it can be watched here before scheduling. */
  previewUrl?: string;
};

const LABEL: Record<ChannelKey, string> = { linkedin: 'LinkedIn', instagram: 'Instagram', tiktok: 'TikTok' };
const LIMIT: Record<ChannelKey, number> = { linkedin: 3000, instagram: 2200, tiktok: 2200 };
const PRIVACY: Record<string, string> = { PUBLIC_TO_EVERYONE: 'Everyone', MUTUAL_FOLLOW_FRIENDS: 'Friends', FOLLOWER_OF_CREATOR: 'Followers', SELF_ONLY: 'Only me' };
const STATUS: Record<string, { label: string; cls: string }> = {
  off: { label: 'Off', cls: 'bg-white/[0.06] text-white/60' }, ready: { label: 'Ready', cls: 'bg-white/[0.08] text-white/70' },
  scheduled: { label: 'Scheduled', cls: 'bg-sky-400/15 text-sky-200' }, publishing: { label: 'Publishing…', cls: 'bg-amber-400/15 text-amber-200' },
  posted: { label: 'Posted', cls: 'bg-emerald-400/15 text-emerald-300' }, failed: { label: 'Failed', cls: 'bg-rose-400/15 text-rose-300' },
  held: { label: 'Held for TikTok approval', cls: 'bg-amber-400/15 text-amber-200' },
};
const field = 'w-full rounded-lg bg-white/[0.04] border border-white/10 px-3 py-2 text-sm outline-none focus:border-white/30';
const box = 'size-4 accent-[#F2613F] disabled:opacity-30';

// Always a fixed zone: the server renders this too, so the browser's own zone would mismatch on hydration.
const fmt = (d: Date, tz: string = FUNNEL.ownerTz) => d.toLocaleString('en-GB', { timeZone: tz, weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const localInput = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);

export function PostEditor({ initial, ctx }: { initial: ContentPost; ctx: Ctx }) {
  const [post, setPost] = useState(initial);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [saved, setSaved] = useState<'saved' | 'saving' | 'dirty' | 'error'>('saved');
  const [msg, setMsg] = useState<{ tone: 'good' | 'bad'; text: string } | null>(null);
  const [busy, startBusy] = useTransition();
  const [progress, setProgress] = useState<number | null>(null);
  const [preview, setPreview] = useState<{ url: string; kind: Media['kind'] } | null>(null);
  const [when, setWhen] = useState('');
  const [picker, setPicker] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const first = useRef(true);

  const locked = post.status === 'publishing';
  const ran = (['linkedin', 'instagram', 'tiktok'] as ChannelKey[]).some((c) => ['posted', 'failed', 'held'].includes(post.channels[c].status));

  // Autosave 1s after the last edit, then refresh the pre-flight list.
  useEffect(() => {
    if (first.current) { first.current = false; checkContentPost(post.id).then((r) => setIssues(r.issues)); return; }
    setSaved('dirty');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setSaved('saving');
      const r = await saveContentPost({ id: post.id, master: post.master, channels: post.channels, flags: post.flags, newsletterBlurb: post.newsletterBlurb ?? '' });
      if (r.error) { setSaved('error'); setMsg({ tone: 'bad', text: r.error }); return; }
      setSaved('saved');
      setIssues((await checkContentPost(post.id)).issues);
    }, 1000);
    return () => { if (timer.current) clearTimeout(timer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post.master, post.channels, post.flags, post.newsletterBlurb]);

  // ---- AI (Adapt): drafts every channel from the idea + transcript; Naufal edits before publishing.
  const [hooks, setHooks] = useState<Partial<Record<ChannelKey, string[]>>>({});
  const [aiNote, setAiNote] = useState<{ icp: string; unsupported: string[] } | null>(null);
  const [adapting, setAdapting] = useState(false);
  const hasText = !!(post.channels.linkedin.text || post.channels.instagram.caption || post.channels.tiktok.caption);

  async function runAdapt() {
    if (hasText && !window.confirm('Replace the current channel texts with fresh AI drafts?')) return;
    setAdapting(true); setMsg(null);
    // Make sure the server has the latest idea/transcript before it writes from them.
    await saveContentPost({ id: post.id, master: post.master, channels: post.channels, flags: post.flags, newsletterBlurb: post.newsletterBlurb ?? '' });
    const r = await adaptContent(post.id);
    setAdapting(false);
    if (r.error || !r.result) { setMsg({ tone: 'bad', text: r.error ?? 'Adapt failed' }); return; }
    const a = r.result;
    const none = !post.channels.linkedin.enabled && !post.channels.instagram.enabled && !post.channels.tiktok.enabled;
    setPost((p) => ({
      ...p,
      newsletterBlurb: a.newsletterBlurb,
      channels: {
        linkedin: { ...p.channels.linkedin, text: a.linkedin.text, firstComment: a.linkedin.firstComment, ...(none ? { enabled: true } : {}) },
        instagram: { ...p.channels.instagram, caption: a.instagram.caption, ...(none && p.master.media ? { enabled: true } : {}) },
        tiktok: { ...p.channels.tiktok, caption: a.tiktok.caption, ...(none && p.master.media?.kind === 'video' ? { enabled: true } : {}) },
      },
    }));
    setHooks({ linkedin: a.linkedin.hooks, instagram: a.instagram.hooks, tiktok: a.tiktok.hooks });
    setAiNote({ icp: a.icpNote, unsupported: a.unsupported });
    setMsg({ tone: 'good', text: 'Drafted all three. Read them, swap hooks if you like, then publish.' });
  }

  /** Swap the opening line (up to the first blank line) for another hook. */
  const useHook = (c: ChannelKey, hook: string) => {
    const key = c === 'linkedin' ? 'text' : 'caption';
    const cur = (post.channels[c] as unknown as Record<string, string>)[key] ?? '';
    const rest = cur.includes('\n') ? cur.slice(cur.indexOf('\n')) : '';
    setCh(c, { [key]: `${hook}${rest}` } as never);
  };

  async function readTranscript(f?: File) {
    if (!f) return;
    const raw = await f.text();
    // Strip SRT/VTT numbering and timestamps, keep the words.
    const text = raw.replace(/^WEBVTT.*$/m, '').split(/\r?\n/).filter((l) => l.trim() && !/^\d+$/.test(l.trim()) && !/-->/.test(l)).join(' ').replace(/\s+/g, ' ').trim();
    setMaster({ transcript: text });
  }

  const setCh = <K extends ChannelKey>(c: K, patch: Partial<ContentPost['channels'][K]>) =>
    setPost((p) => ({ ...p, channels: { ...p.channels, [c]: { ...p.channels[c], ...patch } } }));
  const setMaster = (patch: Partial<ContentPost['master']>) => setPost((p) => ({ ...p, master: { ...p.master, ...patch } }));

  async function pick(f?: File) {
    if (!f) return;
    const kind: Media['kind'] = f.type.startsWith('video/') ? 'video' : 'image';
    const url = URL.createObjectURL(f);
    setPreview({ url, kind });
    const dims = await new Promise<{ w?: number; h?: number; d?: number }>((res) => {
      if (kind === 'video') { const v = document.createElement('video'); v.preload = 'metadata'; v.onloadedmetadata = () => res({ w: v.videoWidth, h: v.videoHeight, d: v.duration }); v.onerror = () => res({}); v.src = url; }
      else { const i = new Image(); i.onload = () => res({ w: i.naturalWidth, h: i.naturalHeight }); i.onerror = () => res({}); i.src = url; }
    });
    try {
      setProgress(0);
      const name = f.name.replace(/[^\w.-]+/g, '-').slice(-60) || 'media';
      const r = await upload(`content/media/${name}`, f, {
        access: 'private', handleUploadUrl: '/dashboard/media/upload', multipart: f.size > 20 * 1024 * 1024,
        onUploadProgress: (p) => setProgress(Math.round(p.percentage)),
      });
      setMaster({ media: { path: r.pathname, kind, sizeBytes: f.size, name: f.name, width: dims.w, height: dims.h, durationSec: dims.d ? Math.round(dims.d * 10) / 10 : undefined } });
      if (kind === 'image') setCh('tiktok', { enabled: false });
    } catch (err) {
      setMsg({ tone: 'bad', text: err instanceof Error ? err.message : 'Upload failed' });
    } finally { setProgress(null); }
  }

  const blocking = issues.filter((i) => i.level === 'block');
  const issuesFor = (c: ChannelKey | 'post') => issues.filter((i) => i.ch === c);
  const warns = issues.filter((i) => i.level === 'warn');
  const unacked = warns.filter((w) => !post.flags.includes(w.text));
  const canGo = !locked && saved === 'saved' && !blocking.length && !unacked.length && progress === null;

  const act = (fn: () => Promise<{ error?: string; post?: ContentPost; issues?: Issue[] }>, ok: string) => startBusy(async () => {
    setMsg(null);
    const r = await fn();
    if (r.issues) setIssues(r.issues);
    if (r.post) setPost(r.post);
    setMsg(r.error ? { tone: 'bad', text: r.error } : { tone: 'good', text: ok });
  });

  const quickAll = useMemo(() => ctx.quickTimes.map((t) => nextAt(t, ctx.usTz)), [ctx.quickTimes, ctx.usTz]);
  const kw = ctx.campaigns.find((c) => c.id === post.channels.instagram.campaignId)?.keywords[0] ?? ctx.campaigns[0]?.keywords[0] ?? 'LEAK';
  const m = post.master.media;
  // From the studio drop: the next free day, offered as one click while it's still ahead and nothing has run.
  const suggested = ctx.qstash && !ran && post.suggestedFor && Date.parse(post.suggestedFor) > Date.now() + 2 * 60_000 ? new Date(post.suggestedFor) : null;
  const quick = quickAll.filter((d) => !suggested || Math.abs(d.getTime() - suggested.getTime()) > 60_000);
  const toFix = blocking.length + unacked.length;
  const goToFix = () => document.querySelector('[data-has-issue="true"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });

  return (
    <div className="flex flex-col gap-4">
      {post.source === 'studio' && !ran && post.status !== 'scheduled' && (
        <div className="rounded-2xl border border-[#F2613F]/30 bg-[#F2613F]/[0.06] px-4 py-3 text-sm flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="rounded-full bg-[#F2613F]/20 px-2 py-0.5 text-[11px] font-medium text-[#ffb19e]">From the studio</span>
          <span className="text-white/80">Watch the video, read the three captions, then {suggested ? <>press <b>Schedule at suggested time</b> below.</> : 'pick a time below.'}</span>
        </div>
      )}
      {/* Master */}
      <div className="grid lg:grid-cols-[240px_1fr] gap-4">
        <div className="flex flex-col gap-2 w-48 mx-auto lg:w-auto lg:mx-0">
          {(() => {
            const src = preview?.url ?? (m ? ctx.previewUrl : undefined);
            const kind = preview?.kind ?? m?.kind;
            if (src) return (
              <div className="relative aspect-[9/16] rounded-2xl border border-white/10 bg-black overflow-hidden">
                {kind === 'image'
                  ? <img src={src} alt="The post's image" className="absolute inset-0 size-full object-contain" />
                  : <video src={src} controls playsInline preload="metadata" aria-label="Watch the video" className="absolute inset-0 size-full object-contain" />}
              </div>
            );
            return (
              <label className={`relative aspect-[9/16] rounded-2xl border border-dashed border-white/15 bg-white/[0.03] grid place-items-center ${locked ? '' : 'cursor-pointer hover:border-white/30'}`}>
                <span className="text-xs text-white/60 text-center px-4">{m ? (m.name ?? 'Media uploaded') : <>Add a video or image<br /><span className="text-white/55">Vertical 9:16 works everywhere</span></>}</span>
                {!locked && <input type="file" accept="video/mp4,video/quicktime,image/jpeg,image/png" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />}
              </label>
            );
          })()}
          {(m || preview) && !locked && (
            <label className="self-center text-xs text-white/60 hover:text-white cursor-pointer py-1">Replace {m?.kind === 'image' ? 'image' : 'video'}
              <input type="file" accept="video/mp4,video/quicktime,image/jpeg,image/png" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
            </label>
          )}
        </div>
        <div className="flex flex-col gap-3 min-w-0">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-white/65">The idea (your notes or master caption; each channel gets its own version below)</span>
            <textarea rows={6} disabled={locked} value={post.master.idea} onChange={(e) => setMaster({ idea: e.target.value })} placeholder="What’s this post about? The point, the story, the call to action." className={field} />
          </label>
          <details className="rounded-lg border border-white/[0.08] px-3 py-2" open={!!post.master.transcript}>
            <summary className="text-xs text-white/55 cursor-pointer">Transcript (optional: the AI writes from what you actually said){post.master.transcript ? ` · ${post.master.transcript.split(/\s+/).length} words` : ''}</summary>
            <div className="flex flex-col gap-2 mt-2">
              <textarea rows={4} disabled={locked} value={post.master.transcript ?? ''} onChange={(e) => setMaster({ transcript: e.target.value })} placeholder="Paste the transcript, or upload the .srt / .txt from the studio pipeline." className={field} />
              {!locked && <label className="self-start text-xs text-white/55 hover:text-white cursor-pointer">Upload .srt / .vtt / .txt<input type="file" accept=".srt,.vtt,.txt,text/plain" className="sr-only" onChange={(e) => readTranscript(e.target.files?.[0])} /></label>}
            </div>
          </details>
          <div className="flex flex-wrap items-center gap-3">
            {ctx.ai
              ? <button type="button" disabled={locked || adapting} onClick={runAdapt} className="rounded-lg border border-[#F2613F]/50 bg-[#F2613F]/10 px-3.5 py-1.5 text-sm text-[#ffb19e] hover:bg-[#F2613F]/20 disabled:opacity-40">{adapting ? 'Writing…' : '✨ Write all 3 with AI'}</button>
              : <span className="text-xs text-white/55">AI drafting turns on with OPENAI_API_KEY.</span>}
            {aiNote?.icp && <span className="text-xs text-white/65">🎯 {aiNote.icp}</span>}
          </div>
          {aiNote && aiNote.unsupported.length > 0 && (
            <p className="text-xs text-amber-200/90">⚠ Check before posting (not backed by your idea/transcript): {aiNote.unsupported.join(' · ')}</p>
          )}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/60">
            {progress !== null && <span>Uploading… {progress}%</span>}
            {m && <span>{m.kind === 'video' ? `Video · ${m.durationSec ?? '?'}s` : 'Image'}{m.width ? ` · ${m.width}×${m.height}` : ''}{m.width && m.height && Math.abs(m.height / m.width - 16 / 9) < 0.05 ? ' · 9:16 ✓' : ''}</span>}
            <span>{saved === 'saving' ? 'Saving…' : saved === 'dirty' ? 'Unsaved' : saved === 'error' ? 'Not saved' : 'Saved'}</span>
          </div>
        </div>
      </div>

      {/* Channels */}
      <div className="grid lg:grid-cols-3 gap-4">
        {(['linkedin', 'instagram', 'tiktok'] as ChannelKey[]).map((c) => {
          const ch = post.channels[c];
          const text = c === 'linkedin' ? post.channels.linkedin.text : c === 'instagram' ? post.channels.instagram.caption : post.channels.tiktok.caption;
          const chLocked = locked || ch.status === 'posted' || ch.status === 'publishing';
          const mine = ch.enabled ? issuesFor(c) : [];
          const cardBlock = mine.filter((i) => i.level === 'block');
          const cardWarn = mine.filter((i) => i.level === 'warn' && !post.flags.includes(i.text));
          // "Ready" only when it can actually go: a channel that's blocked says why in its badge.
          const st = ch.status === 'ready' && cardBlock.length
            ? { label: c === 'linkedin' && ctx.linkedinDays == null ? 'Not connected' : 'Needs a fix', cls: 'bg-rose-400/15 text-rose-300' }
            : ch.status === 'ready' && cardWarn.length ? { label: 'Check first', cls: 'bg-amber-400/15 text-amber-200' }
            : STATUS[ch.status] ?? STATUS.off;
          const disabledTt = c === 'tiktok' && m?.kind === 'image';
          return (
            <div key={c} data-has-issue={cardBlock.length + cardWarn.length > 0 ? 'true' : undefined} className={`rounded-2xl border p-4 flex flex-col gap-3 min-w-0 ${ch.enabled ? 'border-white/15 bg-[#141414]' : 'border-white/[0.06] bg-[#101010]'}`}>
              <div className="flex items-center justify-between gap-2">
                <label className="flex items-center gap-2 font-medium">
                  <input type="checkbox" className={box} checked={ch.enabled} disabled={chLocked || disabledTt} onChange={(e) => setCh(c, { enabled: e.target.checked } as never)} />
                  {LABEL[c]}
                </label>
                <span className={`text-[11px] px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
              </div>
              {disabledTt && <p className="text-xs text-white/60">TikTok posts need a video.</p>}

              {ch.enabled && (
                <>
                  {c === 'linkedin' && (ctx.linkedinDays == null
                    ? <p className="text-xs text-rose-300">LinkedIn isn’t connected. <a href="/dashboard/linkedin" className="underline hover:text-white">Connect it</a></p>
                    : <p className="text-xs text-white/60">Posting as {ctx.linkedinName ?? '…'} · {ctx.linkedinDays} days left on the connection</p>)}
                  {mine.filter((i) => !(c === 'linkedin' && ctx.linkedinDays == null && /connected/i.test(i.text))).map((i) => i.level === 'block'
                    ? <p key={i.text} className="text-xs text-rose-300">✕ {i.text}</p>
                    : (
                      <label key={i.text} className="flex items-start gap-2 text-xs text-amber-200/90">
                        <input type="checkbox" className={`${box} mt-0.5`} disabled={locked} checked={post.flags.includes(i.text)}
                          onChange={(e) => setPost((p) => ({ ...p, flags: e.target.checked ? [...p.flags, i.text] : p.flags.filter((f) => f !== i.text) }))} />
                        <span>{i.text} <span className="text-white/55">Tick if it’s fine.</span></span>
                      </label>
                    ))}
                  {c === 'tiktok' && ctx.creator && <p className="text-xs text-white/60">Posting to {ctx.creator.nickname ?? ctx.creator.username}{ctx.creator.username ? ` @${ctx.creator.username}` : ''}</p>}

                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs text-white/65 flex justify-between"><span>{c === 'linkedin' ? 'Post' : 'Caption'}</span><span className={text.length > LIMIT[c] ? 'text-rose-300' : ''}>{text.length}/{LIMIT[c].toLocaleString('en-GB')}</span></span>
                    <textarea rows={c === 'linkedin' ? 10 : 7} disabled={chLocked} value={text} className={`${field} [field-sizing:content] min-h-40 max-h-[70vh]`}
                      placeholder={c === 'linkedin' ? 'Hook line.\n\nShort paragraphs. 3–5 hashtags at the end.' : c === 'instagram' ? `Caption… then: Comment ${kw} and I’ll send it to you.` : 'Short caption #hashtags'}
                      onChange={(e) => setCh(c, (c === 'linkedin' ? { text: e.target.value } : { caption: e.target.value }) as never)} />
                  </label>

                  {c === 'linkedin' && (
                    <>
                      <select aria-label="Who can see the LinkedIn post" disabled={chLocked} value={post.channels.linkedin.visibility} onChange={(e) => setCh('linkedin', { visibility: e.target.value as 'PUBLIC' | 'CONNECTIONS' })} className={`${field} [&>option]:bg-[#161616]`}>
                        <option value="PUBLIC">Anyone can see it</option><option value="CONNECTIONS">Connections only</option>
                      </select>
                      <label className="flex flex-col gap-1.5">
                        <span className="text-xs text-white/65">First comment (your link goes here; {'{link}'} = this post’s tracked link)</span>
                        <textarea rows={2} disabled={chLocked} value={post.channels.linkedin.firstComment} onChange={(e) => setCh('linkedin', { firstComment: e.target.value })} placeholder={ctx.firstComment ? 'Free Leak Map here: {link}' : ''} className={field} />
                      </label>
                    </>
                  )}

                  {c === 'instagram' && (
                    <>
                      <select aria-label="Instagram keyword campaign" disabled={chLocked} value={post.channels.instagram.campaignId ?? ''} onChange={(e) => setCh('instagram', { campaignId: e.target.value || undefined })} className={`${field} [&>option]:bg-[#161616]`}>
                        <option value="">Keyword campaign: default (all posts)</option>
                        {ctx.campaigns.map((k) => <option key={k.id} value={k.id}>{k.name} · {k.keywords.join(', ')}</option>)}
                      </select>
                      {!chLocked && !new RegExp(`\\b${kw}\\b`, 'i').test(post.channels.instagram.caption) && (
                        <button type="button" onClick={() => setCh('instagram', { caption: `${post.channels.instagram.caption.trimEnd()}\n\nComment ${kw} and I’ll send it to you.`.trimStart() })} className="self-start text-xs text-[#ff8a6d] hover:text-white">+ Add “Comment {kw}” call to action</button>
                      )}
                    </>
                  )}

                  {c === 'tiktok' && (
                    <>
                      <select aria-label="Who can see the TikTok post" disabled={chLocked} value={post.channels.tiktok.privacy} onChange={(e) => setCh('tiktok', { privacy: e.target.value })} className={`${field} [&>option]:bg-[#161616]`}>
                        <option value="" disabled>Who can see this video…</option>
                        {(ctx.tiktokApproved && ctx.creator ? ctx.creator.privacyOptions : Object.keys(PRIVACY)).map((p) => (
                          <option key={p} value={p} disabled={post.channels.tiktok.brandedContent && p === 'SELF_ONLY'}>{PRIVACY[p] ?? p}</option>
                        ))}
                      </select>
                      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm">
                        {([['allowComment', 'Comment', ctx.creator?.commentDisabled], ['allowDuet', 'Duet', ctx.creator?.duetDisabled], ['allowStitch', 'Stitch', ctx.creator?.stitchDisabled]] as const).map(([k, l, off]) => (
                          <label key={k} className={`flex items-center gap-1.5 ${off ? 'text-white/55' : ''}`}>
                            <input type="checkbox" className={box} disabled={chLocked || !!off} checked={post.channels.tiktok[k]} onChange={(e) => setCh('tiktok', { [k]: e.target.checked } as never)} />Allow {l}
                          </label>
                        ))}
                      </div>
                      <div className="rounded-lg border border-white/[0.08] p-2.5 flex flex-col gap-1.5 text-sm">
                        <label className="flex items-center gap-2"><input type="checkbox" className={box} disabled={chLocked} checked={post.channels.tiktok.yourBrand} onChange={(e) => setCh('tiktok', { yourBrand: e.target.checked })} />Promotes my own business <span className="text-xs text-white/60">(“Promotional content”)</span></label>
                        <label className="flex items-center gap-2"><input type="checkbox" className={box} disabled={chLocked} checked={post.channels.tiktok.brandedContent} onChange={(e) => setCh('tiktok', { brandedContent: e.target.checked, ...(e.target.checked && post.channels.tiktok.privacy === 'SELF_ONLY' ? { privacy: '' } : {}) })} />Paid partnership <span className="text-xs text-white/60">(“Paid partnership”)</span></label>
                      </div>
                      <p className="text-[11px] text-white/60">By posting, you agree to TikTok’s {post.channels.tiktok.brandedContent && <><a className="underline" href="https://www.tiktok.com/legal/page/global/bc-policy/en" target="_blank" rel="noopener noreferrer">Branded Content Policy</a> and </>}<a className="underline" href="https://www.tiktok.com/legal/page/global/music-usage-confirmation/en" target="_blank" rel="noopener noreferrer">Music Usage Confirmation</a>.</p>
                    </>
                  )}

                  {!chLocked && hooks[c]?.length ? (
                    <div className="flex flex-col gap-1">
                      <span className="text-[11px] text-white/60">Other hooks (tap to use):</span>
                      {hooks[c]!.map((h) => (
                        <button key={h} type="button" onClick={() => useHook(c, h)} className="text-left text-xs rounded-md bg-white/[0.04] hover:bg-white/[0.09] px-2 py-1.5 text-white/75">{h}</button>
                      ))}
                    </div>
                  ) : null}
                  {c === 'linkedin' && post.channels.linkedin.text && (
                    <button type="button" disabled={busy} onClick={() => startBusy(async () => { const r = await copyAsTextPost(post.id); if (r.id) window.location.href = `/dashboard/content/${r.id}`; else setMsg({ tone: 'bad', text: r.error ?? 'Could not copy' }); })}
                      className="self-start text-[11px] text-white/60 hover:text-white">Repurpose: copy as a text-only LinkedIn post →</button>
                  )}
                  <div className="flex items-center gap-2 text-[11px] text-white/55"><span>Tracked link</span><CopyButton text={ctx.links[c]} label="Copy link" /></div>
                </>
              )}

              {(ch.url || ch.error || ch.status === 'failed' || ch.status === 'held') && (
                <div className="mt-auto pt-2 border-t border-white/[0.06] flex flex-col gap-1.5 text-xs">
                  {ch.url && <a href={ch.url} target="_blank" rel="noopener noreferrer" className="text-emerald-300 hover:text-white">Open on {LABEL[c]} ↗</a>}
                  {ch.error && <p className="text-rose-300/90">{ch.error}</p>}
                  {ch.status === 'failed' && <button disabled={busy} onClick={() => act(() => retryContentChannel(post.id, c), `${LABEL[c]}: retried.`)} className="self-start text-[#ff8a6d] hover:text-white disabled:opacity-40">Retry {LABEL[c]}</button>}
                  {ch.status === 'held' && <button disabled={busy} onClick={() => act(() => discardHeldTikTok(post.id), 'Removed from the TikTok queue.')} className="self-start text-white/60 hover:text-rose-300 disabled:opacity-40">Don’t send to TikTok</button>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Newsletter */}
      <details className="rounded-2xl border border-white/[0.08] bg-[#121212] px-4 py-3" open={!!post.newsletterBlurb}>
        <summary className="text-sm font-medium cursor-pointer">Newsletter blurb <span className="text-xs font-normal text-white/60">(goes into Monday’s draft if this post makes the week’s list)</span></summary>
        <textarea rows={3} disabled={locked} value={post.newsletterBlurb ?? ''} onChange={(e) => setPost((p) => ({ ...p, newsletterBlurb: e.target.value }))}
          placeholder="2–3 sentences for the weekly email. The AI writes one for you." className={`${field} mt-2`} />
      </details>

      {/* Pre-flight */}
      {issuesFor('post').length > 0 && (
        <div data-has-issue="true" className="rounded-2xl border border-white/[0.08] bg-[#121212] p-4 flex flex-col gap-2">
          <p className="text-sm font-medium">Before it goes out</p>
          {issuesFor('post').filter((i) => i.level === 'block').map((i) => <p key={i.text} className="text-sm text-rose-300">✕ <span className="text-white/60">{i.ch === 'post' ? '' : `${LABEL[i.ch as ChannelKey]}: `}</span>{i.text}</p>)}
          {issuesFor('post').filter((i) => i.level === 'warn').map((i) => (
            <label key={i.text} className="flex items-start gap-2 text-sm text-amber-200/90">
              <input type="checkbox" className={`${box} mt-0.5`} disabled={locked} checked={post.flags.includes(i.text)}
                onChange={(e) => setPost((p) => ({ ...p, flags: e.target.checked ? [...p.flags, i.text] : p.flags.filter((f) => f !== i.text) }))} />
              <span><span className="text-white/60">{i.ch === 'post' ? '' : `${LABEL[i.ch as ChannelKey]}: `}</span>{i.text} <span className="text-white/55">(tick to go ahead anyway)</span></span>
            </label>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="sticky bottom-[calc(env(safe-area-inset-bottom,0px)+64px)] md:bottom-4 z-10 rounded-2xl border border-white/10 bg-[#0f0f0f]/95 backdrop-blur p-2.5 md:p-3 flex flex-wrap items-center gap-2 md:gap-3">
        {post.status === 'scheduled' && post.scheduledFor ? (
          <>
            <span className="text-sm">Scheduled for <b>{fmt(new Date(post.scheduledFor))}</b> <span className="text-white/60">({fmt(new Date(post.scheduledFor), ctx.usTz)} US East)</span></span>
            {Date.parse(post.scheduledFor) < Date.now() - 10 * 60_000 && <span className="text-xs text-rose-300">Overdue: the schedule didn’t fire.</span>}
            <button disabled={busy} onClick={() => act(() => publishContentNow(post.id), 'Published.')} className="rounded-lg border border-white/15 px-3 py-1.5 text-sm hover:border-white/40 disabled:opacity-40">Publish now instead</button>
            <button disabled={busy} onClick={() => act(() => cancelContentSchedule(post.id), 'Schedule cancelled.')} className="text-sm text-white/55 hover:text-rose-300 disabled:opacity-40">Cancel schedule</button>
          </>
        ) : (
          <>
            {toFix > 0 && (
              <button type="button" onClick={goToFix} className="rounded-lg bg-rose-400/15 px-3 py-2 text-sm text-rose-200 hover:bg-rose-400/25">
                {toFix} thing{toFix > 1 ? 's' : ''} to fix ↑
              </button>
            )}
            {suggested && (
              <button disabled={!canGo || busy} onClick={() => act(() => scheduleContent(post.id, suggested.toISOString()), 'Scheduled.')}
                className="rounded-lg bg-[#F2613F] px-4 py-2 text-sm font-medium text-[#0C0C0C] hover:bg-[#ff7553] disabled:opacity-35 disabled:cursor-not-allowed">
                <span className="md:hidden">Schedule · {fmt(suggested)}</span>
                <span className="hidden md:inline">Schedule at suggested time · {fmt(suggested)} <span className="font-normal">({fmt(suggested, ctx.usTz)} ET)</span></span>
              </button>
            )}
            <button disabled={!canGo || busy} onClick={() => act(() => publishContentNow(post.id), 'Done. Results are on each channel above.')}
              className={suggested ? 'rounded-lg border border-white/15 px-3 py-1.5 text-sm hover:border-white/40 disabled:opacity-35 disabled:cursor-not-allowed'
                : 'rounded-lg bg-[#F2613F] px-4 py-2 text-sm font-medium text-[#0C0C0C] hover:bg-[#ff7553] disabled:opacity-35 disabled:cursor-not-allowed'}>
              {busy ? 'Working…' : ran ? 'Publish remaining' : 'Publish now'}
            </button>
            {ctx.qstash && (
              <button type="button" aria-expanded={picker} onClick={() => setPicker((v) => !v)} className="rounded-lg px-2.5 py-2 text-sm text-white/70 hover:text-white">
                {suggested ? 'Other time' : 'Schedule'} {picker ? '▴' : '▾'}
              </button>
            )}
            {ctx.qstash ? picker && (
              <div className="w-full flex flex-wrap items-center gap-2 border-t border-white/[0.06] pt-2 order-last">
                {quick.map((d) => (
                  <button key={d.toISOString()} type="button" disabled={!canGo || busy} onClick={() => setWhen(localInput(d))}
                    className="text-xs rounded-full border border-white/10 px-2.5 py-1 hover:border-white/30 disabled:opacity-35">{fmt(d, ctx.usTz)} ET</button>
                ))}
                <input type="datetime-local" aria-label="Schedule for (your local time)" value={when} onChange={(e) => setWhen(e.target.value)} className="rounded-lg bg-white/[0.04] border border-white/10 px-2 py-1 text-xs [color-scheme:dark]" />
                <button disabled={!canGo || busy || !when} onClick={() => act(() => scheduleContent(post.id, new Date(when).toISOString()), 'Scheduled.')}
                  className="rounded-lg border border-white/15 px-3 py-1.5 text-sm hover:border-white/40 disabled:opacity-35">Schedule</button>
                {when && <span className="text-[11px] text-white/60">= {fmt(new Date(when), ctx.usTz)} US East</span>}
              </div>
            ) : <span className="text-xs text-white/55">Scheduling turns on when the QStash keys are added.</span>}
          </>
        )}
        {!ran && post.status !== 'publishing' && (
          <button disabled={busy} onClick={() => { if (window.confirm('Delete this draft?')) startBusy(async () => { await deleteContentDraft(post.id); window.location.href = '/dashboard/content'; }); }}
            className="ml-auto text-xs text-white/55 hover:text-rose-300 px-2 py-2">Delete draft</button>
        )}
        {msg && <p className={`w-full text-xs ${msg.tone === 'good' ? 'text-emerald-300/90' : 'text-rose-300'}`}>{msg.text}</p>}
      </div>
    </div>
  );
}
