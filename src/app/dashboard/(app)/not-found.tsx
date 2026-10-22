import Link from 'next/link';

/** A missing firm, lead or post inside the dashboard: say so in the dashboard's own words, not the marketing 404. */
export default function DashboardNotFound() {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-[#121212] p-8 max-w-xl flex flex-col gap-3">
      <p className="text-lg font-semibold" style={{ fontFamily: 'var(--font-display)' }}>Nothing here</p>
      <p className="text-sm text-white/55">That firm, lead or post doesn’t exist any more, or the link was mistyped.</p>
      <div className="flex flex-wrap gap-2 pt-1 text-sm">
        <Link href="/dashboard/outreach/prospects" className="rounded-full border border-white/15 px-4 py-2 hover:border-white/30">Prospects</Link>
        <Link href="/dashboard/leads" className="rounded-full border border-white/15 px-4 py-2 hover:border-white/30">Leads</Link>
        <Link href="/dashboard/content" className="rounded-full border border-white/15 px-4 py-2 hover:border-white/30">Content</Link>
        <Link href="/dashboard" className="rounded-full bg-white text-black px-4 py-2 font-medium">Today</Link>
      </div>
    </div>
  );
}
