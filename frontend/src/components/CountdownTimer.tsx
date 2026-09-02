'use client';

import { useEffect, useState } from 'react';

type Remaining = { days: number; hours: number; minutes: number; seconds: number };

function diff(target: number): Remaining | null {
  const ms = target - Date.now();
  if (ms <= 0) return null;

  return {
    days: Math.floor(ms / 86_400_000),
    hours: Math.floor((ms / 3_600_000) % 24),
    minutes: Math.floor((ms / 60_000) % 60),
    seconds: Math.floor((ms / 1000) % 60),
  };
}

function Unit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="tabular-nums text-2xl font-semibold sm:text-3xl">
        {String(value).padStart(2, '0')}
      </span>
      <span className="mt-0.5 text-[11px] uppercase tracking-wide text-slate-400">{label}</span>
    </div>
  );
}

/**
 * A live countdown to the admission test date, ticking every second in the
 * browser.
 *
 * The value comes from a prop set in the server component, not invented here -
 * it is the same date this platform's own blog post announces. Ticking is
 * deliberately client-only: rendering `null` until mount, then computing the
 * first real value in an effect, is what keeps the server-rendered HTML and the
 * client's first paint identical. Starting the clock during render instead would
 * make the two disagree by however many milliseconds passed in between, which
 * React treats as a hydration error.
 */
export default function CountdownTimer({ targetIso }: { targetIso: string }) {
  const [remaining, setRemaining] = useState<Remaining | null | 'loading'>('loading');

  useEffect(() => {
    const target = new Date(targetIso).getTime();
    const tick = () => setRemaining(diff(target));

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetIso]);

  if (remaining === 'loading') {
    // Matches the server-rendered shape exactly, just with placeholders, so
    // there is nothing for React to complain about on the first client render.
    return (
      <div className="flex gap-5 sm:gap-8" aria-hidden>
        {['Days', 'Hours', 'Min', 'Sec'].map((label) => (
          <Unit key={label} value={0} label={label} />
        ))}
      </div>
    );
  }

  if (remaining === null) {
    return <p className="text-sm text-slate-300">Test day is here — check the blog for updates.</p>;
  }

  return (
    <div className="flex gap-5 sm:gap-8" role="timer" aria-live="off">
      <Unit value={remaining.days} label="Days" />
      <Unit value={remaining.hours} label="Hours" />
      <Unit value={remaining.minutes} label="Min" />
      <Unit value={remaining.seconds} label="Sec" />
    </div>
  );
}
