"use client";

import { useEffect, useRef, useState } from "react";
import { Info } from "lucide-react";

export default function InfoPopover() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Close on outside click + Escape.
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="About Rune Odds"
        className="inline-flex items-center justify-center rounded-sm p-0.5 text-ink-400 transition hover:text-ink-200 focus:outline-none focus-visible:text-accent"
      >
        <Info size={14} strokeWidth={2} />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="How this works"
          className="absolute left-0 top-full z-20 mt-2 w-[320px] max-w-[calc(100vw-2rem)] rounded-sm border border-accent bg-ink-900 p-4 font-mono text-xs leading-relaxed text-ink-300 shadow-lg"
        >
          <h3 className="font-mono text-xs uppercase tracking-wider text-ink-400">
            How this works
          </h3>
          <p className="mt-2">
            Rune Odds uses the hypergeometric distribution — the standard model for drawing
            without replacement from a deck with known composition. It answers: given a 12-card
            rune deck with this color makeup, what are the odds of seeing the runes I need by a
            specific turn?
          </p>
          <p className="mt-3 text-ink-200">Two modes, two questions:</p>
          <ul className="mt-2 space-y-2">
            <li>
              <span className="text-accent">Deckbuilding</span> assumes a fresh shuffle. Use
              when you&apos;re designing a deck and want to know what to expect on a new game.
            </li>
            <li>
              <span className="text-accent">Mid-game</span> handles the situation where
              you&apos;ve already seen some runes and recycled others to the bottom. The math
              runs over the unknown segment of the deck only.
            </li>
          </ul>
          <p className="mt-3 text-ink-400">
            Recycled runes are still in the deck — they&apos;re just no longer in the unknown
            pile until the deck cycles. Mid-game mode flags rows where the calculation would
            cross that boundary.
          </p>
        </div>
      )}
    </div>
  );
}
