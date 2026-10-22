'use client';

import { useActionState, useEffect, useRef } from 'react';
import { buildReport, saveReportEdits, type ReportState } from '@/app/dashboard/actions';
import type { LeakReport } from '@/lib/leakReport';
import { CopyText } from '../../OutreachClient';

const LAYERS = ['Attention', 'Capture', 'Pipeline', 'Follow-up', 'Conversion', 'Fulfilment', 'Retention', 'Attribution'];
const field = 'w-full rounded-lg bg-white/[0.04] border border-white/10 px-3 py-2 text-[13px] text-white';

/** Reload after a successful action, so the server-rendered page shows the new report (see ActionForm). */
function useReloadOn(state: ReportState) {
  const first = useRef(true);
  useEffect(() => { if (first.current) { first.current = false; return; } if (state?.savedAt) window.location.reload(); }, [state]);
}

export function ReportPanel({ id, report, site }: { id: string; report: LeakReport | null; site: string }) {
  const [built, build, building] = useActionState<ReportState, FormData>(buildReport, {});
  const [saved, save, saving] = useActionState<ReportState, FormData>(saveReportEdits, {});
  useReloadOn(built);
  useReloadOn(saved);
  const url = report ? `${site}/r/${report.token}` : '';

  const buildButton = (label: string, quiet = false) => (
    <form action={build}>
      <input type="hidden" name="id" value={id} />
      <button disabled={building} className={quiet ? 'text-xs text-white/60 hover:text-white disabled:opacity-50' : 'rounded-lg bg-[#F2613F] px-4 py-2 text-sm font-medium text-[#0C0C0C] hover:bg-[#ff7553] disabled:opacity-60'}>
        {building ? 'Looking at their site… (about 30 seconds)' : label}
      </button>
    </form>
  );

  if (!report) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm text-white/55">Checks their website and Instagram for gaps you can see from outside, maps them to the 8 Leak Map layers with the page each was seen on, and writes a Loom script. Nothing is shared until you publish it.</p>
        {buildButton('Build leak report')}
        {built.error && <p className="text-xs text-rose-300">{built.error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2.5 py-1 text-[11px] ${report.published ? 'bg-emerald-500/15 text-emerald-300' : 'bg-white/[0.06] text-white/55'}`}>{report.published ? (report.opens ? `Published · opened ${report.opens} time${report.opens === 1 ? '' : 's'}` : 'Published · not opened yet') : 'Draft, only you can see it'}</span>
        <a href={report.published ? `/r/${report.token}` : `/dashboard/outreach/report/${report.token}`} target="_blank" rel="noopener noreferrer" className="rounded-full border border-white/15 px-3 py-1.5 text-xs hover:border-white/30">{report.published ? 'Open ↗' : 'Preview ↗'}</a>
        {report.published && <CopyText text={url} label="Copy link" />}
        <CopyText text={report.loom} label="Copy Loom script" />
      </div>

      <form action={save} className="flex flex-col gap-4">
        <input type="hidden" name="token" value={report.token} />
        <label className="flex flex-col gap-1 text-[11px] text-white/60">Intro<textarea name="intro" defaultValue={report.intro} rows={3} className={field} /></label>
        {report.findings.map((f, i) => (
          <fieldset key={i} className="rounded-xl border border-white/[0.08] p-3 flex flex-col gap-2">
            <legend className="px-1 text-[11px] text-white/60">{i + 1} · Layer {f.layer}: {LAYERS[f.layer - 1]} · <a href={f.url} target="_blank" rel="noopener noreferrer" className="text-[#ff8a6d] hover:underline">seen here ↗</a></legend>
            <input name={`f${i}_title`} defaultValue={f.title} className={`${field} font-medium`} aria-label="Title" />
            <label className="flex flex-col gap-1 text-[11px] text-white/60">What you saw<textarea name={`f${i}_seen`} defaultValue={f.seen} rows={2} className={field} /></label>
            <label className="flex flex-col gap-1 text-[11px] text-white/60">Why it matters<textarea name={`f${i}_why`} defaultValue={f.why} rows={2} className={field} /></label>
            <label className="flex flex-col gap-1 text-[11px] text-white/60">The fix<textarea name={`f${i}_fix`} defaultValue={f.fix} rows={2} className={field} /></label>
            <label className="flex items-center gap-2 text-xs text-white/60"><input type="checkbox" name={`f${i}_drop`} /> Remove this one</label>
          </fieldset>
        ))}
        <label className="flex flex-col gap-1 text-[11px] text-white/60">One thing they could change this week<textarea name="quickWin" defaultValue={report.quickWin} rows={2} className={field} /></label>
        <label className="flex flex-col gap-1 text-[11px] text-white/60">Questions for the call (one per line, shown on the report too)<textarea name="askOnCall" defaultValue={report.askOnCall.join('\n')} rows={3} className={field} /></label>
        <label className="flex flex-col gap-1 text-[11px] text-white/60">Loom script (only you see this)<textarea name="loom" defaultValue={report.loom} rows={7} className={field} /></label>
        <div className="flex flex-wrap items-center gap-2">
          <button name="intent" value="save" disabled={saving} className="rounded-lg border border-white/15 px-4 py-2 text-sm hover:border-white/30 disabled:opacity-50">Save</button>
          {report.published
            ? <button name="intent" value="unpublish" disabled={saving} className="rounded-lg border border-white/15 px-4 py-2 text-sm text-white/60 hover:text-white disabled:opacity-50">Unpublish</button>
            : <button name="intent" value="publish" disabled={saving} className="rounded-lg bg-white text-black px-4 py-2 text-sm font-medium disabled:opacity-50">Save and publish link</button>}
          {saving && <span className="text-xs text-white/60">Saving…</span>}
          {saved.error && <span className="text-xs text-rose-300">{saved.error}</span>}
        </div>
      </form>
      <div className="border-t border-white/[0.06] pt-3 flex flex-col gap-1">
        {buildButton('Rebuild from scratch (replaces your edits)', true)}
        {built.error && <p className="text-xs text-rose-300">{built.error}</p>}
      </div>
    </div>
  );
}
