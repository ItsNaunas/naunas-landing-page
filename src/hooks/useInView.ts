import { useEffect, useRef, useState } from 'react';

/**
 * Fires once when the element enters the viewport.
 * Disconnects the observer after first trigger so it never fires again.
 * Used to drive CSS entrance animations (.will-animate → .is-visible).
 */
export function useInView(threshold = 0.12) {
  const ref = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, inView };
}
