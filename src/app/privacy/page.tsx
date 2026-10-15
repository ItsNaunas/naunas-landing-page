import type { Metadata } from 'next';
import { CaseStudyShell } from '@/components/sections/CaseStudyShell';

export const metadata: Metadata = {
  title: 'Privacy Policy | Naunas',
  description: 'What Naunas collects when you use naunas.co.uk, email us or message us on Instagram, where it is kept, and how to have it deleted.',
};

const UPDATED = '15 October 2026';

// Keep this true to the code: every form, webhook and tool listed here is one the site or the
// daily operator routine actually uses (see docs/client-system/RUNBOOK.md). Update both together.
const SECTIONS: { h: string; body: React.ReactNode }[] = [
  {
    h: 'Who we are',
    body: (
      <p>
        Naunas (naunas.co.uk) builds client systems for service businesses. Naunas is the controller of the
        personal data described here. For anything about your data, email{' '}
        <a href="mailto:contact@naunas.co.uk">contact@naunas.co.uk</a>.
      </p>
    ),
  },
  {
    h: 'What we collect',
    body: (
      <ul>
        <li><b>Leak Map sign-up:</b> your first name, email and (optionally) what a client is worth to you.</li>
        <li><b>Free audit questionnaire and booking:</b> your name, email, website, business type, revenue band, what isn&apos;t working, and the time you book.</li>
        <li><b>Contact form and emails you send us:</b> what you write and your contact details.</li>
        <li><b>Newsletter:</b> your email, only after you tick the consent box.</li>
        <li><b>Instagram:</b> if you comment a keyword such as &ldquo;LEAK&rdquo; on our posts or send us a direct message, your Instagram username, display name and the comment or message.</li>
        <li><b>Calls:</b> audit and client calls may be recorded and summarised (Fathom). We tell you at the start of the call, and you can say no.</li>
        <li><b>Payments:</b> handled by Stripe. We see your name, email, the amount and its status, never your full card details.</li>
        <li><b>How you found us:</b> the page and campaign tags (for example utm_source) you arrived with, kept in your browser for 90 days and sent with any form you submit. Site traffic is measured with Vercel Analytics, which uses no cookies and doesn&apos;t identify you.</li>
      </ul>
    ),
  },
  {
    h: 'Why we use it (and the legal basis)',
    body: (
      <ul>
        <li><b>To send what you asked for</b> (the Leak Map, its email course, your booking confirmation, replies): to take steps at your request (contract) and our legitimate interest in answering enquiries.</li>
        <li><b>The newsletter:</b> your consent, which you can withdraw with the unsubscribe link in any email.</li>
        <li><b>To prepare for your call and follow up</b> (research on your public website, a written proposal): legitimate interest. We only use public information about your business.</li>
        <li><b>To deliver paid work and take payment:</b> contract, and our legal obligation to keep financial records.</li>
        <li><b>Instagram replies:</b> when you comment a keyword, we send you one direct message with the link you asked for. That is the only automated message we send.</li>
      </ul>
    ),
  },
  {
    h: 'Who processes it for us',
    body: (
      <>
        <p>We don&apos;t sell your data or share it for advertising. These services store or process it on our behalf:</p>
        <ul>
          <li>MailerLite (email course and newsletter)</li>
          <li>HubSpot (customer records)</li>
          <li>Zoho Mail (our email)</li>
          <li>Cal.com and Google Calendar (bookings)</li>
          <li>Stripe (payments)</li>
          <li>Meta / Instagram (comments and messages)</li>
          <li>Fathom (call recording and summaries)</li>
          <li>Google Drive (proposal documents)</li>
          <li>Anthropic&apos;s Claude (drafting replies, call summaries and proposals for us to review; nothing is sent to you without a person approving it)</li>
          <li>Telegram (private notifications to us about new enquiries and payments)</li>
          <li>Vercel (hosting this site)</li>
        </ul>
        <p>
          Some of these are based in the United States or elsewhere outside the UK. Where they are, the transfer is
          covered by the provider&apos;s standard contractual clauses or an adequacy decision.
        </p>
      </>
    ),
  },
  {
    h: 'How long we keep it',
    body: (
      <ul>
        <li>Enquiries and leads that don&apos;t become clients: up to 2 years after our last contact, then deleted.</li>
        <li>Newsletter: until you unsubscribe.</li>
        <li>Clients: for the engagement, plus 6 years for invoices and payment records (UK tax law).</li>
        <li>Call recordings: up to 12 months.</li>
      </ul>
    ),
  },
  {
    h: 'Your rights',
    body: (
      <>
        <p>
          You can ask to see, correct, export or delete your data, object to how we use it, or withdraw consent at any
          time. Email <a href="mailto:contact@naunas.co.uk">contact@naunas.co.uk</a> and we&apos;ll reply within one
          month. Every marketing email has an unsubscribe link.
        </p>
        <p>
          If you&apos;re unhappy with how we handle your data, you can complain to the UK Information Commissioner&apos;s
          Office at <a href="https://ico.org.uk/make-a-complaint/" target="_blank" rel="noopener noreferrer">ico.org.uk</a>.
        </p>
      </>
    ),
  },
  {
    h: 'Deleting your Instagram data',
    body: (
      <p>
        To have everything we hold from your Instagram comments or messages deleted, send us a DM on Instagram saying
        &ldquo;delete my data&rdquo;, or email <a href="mailto:contact@naunas.co.uk">contact@naunas.co.uk</a> with your
        username. We delete it within 30 days and confirm when it&apos;s done.
      </p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <CaseStudyShell hideCta>
      <div className="pt-12 pb-10">
        <span className="text-[11px] font-medium text-[#F2613F] uppercase tracking-widest">Privacy</span>
        <h1 className="text-4xl md:text-5xl font-bold leading-tight mt-3" style={{ color: '#fff' }}>
          Privacy policy
        </h1>
        <p className="text-sm mt-4" style={{ color: 'rgba(255,255,255,0.45)' }}>Last updated {UPDATED}</p>
      </div>

      <div className="max-w-2xl flex flex-col gap-10 text-[15px] leading-relaxed [&_a]:text-[#F2613F] [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-2 [&_p+p]:mt-3 [&_p+ul]:mt-3 [&_ul+p]:mt-3" style={{ color: 'rgba(255,255,255,0.7)' }}>
        {SECTIONS.map((s) => (
          <section key={s.h}>
            <h2 className="text-xl font-bold mb-3" style={{ color: '#fff' }}>{s.h}</h2>
            {s.body}
          </section>
        ))}
      </div>
    </CaseStudyShell>
  );
}
