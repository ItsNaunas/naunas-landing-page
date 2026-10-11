import type { Metadata } from 'next';
import { CaseStudyShell } from '@/components/sections/CaseStudyShell';
import { AuditFlow } from '@/components/ui/AuditFlow';

export const metadata: Metadata = {
  title: 'Free audit | Naunas',
  description: 'A free 30-minute audit of how enquiries, proposals and clients move through your business, and what to fix first.',
};

export default function AuditPage() {
  return (
    <CaseStudyShell hideCta>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 pt-12">
        <div>
          <span className="text-[11px] font-medium text-[#F2613F] uppercase tracking-widest">Free audit</span>
          <h1 className="text-4xl md:text-5xl font-bold leading-tight mt-3" style={{ color: '#fff' }}>
            Find out where your business is leaking.
          </h1>
          <p className="text-base md:text-lg mt-5 leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>
            30 minutes, no cost. Answer a few quick questions, then pick a time. I&apos;ll walk through how enquiries, proposals and clients move through your business and show you what I&apos;d fix first.
          </p>
          <ul className="mt-8 flex flex-col gap-3">
            {[
              'Where enquiries go cold before you reply',
              'Where signed work stalls before the deposit',
              'Where finished clients should be turning into referrals',
            ].map((b) => (
              <li key={b} className="text-sm leading-relaxed pl-5 relative" style={{ color: 'rgba(255,255,255,0.65)' }}>
                <span className="absolute left-0" style={{ color: '#F2613F' }}>·</span>{b}
              </li>
            ))}
          </ul>
        </div>
        <div className="p-6 sm:p-8" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
          <AuditFlow origin="audit-page" />
        </div>
      </div>
    </CaseStudyShell>
  );
}
