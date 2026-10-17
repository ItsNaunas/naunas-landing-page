'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { upload } from '@vercel/blob/client';
import { publishLinkedIn, type PublishState } from '../../actions';

const MAX = 3000;
const field = 'rounded-lg bg-white/[0.04] border border-white/10 px-3 py-2 text-sm outline-none focus:border-white/30';

export function LinkedInComposer({ name, picture }: { name?: string; picture?: string }) {
  const [state, action, pending] = useActionState<PublishState, FormData>(publishLinkedIn, null);
  const [text, setText] = useState('');
  const [preview, setPreview] = useState<{ url: string; kind: 'image' | 'video' } | null>(null);
  const [blobPath, setBlobPath] = useState('');
  const [progress, setProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState('');
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview.url); }, [preview]);
  useEffect(() => {
    if (!state?.publishId) return;
    formRef.current?.reset();
    setText(''); setPreview(null); setBlobPath(''); setProgress(null);
  }, [state?.publishId, state?.at]);

  async function pick(f: File | undefined) {
    setUploadError(''); setBlobPath(''); setPreview(null);
    if (!f) return;
    const kind = f.type.startsWith('video/') ? 'video' : 'image';
    setPreview({ url: URL.createObjectURL(f), kind });
    try {
      setProgress(0);
      const name = f.name.replace(/[^\w.-]+/g, '-').slice(-60) || 'media';
      const res = await upload(`linkedin/uploads/${name}`, f, {
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

  const uploading = progress !== null;
  const ready = text.trim().length > 0 && text.length <= MAX && !uploading && (!preview || !!blobPath) && !pending;

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-4">
      <input type="hidden" name="media" value={blobPath} />
      <input type="hidden" name="mediaKind" value={preview?.kind ?? ''} />

      <div className="flex items-center gap-2.5">
        {picture && <img src={picture} alt="" className="size-8 rounded-full" />}
        <p className="text-sm">Posting as <span className="font-medium">{name ?? 'your LinkedIn profile'}</span></p>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs text-white/50 flex justify-between"><span>Post</span><span className={text.length > MAX ? 'text-rose-300' : ''}>{text.length.toLocaleString('en-GB')} / 3,000</span></span>
        <textarea name="text" rows={8} value={text} onChange={(e) => setText(e.target.value)} placeholder="What do you want to say? #hashtags work."
          className={field} />
      </label>

      <div className="flex flex-col sm:flex-row gap-4">
        <label className="flex flex-col gap-1.5 sm:w-56">
          <span className="text-xs text-white/50">Who can see it</span>
          <select name="visibility" defaultValue="PUBLIC" className={`${field} [&>option]:bg-[#161616]`}>
            <option value="PUBLIC">Anyone</option>
            <option value="CONNECTIONS">Connections only</option>
          </select>
        </label>
        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
          <span className="text-xs text-white/50">Image or video (optional)</span>
          <div className="flex items-center gap-3 flex-wrap">
            <label className="cursor-pointer rounded-lg border border-white/10 px-3 py-2 text-sm hover:border-white/30">
              {preview ? 'Change' : 'Add media'}
              <input type="file" accept="image/jpeg,image/png,image/gif,video/mp4" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
            </label>
            {preview && <button type="button" onClick={() => { setPreview(null); setBlobPath(''); }} className="text-xs text-white/40 hover:text-rose-300">Remove</button>}
            {uploading && <span className="text-xs text-white/50">Uploading… {progress}%</span>}
            {blobPath && <span className="text-xs text-emerald-300/90">Ready</span>}
            {uploadError && <span className="text-xs text-rose-300">{uploadError}</span>}
          </div>
        </div>
      </div>

      {preview && (
        <div className="max-w-sm rounded-xl overflow-hidden border border-white/[0.08] bg-black">
          {preview.kind === 'image'
            ? <img src={preview.url} alt="" className="w-full" />
            : <video src={preview.url} controls muted playsInline className="w-full" />}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button disabled={!ready} className="rounded-lg bg-[#F2613F] px-4 py-2 text-sm font-medium text-white hover:bg-[#ff7553] disabled:opacity-35 disabled:cursor-not-allowed">
          {pending ? (preview?.kind === 'video' ? 'Uploading video to LinkedIn…' : 'Publishing…') : 'Publish to LinkedIn'}
        </button>
        {state?.error && <p className="text-xs text-rose-300">{state.error}</p>}
        {state?.publishId && !pending && <p className="text-xs text-emerald-300/90">Posted to LinkedIn.</p>}
      </div>
    </form>
  );
}
