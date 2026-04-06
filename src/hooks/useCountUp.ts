import { useEffect, useRef, useState } from 'react';

export function useCountUp(target: number, duration = 1600, inView = false): number {
  const [count, setCount] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (!inView || started.current) return;
    started.current = true;

    const startTime = performance.now();

    function easeOutCubic(t: number) {
      return 1 - Math.pow(1 - t, 3);
    }

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      setCount(Math.round(easeOutCubic(progress) * target));
      if (progress < 1) requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }, [inView, target, duration]);

  return count;
}
