import { SectionHeader } from '@/components/dashboard/Tabs';
import { setOutreachSending } from '@/app/dashboard/actions';
import { getSettings } from '@/lib/outreach';
import { demoOn } from '@/lib/ops/demo';
import { attention } from '@/lib/ops/attention';

export default async function OutreachLayout({ children }: { children: React.ReactNode }) {
  const [settings, a] = await Promise.all([demoOn() ? Promise.resolve({ sending: false }) : getSettings().catch(() => ({ sending: false })), attention()]);
  return (
    <>
      <SectionHeader title="Outreach"
        action={
          <form action={setOutreachSending} className="flex items-center gap-3">
            <input type="hidden" name="on" value={settings.sending ? '0' : '1'} />
            <span className="text-xs text-white/50">Sending is</span>
            <button className={`relative h-7 w-14 rounded-full transition-colors ${settings.sending ? 'bg-emerald-500' : 'bg-white/15'}`} aria-label={settings.sending ? 'Turn sending off' : 'Turn sending on'}>
              <span className={`absolute top-1 size-5 rounded-full bg-white transition-all ${settings.sending ? 'left-8' : 'left-1'}`} />
            </button>
            <span className={`text-sm font-medium ${settings.sending ? 'text-emerald-300' : 'text-white/60'}`}>{settings.sending ? 'ON' : 'OFF'}</span>
          </form>
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
