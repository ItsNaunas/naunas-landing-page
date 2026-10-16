import type { Metadata } from 'next';
import { CaseStudyShell } from '@/components/sections/CaseStudyShell';

export const metadata: Metadata = {
  title: 'Terms of Service | Naunas',
  description: 'The terms for using naunas.co.uk, the free resources on it, and the Naunas app that publishes to our own social accounts.',
};

const UPDATED = '16 October 2026';

// Paid client work is governed by each signed proposal, not this page. The "Naunas app" section
// covers the TikTok / Instagram developer apps, which only ever post to Naunas's own accounts.
const SECTIONS: { h: string; body: React.ReactNode }[] = [
  {
    h: 'Who we are',
    body: (
      <p>
        Naunas (naunas.co.uk) builds client systems for service businesses and is run by Naufal. Postal address: 7
        Claymond Road. Contact: <a href="mailto:contact@naunas.co.uk">contact@naunas.co.uk</a>. By using this site you
        agree to these terms.
      </p>
    ),
  },
  {
    h: 'Using the site and free resources',
    body: (
      <ul>
        <li>The Leak Map, email course, newsletter and other free resources are for your own business use. Please don&apos;t resell or republish them as your own.</li>
        <li>They are general guidance, not professional, legal or financial advice. Results depend on your business, and we don&apos;t guarantee any outcome.</li>
        <li>Don&apos;t misuse the site: no attempts to break it, scrape it at scale, or submit other people&apos;s details without permission.</li>
      </ul>
    ),
  },
  {
    h: 'Paid work',
    body: (
      <p>
        Any paid project or retainer is covered by the written proposal you accept, including scope, price, payment
        terms and cancellation. Where that proposal and these terms differ, the proposal wins.
      </p>
    ),
  },
  {
    h: 'The Naunas app (TikTok and Instagram)',
    body: (
      <>
        <p>
          Naunas uses its own app with the TikTok and Instagram APIs to publish content to, and read statistics from,
          Naunas&apos;s own social accounts. It is an internal tool: it is not offered to the public, and it only acts on
          accounts that their owner has connected by logging in and approving access.
        </p>
        <ul>
          <li>Nothing is posted without a person choosing the content and pressing publish.</li>
          <li>Access tokens are stored privately and used only for publishing and reading account and video statistics.</li>
          <li>You can revoke access at any time in your TikTok or Instagram settings, and we delete the stored tokens on request.</li>
        </ul>
        <p>
          How we handle data is described in our <a href="/privacy">privacy policy</a>. Use of TikTok and Instagram is
          also subject to their own terms.
        </p>
      </>
    ),
  },
  {
    h: 'Liability',
    body: (
      <p>
        The site is provided as is. To the extent the law allows, we aren&apos;t liable for indirect losses or for
        losses from relying on the free resources. Nothing here limits liability that can&apos;t be limited under UK law.
      </p>
    ),
  },
  {
    h: 'Changes and law',
    body: (
      <p>
        We may update these terms; the date above shows the latest version. These terms are governed by the laws of
        England and Wales.
      </p>
    ),
  },
];

export default function TermsPage() {
  return (
    <CaseStudyShell hideCta>
      <div className="pt-12 pb-10">
        <span className="text-[11px] font-medium text-[#F2613F] uppercase tracking-widest">Terms</span>
        <h1 className="text-4xl md:text-5xl font-bold leading-tight mt-3" style={{ color: '#fff' }}>
          Terms of service
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
