import { getVault } from '@/lib/assistantData';
import { Card, ago } from '@/components/dashboard/ui';
import { SectionTitle } from '@/components/dashboard/kit';

/** System → Notes and build logs: what the laptop's vault sync last sent, and which notes have drifted from
 * their repos. Fixing happens at the source (the repo's PROGRESS.md), so this only reports. */
export async function NotesHealth() {
  const vault = await getVault().catch(() => null);
  const drift = vault?.items.filter((i) => i.issues?.length) ?? [];
  const withRepo = vault?.items.filter((i) => i.repo?.updated).length ?? 0;
  return (
    <div id="notes" className="scroll-mt-20 flex flex-col gap-3">
      <SectionTitle>Notes and build logs</SectionTitle>
      <Card pad={false}>
        <div className="px-5 py-3 border-b border-white/[0.05]">
          <p className="text-sm">
            {vault
              ? <>Vault last synced <b className="font-medium">{ago(vault.at)}</b>: {vault.items.length} clients, projects and partners, {withRepo} with a readable <code className="text-xs">PROGRESS.md</code>.</>
              : <>The vault hasn’t synced yet. On the laptop, run <code className="text-xs">scripts\install-vault-sync.ps1</code> once.</>}
          </p>
          <p className="text-xs text-white/60 mt-1">Build state comes from each repo’s own <code>PROGRESS.md</code> (main branch); relationship, money and tasks from the vault note. Fix drift in the repo, not the vault.</p>
        </div>
        {drift.length ? (
          <ul className="divide-y divide-white/[0.05]">
            {drift.map((i) => (
              <li key={i.name} className="px-5 py-3 flex items-start gap-3">
                <span className="mt-1.5 size-2.5 shrink-0 rounded-full bg-amber-300" aria-hidden />
                <div className="min-w-0 flex-1 sm:flex sm:items-baseline sm:gap-4">
                  <p className="text-sm font-medium sm:w-56 shrink-0">{i.name}{i.repo?.path && <span className="block text-[11px] font-normal text-white/45 break-all">{i.repo.path}</span>}</p>
                  <ul className="text-xs mt-0.5 sm:mt-0 text-amber-200/90 flex flex-col gap-0.5">{i.issues.map((x) => <li key={x}>{x}</li>)}</ul>
                </div>
              </li>
            ))}
          </ul>
        ) : vault ? <p className="px-5 py-3 text-sm text-white/65">Every build log is up to date with its repo.</p> : null}
      </Card>
    </div>
  );
}
