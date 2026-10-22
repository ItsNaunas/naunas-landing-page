import { SectionHeader } from '@/components/dashboard/Tabs';
import { ActionForm } from '@/components/dashboard/ActionForm';
import { setOutreachSending, setChannelTargets } from '@/app/dashboard/actions';
import { getSettings } from '@/lib/outreach';
import { demoOn } from '@/lib/ops/demo';
import { attention } from '@/lib/ops/attention';
import { FUNNEL } from '@/config/funnel';

const DEMO = { sending: false, igNew: 7, liNew: 7, dailyNew: 6, cities: [] as string[] };

export default async function OutreachLayout({ children }: { children: React.ReactNode }) {
  const [settings, a] = await Promise.all([demoOn() ? Promise.resolve(DEMO) : getSettings().catch(() => DEMO), attention()]);
  return (
    <>
      <SectionHeader title="Outreach"
        action={
          <details className="relative">
            <summary className="list-none cursor-pointer flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/70 hover:text-white hover:border-white/25">
              <span aria-hidden>⚙</span> Settings
              <span className={`size-2 rounded-full ${settings.sending ? 'bg-emerald-400' : 'bg-white/25'}`} aria-label={settings.sending ? 'Email sending on' : 'Email sending off'} />
            </summary>
            <div className="absolute right-0 z-20 mt-2 w-[min(320px,calc(100vw-2rem))] rounded-2xl border border-white/10 bg-[#161616] p-4 shadow-xl flex flex-col gap-4">
              <ActionForm action={setOutreachSending} className="flex items-center justify-between gap-3">
                <input type="hidden" name="on" value={settings.sending ? '0' : '1'} />
                <span className="text-sm">Email sending<span className="block text-[11px] text-white/60">The 17:00 send for email-channel firms</span></span>
                <button className={`relative h-7 w-14 shrink-0 rounded-full transition-colors ${settings.sending ? 'bg-emerald-500' : 'bg-white/15'}`} aria-label={settings.sending ? 'Turn sending off' : 'Turn sending on'}>
                  <span className={`absolute top-1 size-5 rounded-full bg-white transition-all ${settings.sending ? 'left-8' : 'left-1'}`} />
                </button>
              </ActionForm>
              <ActionForm action={setChannelTargets} className="flex flex-col gap-2 border-t border-white/[0.06] pt-3">
                <span className="text-sm">New firms a day, per channel</span>
                <div className="grid grid-cols-3 gap-2">
                  {([['igNew', 'Instagram', settings.igNew], ['liNew', 'LinkedIn', settings.liNew], ['dailyNew', 'Email', settings.dailyNew]] as const).map(([name, label, v]) => (
                    <label key={name} className="flex flex-col gap-1 text-[11px] text-white/60">{label}
                      <input name={name} type="number" min={0} max={40} defaultValue={v} className="rounded-lg bg-white/[0.05] border border-white/10 px-2 py-1.5 text-sm text-white" />
                    </label>
                  ))}
                </div>
                <label className="flex flex-col gap-1 text-[11px] text-white/60">When the list runs low, search these cities in turn (one per line)
                  <textarea name="cities" rows={3} defaultValue={(settings.cities ?? []).join('\n')} placeholder={'Austin, TX\nNashville, TN\nScottsdale, AZ'} className="rounded-lg bg-white/[0.05] border border-white/10 px-2 py-1.5 text-xs text-white placeholder:text-white/50" />
                </label>
                <button className="self-start rounded-lg bg-white text-black text-xs font-medium px-3 py-1.5">Save targets</button>
                <p className="text-[11px] text-white/55">Each channel gets different firms. Week one: 7 / 7 / 6, then 10 / 10 / 10.</p>
              </ActionForm>
              <div className="border-t border-white/[0.06] pt-3 text-[11px] text-white/60 flex flex-col gap-1">
                <span>Research, reply drafts and post-call proposals all run here. The Claude routine only writes Monday’s content drafts.</span>
                <a href={FUNNEL.routine.url} target="_blank" rel="noopener noreferrer" className="text-[#ff8a6d] hover:underline">Run the routine now (Run now on claude.ai) ↗</a>
              </div>
            </div>
          </details>
        }
        tabs={[
          { href: '/dashboard/outreach', label: 'Today', badge: a.outreach },
          { href: '/dashboard/outreach/prospects', label: 'Prospects' },
          { href: '/dashboard/outreach/sequences', label: 'Sequences' },
          { href: '/dashboard/outreach/results', label: 'Results' },
        ]} />
      {children}
    </>
  );
}
