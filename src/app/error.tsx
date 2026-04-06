'use client';

import { useEffect } from 'react';
import { Glitchy404 } from '@/components/ui/Glitchy404';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ background: '#0C0C0C' }}
    >
      {/* Glitchy number — reused for 500 feel */}
      <div className="w-full max-w-3xl">
        <Glitchy404 width={860} height={232} color="#F2613F" />
      </div>

      {/* Copy */}
      <div className="text-center mt-2 mb-10">
        <p className="text-base font-medium mb-2" style={{ color: 'rgba(255,255,255,0.55)' }}>
          Something went wrong.
        </p>
        <p className="text-sm max-w-xs mx-auto leading-relaxed" style={{ color: 'rgba(255,255,255,0.25)' }}>
          An unexpected error occurred. Try again or head back home.
        </p>
      </div>

      {/* CTAs */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={reset}
          className="inline-flex items-center justify-center gap-2 text-sm font-semibold text-[#0C0C0C] px-6 py-3 rounded-full transition-colors glow-accent"
          style={{ background: '#F2613F' }}
        >
          Try again
        </button>
        <a
          href="/"
          className="inline-flex items-center justify-center gap-2 text-sm font-medium px-6 py-3 rounded-full transition-colors"
          style={{ border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.55)' }}
        >
          Back to home
        </a>
      </div>
    </div>
  );
}
