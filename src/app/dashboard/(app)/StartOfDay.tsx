import { getBriefing } from '@/lib/assistant';
import { aiReady } from '@/lib/ai';
import { demoOn } from '@/lib/ops/demo';
import { ActionForm } from '@/components/dashboard/ActionForm';
import { Markdown } from '@/components/dashboard/AskNaunas';
import { refreshBriefing } from '@/app/dashboard/actions';
import { untilOrAgo } from '@/components/dashboard/kit';

/** Today: the day's written plan (by the health cron at 09:00, or on demand), above the contact list. */
export async function Plan() {
  if (demoOn()) return null;
  const brief = await getBriefing().catch(() => null);
  return (
    <section className="rounded-2xl border border-[#F2613F]/25 bg-[#F2613F]/[0.05] p-4 md:p-5 flex flex-col gap-3 min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-medium">Today’s plan</p>
        {aiReady() && (
          <ActionForm action={refreshBriefing}>
            <button className="text-xs text-white/65 hover:text-white">{brief ? `Written ${untilOrAgo(brief.at)} · Refresh ↻` : 'Write today’s plan'}</button>
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
        <p className="text-sm text-white/55">{aiReady() ? 'Written at 09:00 each morning from everything the dashboard knows. Press “Write today’s plan” to get it now, or use Ask (Ctrl+J).' : 'Connect OpenAI (System → Connections) to get a written plan each morning.'}</p>
      )}
    </section>
  );
}
