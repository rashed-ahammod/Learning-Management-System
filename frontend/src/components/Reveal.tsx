'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Fades an element up into place the first time it scrolls into view.
 *
 * Fires once, not on every scroll past - re-triggering every time the visitor
 * scrolls up and back down is the difference between a landing page that feels
 * alive and one that feels like it's nagging you. The observer disconnects
 * itself the moment it has fired.
 *
 * `motion-reduce:` classes make this a no-op for anyone who has asked their
 * system for reduced motion: the content is simply visible immediately,
 * because an entrance animation is decoration, never a requirement to see it.
 */
export default function Reveal({
  children,
  delayMs = 0,
  className = '',
}: {
  children: React.ReactNode;
  delayMs?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: visible ? `${delayMs}ms` : '0ms' }}
      className={`transition-all duration-700 ease-out motion-reduce:transition-none motion-reduce:opacity-100 motion-reduce:translate-y-0 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
      } ${className}`}
    >
      {children}
    </div>
  );
}
