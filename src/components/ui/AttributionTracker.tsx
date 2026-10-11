'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { captureTouch } from '@/lib/attribution';

export function AttributionTracker() {
  const pathname = usePathname();
  useEffect(() => { captureTouch(); }, [pathname]);
  return null;
}
