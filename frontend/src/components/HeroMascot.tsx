/**
 * A small, friendly character for the hero - hand-built as inline SVG rather
 * than a raster illustration, since there is no image pipeline in this app and
 * no image-generation tool available to produce one. Flat shapes, a big
 * blinking face and a graduation cap read as "cartoon" without needing a drawn
 * human figure - which also sidesteps ever having to make a call about how
 * that figure looks.
 *
 * No 'use client' here: every bit of motion is a CSS @keyframes animation
 * (see globals.css), so this renders once on the server and needs no
 * JavaScript at all to be alive on screen.
 */
export default function HeroMascot() {
  return (
    <div className="relative mx-auto aspect-square w-48 sm:w-64 lg:w-72" aria-hidden>
      {/* The character itself, bobbing gently. */}
      <svg
        viewBox="0 0 240 240"
        className="absolute inset-0 h-full w-full motion-safe:animate-[float_6s_ease-in-out_infinite]"
      >
        <defs>
          <linearGradient id="mascot-body" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#818cf8" />
            <stop offset="100%" stopColor="#a78bfa" />
          </linearGradient>
        </defs>

        {/* Arms - drawn first so the body sits over them. */}
        <rect x="46" y="132" width="34" height="16" rx="8" fill="#818cf8" />
        <rect x="160" y="132" width="34" height="16" rx="8" fill="#818cf8" />

        {/* Body */}
        <rect x="58" y="72" width="124" height="112" rx="36" fill="url(#mascot-body)" />

        {/* Cap - a small independent wiggle, as if it just settled into place. */}
        <g
          style={{ transformOrigin: '120px 58px' }}
          className="motion-safe:animate-[wiggle_5s_ease-in-out_infinite]"
        >
          <rect x="105" y="50" width="30" height="10" rx="2" fill="#1e1b4b" />
          <polygon points="120,26 158,50 120,58 82,50" fill="#312e81" />
          <line x1="150" y1="47" x2="150" y2="68" stroke="#312e81" strokeWidth="2" />
          <circle cx="150" cy="70" r="4" fill="#312e81" />
        </g>

        {/* Face */}
        <g style={{ transformOrigin: '95px 118px' }} className="motion-safe:animate-[blink_4s_ease-in-out_infinite]">
          <circle cx="95" cy="118" r="12" fill="white" />
          <circle cx="97" cy="120" r="5" fill="#1e1b4b" />
        </g>
        <g
          style={{ transformOrigin: '145px 118px', animationDelay: '-0.15s' }}
          className="motion-safe:animate-[blink_4s_ease-in-out_infinite]"
        >
          <circle cx="145" cy="118" r="12" fill="white" />
          <circle cx="147" cy="120" r="5" fill="#1e1b4b" />
        </g>
        <path
          d="M100 148q20 16 40 0"
          stroke="#1e1b4b"
          strokeWidth="4"
          strokeLinecap="round"
          fill="none"
        />

        {/* A small open book held in front - what the character is here for. */}
        <g transform="translate(88, 164)">
          <rect x="0" y="0" width="30" height="20" rx="3" fill="#eef2ff" />
          <rect x="32" y="0" width="30" height="20" rx="3" fill="#eef2ff" />
          <line x1="31" y1="2" x2="31" y2="18" stroke="#c7d2fe" strokeWidth="2" />
        </g>
      </svg>

      {/* Floating decorations, each bobbing on its own rhythm. */}
      <svg
        viewBox="0 0 24 24"
        className="absolute -top-2 left-0 h-8 w-8 text-amber-300 motion-safe:animate-[float_5s_ease-in-out_infinite]"
        fill="currentColor"
      >
        <path d="M12 0 L14.2 9.8 L24 12 L14.2 14.2 L12 24 L9.8 14.2 L0 12 L9.8 9.8 Z" />
      </svg>

      <svg
        viewBox="0 0 24 24"
        style={{ animationDelay: '-2s' }}
        className="absolute top-6 -right-2 h-6 w-6 text-sky-300 motion-safe:animate-[float_7s_ease-in-out_infinite]"
        fill="currentColor"
      >
        <path d="M12 0 L14.2 9.8 L24 12 L14.2 14.2 L12 24 L9.8 14.2 L0 12 L9.8 9.8 Z" />
      </svg>

      <div
        style={{ animationDelay: '-1s' }}
        className="absolute -right-3 bottom-10 flex h-9 w-9 items-center justify-center rounded-full bg-emerald-400 text-white shadow-lg shadow-emerald-500/30 motion-safe:animate-[float_6s_ease-in-out_infinite]"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-5 w-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <div
        style={{ animationDelay: '-3.5s' }}
        className="absolute -left-2 bottom-4 h-8 w-8 rounded-full bg-white/10 motion-safe:animate-[wiggle_4s_ease-in-out_infinite]"
      >
        <svg viewBox="0 0 24 24" className="h-full w-full p-1.5" fill="none">
          <rect x="2" y="15" width="16" height="4" rx="1" fill="#fbbf24" transform="rotate(-35 10 17)" />
          <polygon points="16,10 20,14 22,8" fill="#f59e0b" transform="rotate(-35 10 17)" />
        </svg>
      </div>
    </div>
  );
}
