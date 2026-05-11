export default function Hero() {
  return (
    <section className="flex min-h-[80vh] flex-col items-center justify-center px-6 py-20 text-center">
      <Sigil />
      <h1 className="mt-10 font-display text-5xl leading-none tracking-wider text-accent sm:text-6xl md:text-7xl">
        WITCHTILT
      </h1>
      <p className="mt-6 max-w-md text-base text-ink-200 sm:text-lg">
        Tools and arguments for trading card players.
      </p>
      <a
        href="https://youtube.com/@witchtilt"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-10 inline-flex items-center gap-2 rounded-sm border border-ink-700 px-4 py-2 font-mono text-sm text-ink-300 transition hover:border-accent hover:text-accent"
      >
        <span aria-hidden="true">→</span> YouTube
      </a>
    </section>
  );
}

function Sigil() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="-110 -110 220 220"
      width="120"
      height="120"
      role="img"
      aria-label="WitchTilt sigil"
    >
      <path
        d="M 0 -100 L 87 -50 L 87 50 L 0 100 L -87 50 L -87 -50 Z"
        stroke="#d4af37"
        strokeWidth="2"
        fill="none"
        strokeDasharray="6 5"
        strokeLinejoin="round"
      />
      <g
        fill="none"
        stroke="#d4af37"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <g>
          <path d="M 0 -70 L 9 -48 L 0 -38 L -9 -48 Z" />
        </g>
        <g transform="rotate(60)">
          <path d="M 0 -70 L 9 -48 L 0 -38 L -9 -48 Z" />
        </g>
        <g transform="rotate(120)">
          <path d="M 0 -70 L 9 -48 L 0 -38 L -9 -48 Z" />
        </g>
        <g transform="rotate(180)">
          <path d="M 0 -70 L 9 -48 L 0 -38 L -9 -48 Z" />
        </g>
        <g transform="rotate(240)">
          <path d="M 0 -70 L 9 -48 L 0 -38 L -9 -48 Z" />
        </g>
        <g transform="rotate(300)">
          <path d="M 0 -70 L 9 -48 L 0 -38 L -9 -48 Z" />
        </g>
      </g>
      <g fill="#d4af37">
        <circle cx="0" cy="-58" r="2.5" />
        <g transform="rotate(60)">
          <circle cx="0" cy="-58" r="2.5" />
        </g>
        <g transform="rotate(120)">
          <circle cx="0" cy="-58" r="2.5" />
        </g>
        <g transform="rotate(180)">
          <circle cx="0" cy="-58" r="2.5" />
        </g>
        <g transform="rotate(240)">
          <circle cx="0" cy="-58" r="2.5" />
        </g>
        <g transform="rotate(300)">
          <circle cx="0" cy="-58" r="2.5" />
        </g>
      </g>
      <circle cx="0" cy="0" r="29" fill="#0a0b0d" stroke="#d4af37" strokeWidth="1.5" />
      <circle
        cx="0"
        cy="0"
        r="22"
        fill="none"
        stroke="#d4af37"
        strokeWidth="0.8"
        strokeDasharray="2 3"
      />
      <circle cx="0" cy="0" r="13" fill="none" stroke="#d4af37" strokeWidth="1.5" />
      <path d="M -9 -9 L 9 9" stroke="#d4af37" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="-4.5" cy="4.5" r="2.5" fill="#d4af37" />
      <circle cx="4.5" cy="-4.5" r="2" fill="none" stroke="#d4af37" strokeWidth="1" />
    </svg>
  );
}
