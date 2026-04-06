'use client';

import { useState } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Hero } from '@/components/sections/Hero';
import { Problem } from '@/components/sections/Problem';
import { IntegrationBar } from '@/components/sections/IntegrationBar';
import { HowItWorks } from '@/components/sections/HowItWorks';
import { WhatYouGet } from '@/components/sections/WhatYouGet';
import { Pricing } from '@/components/sections/Pricing';
import { Comparison } from '@/components/sections/Comparison';
import { CaseStudies } from '@/components/sections/CaseStudies';
import { Testimonials } from '@/components/sections/Testimonials';
import { About } from '@/components/sections/About';
import { CtaBanner } from '@/components/sections/CtaBanner';
import { Faq } from '@/components/sections/Faq';
import { Contact } from '@/components/sections/Contact';
import { StatBar } from '@/components/sections/StatBar';
import { RevenueCalculator } from '@/components/sections/RevenueCalculator';
import { AuditModal } from '@/components/ui/AuditModal';

export default function Home() {
  const [auditOpen, setAuditOpen] = useState(false);

  return (
    <>
      <Navbar onAuditClick={() => setAuditOpen(true)} />
      <main>
        <Hero onAuditClick={() => setAuditOpen(true)} />
        <IntegrationBar />
        <Problem />
        <StatBar />
        <HowItWorks />
        <WhatYouGet />
        <Pricing />
        <RevenueCalculator />
        <Comparison />
        <CaseStudies />
        <Testimonials />
        <About />
        <Faq />
        <Contact />
        <CtaBanner onAuditClick={() => setAuditOpen(true)} />
      </main>
      <Footer onAuditClick={() => setAuditOpen(true)} />
      <AuditModal isOpen={auditOpen} onClose={() => setAuditOpen(false)} />
    </>
  );
}
