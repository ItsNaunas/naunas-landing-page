import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: { absolute: 'Naunas Ops' },
  robots: { index: false, follow: false },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen w-full" style={{ background: '#0C0C0C' }}>{children}</div>;
}
