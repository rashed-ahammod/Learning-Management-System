'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

/**
 * A bottom bar that appears once the hero has scrolled out of view.
 *
 * The hero already has this exact call to action, so showing this bar
 * immediately would just be noise. It earns its place by appearing only once
 * the original button has scrolled off screen and the visitor might otherwise
 * have to hunt for it again - and it can be dismissed, because a bar that
 * cannot be closed is a worse trade than the conversions it buys.
 */
export default function StickyCta({ href, label }: { href: string; label: string }) {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const hero = document.getElementById('hero-cta');
    if (!hero) return;

    const observer = new IntersectionObserver(([entry]) => setVisible(!entry.isIntersecting), {
      rootMargin: '-72px 0px 0px 0px', // roughly the header's height
    });

    observer.observe(hero);
    return () => observer.disconnect();
  }, []);

  if (dismissed || !visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-800 bg-slate-900/95 backdrop-blur supports-[backdrop-filter]:bg-slate-900/80">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-3">
        <p className="hidden text-sm text-slate-300 sm:block">
          Applications are open now — every day of prep counts.
        </p>
        <div className="ml-auto flex items-center gap-3">
          <Link
            href={href}
            className="rounded-md bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-200"
          >
            {label}
          </Link>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            aria-label="Dismiss"
            className="rounded-md p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
