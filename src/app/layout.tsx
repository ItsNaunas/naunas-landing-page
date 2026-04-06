import type { Metadata } from "next";
import "./globals.css";
import { CursorGlow } from "@/components/ui/CursorGlow";

const SITE_URL = 'https://www.naunas.co.uk';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Naunas Systems — Done-For-You Business Automation',
    template: '%s | Naunas Systems',
  },
  description:
    'Naunas Systems installs done-for-you client lifecycle automation for service businesses. Stop losing leads — get a free AI audit and find exactly where your revenue is leaking.',
  keywords: [
    'business automation',
    'client lifecycle automation',
    'done-for-you automation',
    'CRM automation',
    'lead follow-up automation',
    'service business automation',
    'automation agency UK',
    'revenue leak audit',
    'n8n automation',
    'Naunas Systems',
  ],
  authors: [{ name: 'Naunas Systems', url: SITE_URL }],
  creator: 'Naunas Systems',
  openGraph: {
    type: 'website',
    url: SITE_URL,
    siteName: 'Naunas Systems',
    title: 'Naunas Systems — Done-For-You Business Automation',
    description:
      'Stop losing leads between the cracks. Naunas Systems installs the automation infrastructure that runs your client lifecycle end to end.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Naunas Systems — Done-For-You Business Automation',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Naunas Systems — Done-For-You Business Automation',
    description:
      'Stop losing leads between the cracks. Get a free AI audit and find exactly where your revenue is leaking.',
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
    'Done-for-you client lifecycle automation for service businesses. We install the systems that turn chaotic lead flow into controlled revenue.',
  founder: { '@type': 'Person', name: 'Naufal Nassor' },
  sameAs: [
    'https://www.linkedin.com/in/naufal-nassor-0a1b6936b/',
    'https://www.instagram.com/naunas_builds/',
    'https://www.tiktok.com/@naunas_builds',
    'https://github.com/ItsNaunas',
  ],
  areaServed: { '@type': 'Country', name: 'United Kingdom' },
  serviceType: [
    'Business Automation',
    'Client Lifecycle Infrastructure',
    'CRM Automation',
    'Custom Software Development',
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
      </body>
    </html>
  );
}
