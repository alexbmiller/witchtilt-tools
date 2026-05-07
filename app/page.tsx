"use client";

import { useMemo, useState } from "react";
import { buildProbabilityTable, buildMidGameTable, runesSeenByTurn } from "@/lib/probability";

const DECK_SIZE = 12;

type Mode = "deckbuilding" | "midgame";

function pct(p: number): string {
  if (p >= 0.9995) return "100%";
  if (p < 0.0005) return "<0.1%";
  return `${(p * 100).toFixed(1)}%`;
}

function heatColor(p: number): string {
  const opacity = 0.08 + Math.min(p, 1) * 0.55;
  return `rgba(212, 175, 55, ${opacity.toFixed(3)})`;
}

const ACTIVE_BTN = "border-accent bg-accent/10 text-accent";
const INACTIVE_BTN = "border-ink-700 text-ink-300 hover:border-ink-600 hover:text-ink-100";
const TURN_OPTIONS = [1, 2, 3, 4, 5, 6];

export default function Home() {
  const [mode, setMode] = useState<Mode>("deckbuilding");
  const [target, setTarget] = useState(4);
  const [goingFirst, setGoingFirst] = useState(true);

  // Mid-game inputs — raw state; safe/clamped values derived below.
  const [currentTurn, setCurrentTurn] = useState(3);
  const [pileSize, setPileSize] = useState(6);
  const [targetInRemaining, setTargetInRemaining] = useState(2);

  // Derived constraints for mid-game
  const channeled = runesSeenByTurn(currentTurn, goingFirst);
  const maxPile = DECK_SIZE - channeled;
  const safePile = Math.min(pileSize, maxPile);
  const safeTarget = Math.min(targetInRemaining, safePile);

  // Tables
  const deckTable = useMemo(
    () => buildProbabilityTable(target, goingFirst, 6, 4),
    [target, goingFirst],
  );

  const midTable = useMemo(
    () =>
      buildMidGameTable({
        targetInRemaining: safeTarget,
        remainingPileSize: safePile,
        goingFirst,
        currentTurn,
      }),
    [safeTarget, safePile, goingFirst, currentTurn],
  );

  const hasBoundaryWarning = midTable.some((r) => r.exceedsBoundary);

  // Share text adapts to active mode and includes game state for mid-game.
  const shareText = useMemo(() => {
    if (mode === "deckbuilding") {
      return [
        `Rune odds — ${target} of color in 12-card rune deck, going ${goingFirst ? "first" : "second"}:`,
        ...deckTable.map(
          (row) =>
            `T${row.turn} (${row.runesSeen} seen): ≥1 ${pct(row.probabilities[0])} | ≥2 ${pct(row.probabilities[1])} | ≥3 ${pct(row.probabilities[2])} | ≥4 ${pct(row.probabilities[3])}`,
        ),
        "",
        "via runeodds.app",
      ].join("\n");
    }
    return [
      `Mid-game rune odds — T${currentTurn} going ${goingFirst ? "first" : "second"}, ${safeTarget} target / ${safePile} unknown remaining:`,
      ...midTable.map(
        (row) =>
          `T${row.turn} (+${row.draws}): ≥1 ${pct(row.probabilities[0])} | ≥2 ${pct(row.probabilities[1])}${row.exceedsBoundary ? " ⚠" : ""}`,
      ),
      "",
      "via runeodds.app",
    ].join("\n");
  }, [mode, deckTable, midTable, target, goingFirst, currentTurn, safeTarget, safePile]);

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
            <span className="font-mono text-xs text-ink-500">v0.2 · riftbound tcg</span>
          </div>
          <p className="mt-3 max-w-prose text-sm text-ink-300">
            Hypergeometric probability for a 12-card rune deck. Tells you the odds of drawing what
            you need by the turn you need it.
          </p>
        </header>

        {/* Mode switcher */}
        <section className="mb-8">
          <div className="grid w-full grid-cols-2 gap-2 sm:w-72">
            <button
              onClick={() => setMode("deckbuilding")}
              className={`rounded-sm border px-3 py-2 font-mono text-sm transition ${mode === "deckbuilding" ? ACTIVE_BTN : INACTIVE_BTN}`}
            >
              Deckbuilding
            </button>
            <button
              onClick={() => setMode("midgame")}
              className={`rounded-sm border px-3 py-2 font-mono text-sm transition ${mode === "midgame" ? ACTIVE_BTN : INACTIVE_BTN}`}
            >
              Mid-game
            </button>
          </div>
        </section>

        {/* Controls — deckbuilding */}
        {mode === "deckbuilding" && (
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
                How many runes of one color you&apos;re running.
              </p>
            </div>

            <div>
              <label className="block font-mono text-xs uppercase tracking-wider text-ink-400">
                Turn order
              </label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  onClick={() => setGoingFirst(true)}
                  className={`rounded-sm border px-3 py-2 font-mono text-sm transition ${goingFirst ? ACTIVE_BTN : INACTIVE_BTN}`}
                >
                  Going first
                </button>
                <button
                  onClick={() => setGoingFirst(false)}
                  className={`rounded-sm border px-3 py-2 font-mono text-sm transition ${!goingFirst ? ACTIVE_BTN : INACTIVE_BTN}`}
                >
                  Going second
                </button>
              </div>
              <p className="mt-2 font-mono text-xs text-ink-500">
                First channels 2 on T1; second channels 3.
              </p>
            </div>
          </section>
        )}

        {/* Controls — mid-game */}
        {mode === "midgame" && (
          <section className="mb-8 flex flex-col gap-6">
            {/* Turn order */}
            <div>
              <label className="block font-mono text-xs uppercase tracking-wider text-ink-400">
                Turn order
              </label>
              <div className="mt-2 grid w-full grid-cols-2 gap-2 sm:w-64">
                <button
                  onClick={() => setGoingFirst(true)}
                  className={`rounded-sm border px-3 py-2 font-mono text-sm transition ${goingFirst ? ACTIVE_BTN : INACTIVE_BTN}`}
                >
                  Going first
                </button>
                <button
                  onClick={() => setGoingFirst(false)}
                  className={`rounded-sm border px-3 py-2 font-mono text-sm transition ${!goingFirst ? ACTIVE_BTN : INACTIVE_BTN}`}
                >
                  Going second
                </button>
              </div>
              <p className="mt-2 font-mono text-xs text-ink-500">
                First channels 2 on T1; second channels 3.
              </p>
            </div>

            {/* Current turn */}
            <div>
              <label className="block font-mono text-xs uppercase tracking-wider text-ink-400">
                Current turn
              </label>
              <div className="mt-2 flex gap-1.5">
                {TURN_OPTIONS.map((t) => (
                  <button
                    key={t}
                    onClick={() => setCurrentTurn(t)}
                    className={`h-9 w-11 rounded-sm border font-mono text-sm transition ${currentTurn === t ? ACTIVE_BTN : INACTIVE_BTN}`}
                  >
                    T{t}
                  </button>
                ))}
              </div>
              <p className="mt-2 font-mono text-xs text-ink-500">
                {channeled} runes channeled so far · max {maxPile} left in unknown pile.
              </p>
            </div>

            {/* Pile inputs */}
            <div className="grid gap-6 sm:grid-cols-2">
              {/* Target in remaining */}
              <div>
                <label className="block font-mono text-xs uppercase tracking-wider text-ink-400">
                  Target color in unknown pile
                </label>
                <div className="mt-2 flex items-center gap-3">
                  <button
                    onClick={() => setTargetInRemaining(Math.max(0, safeTarget - 1))}
                    disabled={safeTarget <= 0}
                    className="h-9 w-9 rounded-sm border border-ink-700 font-mono text-lg text-ink-300 transition hover:border-ink-600 hover:text-ink-100 disabled:cursor-not-allowed disabled:opacity-30"
                    aria-label="Decrease target in remaining"
                  >
                    −
                  </button>
                  <div className="w-12 rounded-sm border border-ink-700 bg-ink-900 py-1.5 text-center font-mono text-base text-ink-100">
                    {safeTarget}
                  </div>
                  <button
                    onClick={() => setTargetInRemaining(Math.min(safePile, safeTarget + 1))}
                    disabled={safeTarget >= safePile}
                    className="h-9 w-9 rounded-sm border border-ink-700 font-mono text-lg text-ink-300 transition hover:border-ink-600 hover:text-ink-100 disabled:cursor-not-allowed disabled:opacity-30"
                    aria-label="Increase target in remaining"
                  >
                    +
                  </button>
                </div>
                <p className="mt-2 font-mono text-xs text-ink-500">
                  Face-down target runes not yet channeled or buried.
                </p>
              </div>

              {/* Pile size */}
              <div>
                <label className="block font-mono text-xs uppercase tracking-wider text-ink-400">
                  Unknown pile size
                </label>
                <div className="mt-2 flex items-center gap-3">
                  <button
                    onClick={() => {
                      const next = Math.max(safeTarget, safePile - 1);
                      setPileSize(next);
                    }}
                    disabled={safePile <= safeTarget}
                    className="h-9 w-9 rounded-sm border border-ink-700 font-mono text-lg text-ink-300 transition hover:border-ink-600 hover:text-ink-100 disabled:cursor-not-allowed disabled:opacity-30"
                    aria-label="Decrease pile size"
                  >
                    −
                  </button>
                  <div className="w-12 rounded-sm border border-ink-700 bg-ink-900 py-1.5 text-center font-mono text-base text-ink-100">
                    {safePile}
                  </div>
                  <button
                    onClick={() => setPileSize(Math.min(maxPile, safePile + 1))}
                    disabled={safePile >= maxPile}
                    className="h-9 w-9 rounded-sm border border-ink-700 font-mono text-lg text-ink-300 transition hover:border-ink-600 hover:text-ink-100 disabled:cursor-not-allowed disabled:opacity-30"
                    aria-label="Increase pile size"
                  >
                    +
                  </button>
                </div>
                <p className="mt-2 font-mono text-xs text-ink-500">
                  All face-down runes between channeled and buried.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Explainer */}
        <section className="mb-8 rounded-sm border border-ink-700 bg-ink-900/60 p-5">
          {mode === "deckbuilding" ? (
            <>
              <h2 className="font-mono text-xs uppercase tracking-wider text-ink-400">
                How channeling works
              </h2>
              <p className="mt-3 max-w-prose font-mono text-xs leading-relaxed text-ink-300">
                Your 12-card rune deck sits face-down at the start of the game. You don&apos;t see
                any runes until your first turn. Going first, you channel 2 on T1, then +2 each
                turn after. Going second, you channel 3 on T1, then +2 each turn. The table below
                shows cumulative probabilities by the end of each turn.
              </p>
              <p className="mt-3 max-w-prose font-mono text-xs leading-relaxed text-ink-500">
                <span className="text-accent">Note:</span> these odds assume no recycling has
                occurred. Switch to{" "}
                <button
                  onClick={() => setMode("midgame")}
                  className="text-ink-300 underline underline-offset-2 hover:text-accent"
                >
                  Mid-game mode
                </button>{" "}
                once recycling has happened and you know your exact pile state.
              </p>
            </>
          ) : (
            <>
              <h2 className="font-mono text-xs uppercase tracking-wider text-ink-400">
                The math
              </h2>
              <p className="mt-3 max-w-prose font-mono text-xs leading-relaxed text-ink-300">
                Mid-game, the rune deck has three layers: cards already channeled (known), cards
                still face-down in the middle (unknown), and recycled runes at the exact bottom
                (buried, fixed order). Your next channels draw only from the unknown middle layer.
              </p>
              <p className="mt-3 max-w-prose font-mono text-xs leading-relaxed text-ink-300">
                Hypergeom only needs two numbers about that layer:{" "}
                <span className="text-ink-100">how many target runes are in it</span> and{" "}
                <span className="text-ink-100">how big it is total</span>. Count your face-down
                runes, subtract anything buried at the bottom — those two numbers are all the model
                uses. The draw rate still follows the standard schedule (+2 per turn from your
                current position).
              </p>
              <p className="mt-3 max-w-prose font-mono text-xs leading-relaxed text-ink-500">
                <span className="text-yellow-500/80">⚠</span>{" "}
                <span className="text-accent">Buried cards</span> enter in a fixed known order, not
                randomly — the model doesn&apos;t apply to them. Rows marked ⚠ are at or past that
                boundary and should be read as a ceiling, not a forecast.
              </p>
            </>
          )}
        </section>

        {/* Boundary warning banner */}
        {mode === "midgame" && hasBoundaryWarning && (
          <section className="mb-6 rounded-sm border border-yellow-500/30 bg-yellow-500/5 p-4">
            <p className="font-mono text-xs leading-relaxed text-yellow-500/80">
              <span className="text-yellow-500">⚠ boundary reached</span> — one or more upcoming
              turns would exhaust your unknown pile and start drawing from the buried runes. Those
              draw in a fixed order, not randomly. The model stops being valid there; treat those
              rows as a floor.
            </p>
          </section>
        )}

        {/* Table */}
        <section className="mb-8">
          <h2 className="mb-3 font-mono text-xs uppercase tracking-wider text-ink-400">
            {mode === "deckbuilding" ? "By end of turn" : "Upcoming turns"}
          </h2>
          <div className="overflow-x-auto rounded-sm border border-ink-700">
            <table className="w-full min-w-[480px] border-collapse font-mono text-xs sm:text-sm">
              <thead className="bg-ink-900">
                <tr>
                  <th className="border-b border-ink-700 px-2 py-2 text-left text-[10px] font-normal uppercase tracking-wider text-ink-400 sm:px-3 sm:py-2.5 sm:text-xs">
                    Turn
                  </th>
                  <th className="border-b border-ink-700 px-2 py-2 text-left text-[10px] font-normal uppercase tracking-wider text-ink-400 sm:px-3 sm:py-2.5 sm:text-xs">
                    {mode === "deckbuilding" ? "Seen" : "Draws"}
                  </th>
                  {[1, 2, 3, 4].map((n) => (
                    <th
                      key={n}
                      className="border-b border-ink-700 px-2 py-2 text-right text-[10px] font-normal uppercase tracking-wider text-ink-400 sm:px-3 sm:py-2.5 sm:text-xs"
                    >
                      ≥ {n}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {mode === "deckbuilding"
                  ? deckTable.map((row) => (
                      <tr key={row.turn} className="border-b border-ink-800 last:border-b-0">
                        <td className="px-2 py-2 text-ink-100 sm:px-3 sm:py-2.5">T{row.turn}</td>
                        <td className="px-2 py-2 text-ink-400 sm:px-3 sm:py-2.5">
                          {row.runesSeen}
                          <span className="text-ink-600">/12</span>
                        </td>
                        {row.probabilities.map((p, i) => (
                          <td
                            key={i}
                            className="px-2 py-2 text-right text-ink-100 sm:px-3 sm:py-2.5"
                            style={{ backgroundColor: heatColor(p) }}
                          >
                            {pct(p)}
                          </td>
                        ))}
                      </tr>
                    ))
                  : midTable.map((row) => (
                      <tr
                        key={row.turn}
                        className={`border-b border-ink-800 last:border-b-0 ${row.exceedsBoundary ? "opacity-60" : ""}`}
                      >
                        <td className="px-2 py-2 text-ink-100 sm:px-3 sm:py-2.5">
                          T{row.turn}
                          {row.exceedsBoundary && (
                            <span className="ml-1 text-yellow-500/70">⚠</span>
                          )}
                        </td>
                        <td className="px-2 py-2 text-ink-400 sm:px-3 sm:py-2.5">
                          +{row.draws}
                          <span className="text-ink-600">/{safePile}</span>
                        </td>
                        {row.probabilities.map((p, i) => (
                          <td
                            key={i}
                            className="px-2 py-2 text-right text-ink-100 sm:px-3 sm:py-2.5"
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
            {mode === "deckbuilding"
              ? "Cell shading scales with probability. Read across to see how odds climb each turn."
              : `Draws are cumulative from T${currentTurn}. Shading scales with probability.`}
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
