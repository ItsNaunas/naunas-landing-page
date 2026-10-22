'use client';

import { useState } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Hero } from '@/components/sections/Hero';
import { JourneyVideo } from '@/components/sections/JourneyVideo';
import dynamic from 'next/dynamic';

// Below the fold: each section is its own chunk, still server-rendered (no layout shift), so the hero and the
// video hydrate first and the page's first paint doesn't wait on the animation libraries these sections use.
const IntegrationBar = dynamic(() => import('@/components/sections/IntegrationBar').then((m) => m.IntegrationBar));
const Problem = dynamic(() => import('@/components/sections/Problem').then((m) => m.Problem));
const CaseStudies = dynamic(() => import('@/components/sections/CaseStudies').then((m) => m.CaseStudies));
const WhatYouGet = dynamic(() => import('@/components/sections/WhatYouGet').then((m) => m.WhatYouGet));
const Testimonials = dynamic(() => import('@/components/sections/Testimonials').then((m) => m.Testimonials));
const HowItWorks = dynamic(() => import('@/components/sections/HowItWorks').then((m) => m.HowItWorks));
const Comparison = dynamic(() => import('@/components/sections/Comparison').then((m) => m.Comparison));
const About = dynamic(() => import('@/components/sections/About').then((m) => m.About));
const Faq = dynamic(() => import('@/components/sections/Faq').then((m) => m.Faq));
const Contact = dynamic(() => import('@/components/sections/Contact').then((m) => m.Contact));
const CtaBanner = dynamic(() => import('@/components/sections/CtaBanner').then((m) => m.CtaBanner));
// import { LeakMapSection } from '@/components/sections/LeakMapSection';
import { EnquiryModal } from '@/components/ui/EnquiryModal';

export default function Home() {
  const [auditOpen, setAuditOpen] = useState(false);

  return (
    <>
      <Navbar onAuditClick={() => setAuditOpen(true)} />
      <main>
        <Hero onAuditClick={() => setAuditOpen(true)} />
        <IntegrationBar />
        <JourneyVideo onAuditClick={() => setAuditOpen(true)} />
        <Problem />
        {/* <LeakMapSection /> hidden for now (2026-10-11) */}
        <CaseStudies />
        <WhatYouGet />
        <Testimonials />
        <HowItWorks />
        <Comparison />
        <About />
        <Faq />
        <Contact />
        <CtaBanner onAuditClick={() => setAuditOpen(true)} />
      </main>
      <Footer onAuditClick={() => setAuditOpen(true)} />
      <EnquiryModal isOpen={auditOpen} onClose={() => setAuditOpen(false)} />
    </>
  );
}
