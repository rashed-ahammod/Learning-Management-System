'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Counts up from zero to a real value once the number scrolls into view.
 *
 * The value itself is not invented here - it arrives as a prop computed
 * server-side from a live API call (see the hero's stats row in page.tsx).
 * This only controls how it's revealed: rendering 0 on the server and for the
 * very first client paint is what keeps hydration consistent, exactly like
 * CountdownTimer - the count-up itself only starts once mounted and in view.
 */
export default function AnimatedNumber({
  value,
  durationMs = 1200,
}: {
  value: number;
  durationMs?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Nothing to count up to, and nothing to animate for a visitor who has
    // asked their system to reduce motion - both just show the real number.
    // Deferred to a frame rather than called inline, so this effect only ever
    // schedules an update instead of applying one synchronously itself.
    if (value === 0 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      requestAnimationFrame(() => setDisplay(value));
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();

        const start = performance.now();

        function step(now: number) {
          const progress = Math.min((now - start) / durationMs, 1);
          // Ease-out: fast at first, settling into the real number rather than
          // stopping abruptly - matches the feel of the rest of the page.
          const eased = 1 - (1 - progress) ** 3;
          setDisplay(Math.round(eased * value));

          if (progress < 1) requestAnimationFrame(step);
        }

        requestAnimationFrame(step);
      },
      { threshold: 0.5 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [value, durationMs]);

  return (
    <span ref={ref} className="tabular-nums">
      {display}
    </span>
  );
}
