import { missing, type Flag } from '@/lib/ops/missing';
import { getBriefing } from '@/lib/assistant';
import { aiReady } from '@/lib/ai';
import { demoOn } from '@/lib/ops/demo';
import { ActionForm } from '@/components/dashboard/ActionForm';
import { Markdown } from '@/components/dashboard/AskNaunas';
import { refreshBriefing } from '@/app/dashboard/actions';
import { untilOrAgo } from '@/components/dashboard/kit';

const DOT: Record<Flag['level'], string> = { high: 'bg-rose-400', medium: 'bg-amber-300', low: 'bg-white/30' };

/** Home: today's AI plan (written 09:00 by the health cron, or on demand) + every flag from the fixed checks. */
export async function StartOfDay() {
  if (demoOn()) return null;
  const [{ flags }, brief] = await Promise.all([missing().catch(() => ({ flags: [] as Flag[] })), getBriefing().catch(() => null)]);
  const top = flags.slice(0, 6);
  return (
    <div className="grid lg:grid-cols-[1.15fr_1fr] gap-3 md:gap-4">
      <section className="rounded-2xl border border-[#F2613F]/25 bg-[#F2613F]/[0.05] p-4 md:p-5 flex flex-col gap-3 min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-medium">Today’s plan</p>
          {aiReady() && (
            <ActionForm action={refreshBriefing}>
              <button className="text-xs text-white/50 hover:text-white">{brief ? `Written ${untilOrAgo(brief.at)} · Refresh ↻` : 'Write today’s plan'}</button>
            </ActionForm>
          )}
        </div>
        {brief ? (
          <>
            <Markdown text={brief.answer} />
            {!!brief.actions.length && (
              <div className="flex flex-wrap gap-2">
                {brief.actions.map((a) => <a key={a.href + a.label} href={a.href} className="rounded-full bg-white text-black px-3 py-1.5 text-xs font-medium hover:bg-white/90">{a.label} →</a>)}
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-white/55">{aiReady() ? 'Your plan is written at 09:00 each morning from everything below. Press “Write today’s plan” to get it now, or use Ask (bottom right) for anything else.' : 'Add OPENAI_API_KEY in Vercel to get a written plan each morning.'}</p>
        )}
      </section>

      <section className="rounded-2xl border border-white/[0.07] bg-[#121212] p-4 md:p-5 flex flex-col gap-3 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="font-medium">What you’re missing <span className="text-white/40 font-normal">({flags.length})</span></p>
        </div>
        {!flags.length ? <p className="text-sm text-white/50">Nothing slipping right now.</p> : (
          <ul className="flex flex-col divide-y divide-white/[0.05]">
            {top.map((f) => (
              <li key={f.id} className="py-2 flex items-start gap-2.5">
                <span className={`mt-1.5 size-2 shrink-0 rounded-full ${DOT[f.level]}`} aria-label={f.level} />
                <div className="min-w-0 flex-1">
                  <a href={f.href} className="text-[13px] hover:text-[#ff8a6d]">{f.title}</a>
                  {f.detail && <p className="text-[11.5px] text-white/45">{f.detail}</p>}
                </div>
                <span className="shrink-0 text-[10.5px] text-white/35">{f.area}</span>
              </li>
            ))}
          </ul>
        )}
        {flags.length > top.length && (
          <details className="text-[13px]">
            <summary className="cursor-pointer text-xs text-white/50 hover:text-white">{flags.length - top.length} more</summary>
            <ul className="mt-2 flex flex-col gap-1.5">
              {flags.slice(top.length).map((f) => <li key={f.id} className="flex items-start gap-2"><span className={`mt-1.5 size-2 shrink-0 rounded-full ${DOT[f.level]}`} /><a href={f.href} className="hover:text-[#ff8a6d]">{f.title}</a></li>)}
            </ul>
          </details>
        )}
      </section>
    </div>
  );
}
