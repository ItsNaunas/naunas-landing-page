'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { upload } from '@vercel/blob/client';
import { publishTikTok, type PublishState } from '../../actions';
import type { CreatorInfo } from '@/lib/tiktok';

// Follows TikTok's content-sharing guidelines for Direct Post: show who is posting, no default privacy,
// interaction toggles off by default (and locked when the creator has them off), commercial content
// disclosure, the music / branded-content consent line, a preview, and the creator's max duration.

const PRIVACY: Record<string, string> = {
  PUBLIC_TO_EVERYONE: 'Everyone', MUTUAL_FOLLOW_FRIENDS: 'Friends', FOLLOWER_OF_CREATOR: 'Followers', SELF_ONLY: 'Only me',
};
const MUSIC = 'https://www.tiktok.com/legal/page/global/music-usage-confirmation/en';
const BC_POLICY = 'https://www.tiktok.com/legal/page/global/bc-policy/en';

const box = 'size-4 accent-[#F2613F] disabled:opacity-30';

export function TikTokComposer({ creator }: { creator: CreatorInfo }) {
  const [state, action, pending] = useActionState<PublishState, FormData>(publishTikTok, null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [duration, setDuration] = useState<number | null>(null);
  const [blobPath, setBlobPath] = useState('');
  const [progress, setProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState('');
  const [privacy, setPrivacy] = useState('');
  const [disclose, setDisclose] = useState(false);
  const [yourBrand, setYourBrand] = useState(false);
  const [branded, setBranded] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  useEffect(() => {
    if (!state?.publishId) return;
    formRef.current?.reset();
    setFile(null); setPreview(''); setBlobPath(''); setProgress(null); setPrivacy(''); setDisclose(false); setYourBrand(false); setBranded(false); setDuration(null);
  }, [state?.publishId, state?.at]);

  const tooLong = duration !== null && duration > creator.max_video_post_duration_sec;

  async function pick(f: File | undefined) {
    setUploadError(''); setBlobPath(''); setDuration(null);
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    try {
      setProgress(0);
      const name = f.name.replace(/[^\w.-]+/g, '-').slice(-60) || 'video.mp4';
      const res = await upload(`tiktok/uploads/${name}`, f, {
        access: 'private', handleUploadUrl: '/dashboard/media/upload', multipart: f.size > 20 * 1024 * 1024,
        onUploadProgress: (p) => setProgress(Math.round(p.percentage)),
      });
      setBlobPath(res.pathname);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setProgress(null);
    }
  }

  const disclosureOk = !disclose || yourBrand || branded;
  const ready = !!blobPath && !!privacy && !tooLong && disclosureOk && !pending;
  const label = branded ? 'Paid partnership' : yourBrand ? 'Promotional content' : '';

  return (
    <form ref={formRef} action={action} className="grid md:grid-cols-[220px_1fr] gap-5">
      <input type="hidden" name="video" value={blobPath} />

      <div className="flex flex-col gap-2">
        <label className="relative aspect-[9/16] rounded-xl border border-dashed border-white/15 bg-white/[0.03] overflow-hidden grid place-items-center cursor-pointer hover:border-white/30">
          {preview
            ? <video src={preview} controls muted playsInline className="absolute inset-0 size-full object-cover" onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)} />
            : <span className="text-xs text-white/45 text-center px-4">Choose a video<br /><span className="text-white/30">MP4 or MOV, vertical</span></span>}
          <input type="file" accept="video/mp4,video/quicktime,video/webm" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
        </label>
        {progress !== null && <p className="text-xs text-white/50">Uploading… {progress}%</p>}
        {blobPath && <p className="text-xs text-emerald-300/90">Ready: {file?.name}</p>}
        {uploadError && <p className="text-xs text-rose-300">{uploadError}</p>}
        {tooLong && <p className="text-xs text-rose-300">This video is {Math.round(duration!)}s. This account can post up to {creator.max_video_post_duration_sec}s.</p>}
      </div>

      <div className="flex flex-col gap-4 min-w-0">
        <div className="flex items-center gap-2.5">
          {creator.creator_avatar_url && <img src={creator.creator_avatar_url} alt="" className="size-8 rounded-full" />}
          <p className="text-sm">Posting to <span className="font-medium">{creator.creator_nickname ?? creator.creator_username ?? 'your TikTok'}</span>
            {creator.creator_username && <span className="text-white/40"> @{creator.creator_username}</span>}</p>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-white/50">Caption</span>
          <textarea name="caption" rows={4} maxLength={2200} placeholder="What’s this video about? #hashtags"
            className="rounded-lg bg-white/[0.04] border border-white/10 px-3 py-2 text-sm outline-none focus:border-white/30" />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-white/50">Who can see this video</span>
          <select name="privacy" value={privacy} onChange={(e) => setPrivacy(e.target.value)} required
            className="rounded-lg bg-white/[0.04] border border-white/10 px-3 py-2 text-sm outline-none focus:border-white/30 [&>option]:bg-[#161616]">
            <option value="" disabled>Choose…</option>
            {creator.privacy_level_options.map((p) => (
              <option key={p} value={p} disabled={branded && p === 'SELF_ONLY'}>
                {PRIVACY[p] ?? p}{branded && p === 'SELF_ONLY' ? ' (not allowed for branded content)' : ''}
              </option>
            ))}
          </select>
        </label>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-xs text-white/50 mb-1.5">Allow users to</legend>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
            {([['allowComment', 'Comment', creator.comment_disabled], ['allowDuet', 'Duet', creator.duet_disabled], ['allowStitch', 'Stitch', creator.stitch_disabled]] as const).map(([name, l, off]) => (
              <label key={name} className={`flex items-center gap-2 ${off ? 'text-white/30' : ''}`}>
                <input type="checkbox" name={name} disabled={off} className={box} />{l}{off && <span className="text-[11px]">(off in your TikTok settings)</span>}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="rounded-xl border border-white/[0.08] p-3.5 flex flex-col gap-2.5">
          <label className="flex items-center justify-between gap-3 text-sm">
            <span>Disclose video content <span className="block text-xs text-white/40">Turn on if this promotes a brand, product or service.</span></span>
            <input type="checkbox" checked={disclose} onChange={(e) => { setDisclose(e.target.checked); if (!e.target.checked) { setYourBrand(false); setBranded(false); } }} className={box} />
          </label>
          {disclose && (
            <div className="flex flex-col gap-2 pl-1 text-sm">
              <label className="flex items-start gap-2"><input type="checkbox" name="yourBrand" checked={yourBrand} onChange={(e) => setYourBrand(e.target.checked)} className={`${box} mt-0.5`} />
                <span>Your brand <span className="block text-xs text-white/40">You’re promoting yourself or your own business.</span></span></label>
              <label className="flex items-start gap-2"><input type="checkbox" name="brandedContent" checked={branded} onChange={(e) => { setBranded(e.target.checked); if (e.target.checked && privacy === 'SELF_ONLY') setPrivacy(''); }} className={`${box} mt-0.5`} />
                <span>Branded content <span className="block text-xs text-white/40">You’re promoting another brand or a third party.</span></span></label>
              {label
                ? <p className="text-xs text-amber-200/90">Your video will be labeled “{label}”.</p>
                : <p className="text-xs text-rose-300/90">Choose at least one option, or turn disclosure off.</p>}
            </div>
          )}
        </fieldset>

        <p className="text-xs text-white/45">
          By posting, you agree to TikTok’s{' '}
          {branded && <><a href={BC_POLICY} target="_blank" rel="noopener noreferrer" className="underline hover:text-white">Branded Content Policy</a> and{' '}</>}
          <a href={MUSIC} target="_blank" rel="noopener noreferrer" className="underline hover:text-white">Music Usage Confirmation</a>.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <button disabled={!ready} className="rounded-lg bg-[#F2613F] px-4 py-2 text-sm font-medium text-white hover:bg-[#ff7553] disabled:opacity-35 disabled:cursor-not-allowed">
            {pending ? 'Publishing…' : 'Publish to TikTok'}
          </button>
          {state?.error && <p className="text-xs text-rose-300">{state.error}</p>}
          {state?.publishId && !pending && <p className="text-xs text-emerald-300/90">Sent to TikTok. It can take a few minutes to process before it appears on your profile.</p>}
        </div>
      </div>
    </form>
  );
}
