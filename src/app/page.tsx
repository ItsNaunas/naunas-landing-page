'use client';

import { useState } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Hero } from '@/components/sections/Hero';
import { Problem } from '@/components/sections/Problem';
import { IntegrationBar } from '@/components/sections/IntegrationBar';
import { HowItWorks } from '@/components/sections/HowItWorks';
import { WhatYouGet } from '@/components/sections/WhatYouGet';
import { Comparison } from '@/components/sections/Comparison';
import { CaseStudies } from '@/components/sections/CaseStudies';
import { Testimonials } from '@/components/sections/Testimonials';
import { About } from '@/components/sections/About';
import { CtaBanner } from '@/components/sections/CtaBanner';
import { Faq } from '@/components/sections/Faq';
import { Contact } from '@/components/sections/Contact';
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
        <Problem />
        {/* <LeakMapSection /> hidden for now (2026-10-11) */}
        <WhatYouGet />
        <CaseStudies />
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
