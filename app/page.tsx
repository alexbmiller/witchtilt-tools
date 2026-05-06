"use client";

import { useMemo, useState } from "react";
import { buildProbabilityTable } from "@/lib/probability";

const DECK_SIZE = 12;

function pct(p: number): string {
  if (p >= 0.9995) return "100%";
  if (p < 0.0005) return "<0.1%";
  return `${(p * 100).toFixed(1)}%`;
}

function heatColor(p: number): string {
  // Map probability to a muted gold ramp. Low = dim, high = bright.
  const opacity = 0.08 + Math.min(p, 1) * 0.55;
  return `rgba(212, 175, 55, ${opacity.toFixed(3)})`;
}

export default function Home() {
  const [target, setTarget] = useState(4);
  const [goingFirst, setGoingFirst] = useState(true);

  const table = useMemo(() => buildProbabilityTable(target, goingFirst, 6, 4), [target, goingFirst]);

  const shareText = useMemo(() => {
    const lines = [
      `Rune odds — ${target} of color in 12-card rune deck, going ${goingFirst ? "first" : "second"}:`,
      ...table.map(
        (row) =>
          `T${row.turn} (${row.runesSeen} seen): ≥1 ${pct(row.probabilities[0])} | ≥2 ${pct(
            row.probabilities[1],
          )} | ≥3 ${pct(row.probabilities[2])} | ≥4 ${pct(row.probabilities[3])}`,
      ),
      "",
      "via runeodds.app", // placeholder for your real domain later
    ];
    return lines.join("\n");
  }, [table, target, goingFirst]);

  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // fallback noop
    }
  };

  return (
    <main className="min-h-screen px-4 py-10 sm:py-16">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <header className="mb-10 border-b border-ink-700 pb-6">
          <div className="flex items-baseline justify-between">
            <h1 className="font-mono text-xl tracking-tight text-ink-100">
              <span className="text-accent">RUNE</span>
              <span className="text-ink-400">/</span>
              <span>ODDS</span>
            </h1>
            <span className="font-mono text-xs text-ink-500">v0.1 · riftbound tcg</span>
          </div>
          <p className="mt-3 max-w-prose text-sm text-ink-300">
            Hypergeometric probability for a 12-card rune deck. Tells you the odds of drawing
            what you actually need by the turn you actually need it.
          </p>
        </header>

        {/* Controls */}
        <section className="mb-8 grid gap-6 sm:grid-cols-2">
          <div>
            <label className="block font-mono text-xs uppercase tracking-wider text-ink-400">
              Target color in rune deck
            </label>
            <div className="mt-2 flex items-center gap-3">
              <input
                type="range"
                min={0}
                max={DECK_SIZE}
                step={1}
                value={target}
                onChange={(e) => setTarget(parseInt(e.target.value, 10))}
                className="flex-1 accent-accent"
                aria-label="Number of target color runes in deck"
              />
              <div className="w-16 rounded-sm border border-ink-700 bg-ink-900 px-3 py-1.5 text-center font-mono text-base text-ink-100">
                {target}
                <span className="text-ink-500">/12</span>
              </div>
            </div>
            <p className="mt-2 font-mono text-xs text-ink-500">
              How many runes of one color you're running.
            </p>
          </div>

          <div>
            <label className="block font-mono text-xs uppercase tracking-wider text-ink-400">
              Turn order
            </label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                onClick={() => setGoingFirst(true)}
                className={`rounded-sm border px-3 py-2 font-mono text-sm transition ${
                  goingFirst
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-ink-700 text-ink-300 hover:border-ink-600 hover:text-ink-100"
                }`}
              >
                Going first
              </button>
              <button
                onClick={() => setGoingFirst(false)}
                className={`rounded-sm border px-3 py-2 font-mono text-sm transition ${
                  !goingFirst
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-ink-700 text-ink-300 hover:border-ink-600 hover:text-ink-100"
                }`}
              >
                Going second
              </button>
            </div>
            <p className="mt-2 font-mono text-xs text-ink-500">
              First channels 2 on T1; second channels 3.
            </p>
          </div>
        </section>

        {/* Setup explainer */}
        <section className="mb-8 rounded-sm border border-ink-700 bg-ink-900/60 p-5">
          <h2 className="font-mono text-xs uppercase tracking-wider text-ink-400">
            How channeling works
          </h2>
          <p className="mt-3 max-w-prose font-mono text-xs leading-relaxed text-ink-300">
            Your 12-card rune deck sits face-down at the start of the game. You don't see any
            runes until your first turn. Going first, you channel 2 on T1, then +2 each turn
            after. Going second, you channel 3 on T1, then +2 each turn. The table below shows
            the cumulative probabilities by the end of each turn.
          </p>
        </section>

        {/* Main table */}
        <section className="mb-8">
          <h2 className="mb-3 font-mono text-xs uppercase tracking-wider text-ink-400">
            By end of turn
          </h2>
          <div className="overflow-hidden rounded-sm border border-ink-700">
            <table className="w-full border-collapse font-mono text-sm">
              <thead className="bg-ink-900">
                <tr>
                  <th className="border-b border-ink-700 px-3 py-2.5 text-left text-xs font-normal uppercase tracking-wider text-ink-400">
                    Turn
                  </th>
                  <th className="border-b border-ink-700 px-3 py-2.5 text-left text-xs font-normal uppercase tracking-wider text-ink-400">
                    Seen
                  </th>
                  {[1, 2, 3, 4].map((n) => (
                    <th
                      key={n}
                      className="border-b border-ink-700 px-3 py-2.5 text-right text-xs font-normal uppercase tracking-wider text-ink-400"
                    >
                      ≥ {n}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.map((row) => (
                  <tr key={row.turn} className="border-b border-ink-800 last:border-b-0">
                    <td className="px-3 py-2.5 text-ink-100">T{row.turn}</td>
                    <td className="px-3 py-2.5 text-ink-400">
                      {row.runesSeen}
                      <span className="text-ink-600">/12</span>
                    </td>
                    {row.probabilities.map((p, i) => (
                      <td
                        key={i}
                        className="px-3 py-2.5 text-right text-ink-100"
                        style={{ backgroundColor: heatColor(p) }}
                      >
                        {pct(p)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 font-mono text-xs text-ink-500">
            Cell shading scales with probability. Read across to see how odds climb each turn.
          </p>
        </section>

        {/* Share */}
        <section className="mb-12">
          <button
            onClick={handleCopy}
            className="rounded-sm border border-ink-700 bg-ink-900 px-4 py-2 font-mono text-sm text-ink-200 transition hover:border-accent hover:text-accent"
          >
            {copied ? "✓ copied" : "copy share text"}
          </button>
        </section>

        {/* Footer */}
        <footer className="border-t border-ink-700 pt-6 font-mono text-xs text-ink-500">
          <p>
            Built for Riftbound players. Math: hypergeometric distribution over a 12-card rune deck.
          </p>
          <p className="mt-1">
            Not affiliated with Riot Games or UVS Games. Riftbound is a trademark of Riot Games.
          </p>
        </footer>
      </div>
    </main>
  );
}
