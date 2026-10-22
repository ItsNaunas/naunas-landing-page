import type { Metadata } from 'next';
import { CaseStudyShell } from '@/components/sections/CaseStudyShell';
import { LeakMapForm } from '@/components/ui/LeakMapForm';

// The "free scorecard" the videos point at (link in bio): page 19 of the Leak Map, delivered with the
// 8-day course. Same sign-up as the pop-up, with the scorecard framing.
export const metadata: Metadata = {
  title: 'Find your weakest step | Naunas',
  description: 'Score your business 0–2 on the 8 steps between an enquiry and a signed client, and see where you’re leaking. Free scorecard and email course.',
};

const STEPS = [
  ['Attention', 'They like your work, then find nowhere obvious to go next.'],
  ['Capture', 'The enquiry waits hours for a reply. They ask someone else.'],
  ['Pipeline', 'Enquiries scattered across DMs, email and missed calls.'],
  ['Follow-up', 'Booked calls no-show. Maybes get forgotten.'],
  ['Conversion', '"Loved the proposal", then weeks of chasing the deposit.'],
  ['Fulfilment', 'Onboarding by hand. Clients keep asking what happens next.'],
  ['Retention', 'The handover ends with an invoice. No review, no referral.'],
  ['Attribution', 'No idea which source brings the biggest clients.'],
];

export default function ScorecardPage() {
  return (
    <CaseStudyShell hideCta>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 pt-12">
        <div>
          <span className="text-[11px] font-medium text-[#F2613F] uppercase tracking-widest">Free scorecard</span>
          <h1 className="text-4xl md:text-5xl font-bold leading-tight mt-3" style={{ color: '#fff' }}>Find your weakest step.</h1>
          <p className="text-base md:text-lg mt-5 leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>
            There are eight steps between someone finding your work and sending you their next client. Most firms are great at one or two and quietly leaking in the rest. Score yourself 0–2 on each one; it takes two minutes.
          </p>
          <ol className="mt-8 flex flex-col gap-3">
            {STEPS.map(([name, leak], i) => (
              <li key={name} className="text-sm leading-relaxed pl-8 relative" style={{ color: 'rgba(255,255,255,0.65)' }}>
                <span className="absolute left-0 text-[11px] font-semibold tabular-nums" style={{ color: '#F2613F' }}>{String(i + 1).padStart(2, '0')}</span>
                <b style={{ color: '#fff' }}>{name}.</b> {leak}
              </li>
            ))}
          </ol>
          <p className="text-sm mt-8 leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>
            The scorecard is page 19 of the Leak Map PDF. The free 8-day email course walks you through the steps, one a day, with what to fix at each. Nothing is sent without your say-so.
          </p>
        </div>
        <div className="p-6 sm:p-8 self-start" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
          <span className="text-[11px] font-medium uppercase tracking-widest" style={{ color: '#F2613F' }}>Free · scorecard + email course</span>
          <h2 className="text-2xl font-semibold mt-2 leading-tight" style={{ color: '#fff' }}>Get the scorecard</h2>
          <p className="text-sm mt-2 leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>The 24-page Leak Map with the scorecard inside, plus the course. Score yourself today; start fixing your weakest step tomorrow.</p>
          <LeakMapForm src="scorecard-page" variant="scorecard" />
        </div>
      </div>
    </CaseStudyShell>
  );
}
