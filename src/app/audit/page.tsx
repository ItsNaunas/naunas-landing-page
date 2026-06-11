import type { Metadata } from 'next';
import { AuditQualifyForm } from '@/components/sections/AuditQualifyForm';

export const metadata: Metadata = {
  title: 'Free Systems Audit',
  description:
    'Answer 7 quick questions to see if a Naunas Systems install is the right fit — and prep your free audit call so it isn’t wasted.',
};

export default function AuditPage() {
  return <AuditQualifyForm />;
}
