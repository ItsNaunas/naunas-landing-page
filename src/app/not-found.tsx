import Link from 'next/link';
import { Glitchy404 } from '@/components/ui/Glitchy404';

export default function NotFound() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ background: '#0C0C0C' }}
    >
      {/* Glitchy 404 */}
      <div className="w-full max-w-3xl">
        <Glitchy404 width={860} height={232} color="#F2613F" />
      </div>

      {/* Copy */}
      <div className="text-center mt-2 mb-10">
        <p className="text-base font-medium mb-2" style={{ color: 'rgba(255,255,255,0.55)' }}>
          This page doesn't exist.
        </p>
        <p className="text-sm max-w-xs mx-auto leading-relaxed" style={{ color: 'rgba(255,255,255,0.25)' }}>
          Looks like this part of the system hasn't been built yet.
        </p>
      </div>

      {/* CTA */}
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm font-semibold text-[#0C0C0C] px-6 py-3 rounded-full transition-colors glow-accent"
        style={{ background: '#F2613F' }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M11.5 7h-9M5.5 3.5L2 7l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Back to home
      </Link>
    </div>
  );
}
