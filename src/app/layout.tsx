import type { Metadata } from "next";
import "./globals.css";
import { CursorGlow } from "@/components/ui/CursorGlow";
import { LeadMagnetPopup } from "@/components/ui/LeadMagnetPopup";
import { AttributionTracker } from "@/components/ui/AttributionTracker";
import { Analytics } from "@vercel/analytics/next";

const SITE_URL = 'https://www.naunas.co.uk';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Naunas Systems | The Client System for high-ticket service businesses',
    template: '%s | Naunas Systems',
  },
  description:
    'The client system behind businesses that sell big projects: instant enquiry replies, proposals signed and paid in one link, client portals, referrals, and every lead traced to its source. Built in your own accounts. Start with a free audit.',
  keywords: [
    'client system',
    'client onboarding automation',
    'client portal',
    'proposal to payment',
    'lead follow-up automation',
    'design studio CRM',
    'high-ticket service business systems',
    'lead attribution',
    'free business audit',
    'Naunas Systems',
  ],
  authors: [{ name: 'Naunas Systems', url: SITE_URL }],
  creator: 'Naunas Systems',
  openGraph: {
    type: 'website',
    url: SITE_URL,
    siteName: 'Naunas Systems',
    title: 'Naunas Systems | The Client System for high-ticket service businesses',
    description:
      'From first enquiry to final handover, and the referral after it. The client system behind high-ticket service businesses.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Naunas Systems: the Client System',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Naunas Systems | The Client System for high-ticket service businesses',
    description:
      'From first enquiry to final handover, and the referral after it. Start with a free audit.',
    images: ['/og-image.png'],
    creator: '@naunas_builds',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  alternates: {
    canonical: SITE_URL,
  },
  verification: {
    google: 'MeJnwX727ocC7tOvgJGneDvcuqGpEMDq8Xuhv7WWWWY',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'ProfessionalService',
  name: 'Naunas Systems',
  url: SITE_URL,
  description:
    'The client system behind high-ticket service businesses: enquiry, proposal, payment, onboarding, client portal, referrals and attribution, built in the client’s own accounts.',
  founder: { '@type': 'Person', name: 'Naufal Nassor' },
  sameAs: [
    'https://www.linkedin.com/in/naufal-nassor-0a1b6936b/',
    'https://www.instagram.com/naunas_builds/',
    'https://www.tiktok.com/@naunas_builds',
    'https://github.com/ItsNaunas',
  ],
  areaServed: [{ '@type': 'Country', name: 'United States' }, { '@type': 'Country', name: 'United Kingdom' }],
  serviceType: [
    'Client onboarding systems',
    'Client portals',
    'Proposal and payment automation',
    'CRM and lead attribution',
    'Custom software development',
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link
          rel="stylesheet"
          href="https://api.fontshare.com/v2/css?f[]=clash-display@400,500,600,700&f[]=satoshi@400,500,700&display=swap"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-[#0C0C0C] text-white">
        <CursorGlow />
        {children}
        <AttributionTracker />
        <LeadMagnetPopup />
        <Analytics />
      </body>
    </html>
  );
}
