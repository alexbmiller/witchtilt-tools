"use client";

import { useMemo, useState } from "react";
import { parseCost, COLORS, type Color, type CardCost } from "@/lib/cost-parser";
import { probabilityCanCast, probabilityCanCastMidGame } from "@/lib/card-mode";
import { runesSeenByTurn } from "@/lib/probability";
import { ACTIVE_BTN, INACTIVE_BTN, pct, heatColor } from "./shared";

const DECK_SIZE = 12;
const DECKBUILDING_TURNS = [1, 2, 3, 4, 5, 6] as const;
const CURRENT_TURN_OPTIONS = [1, 2, 3, 4, 5, 6] as const;

type SubMode = "deckbuilding" | "midgame";

const COLOR_NAMES: Record<Color, string> = {
  R: "Red",
  B: "Blue",
  P: "Purple",
  O: "Orange",
  G: "Green",
  Y: "Yellow",
};

// True-alphabetical fill order for the smart-preset fallback when there are
// fewer non-zero colors than the preset has slots.
const COLORS_ALPHA: readonly Color[] = ["B", "G", "O", "P", "R", "Y"] as const;

interface Preset {
  label: string;
  values: number[];
}
const PRESETS: readonly Preset[] = [
  { label: "6-6", values: [6, 6] },
  { label: "4-4-4", values: [4, 4, 4] },
  { label: "8-4", values: [8, 4] },
  { label: "6-3-3", values: [6, 3, 3] },
] as const;

const EMPTY_DECK: Record<Color, number> = { R: 0, B: 0, P: 0, O: 0, G: 0, Y: 0 };

interface Row {
  turn: number;
  /** Cumulative channels (deckbuilding) or new draws this query (mid-game). */
  channels: number;
  /** For mid-game: when new draws would reach into the buried segment. */
  exceedsBoundary: boolean;
  p: number;
}

function compositionTotal(comp: Record<Color, number>): number {
  let s = 0;
  for (const c of COLORS) s += comp[c];
  return s;
}

function clampInt(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

export default function CardMode() {
  const [subMode, setSubMode] = useState<SubMode>("deckbuilding");
  const [costInput, setCostInput] = useState("");
  const [composition, setComposition] = useState<Record<Color, number>>({ ...EMPTY_DECK });
  const [goingFirst, setGoingFirst] = useState(true);
  const [currentTurn, setCurrentTurn] = useState(2);
  const [copied, setCopied] = useState(false);

  const parsed = useMemo(() => parseCost(costInput), [costInput]);
  const total = useMemo(() => compositionTotal(composition), [composition]);

  // Max pile size in mid-game is whatever's left of the deck after channeling so far.
  const channeled = useMemo(
    () => runesSeenByTurn(currentTurn, goingFirst),
    [currentTurn, goingFirst],
  );
  const maxComposition = subMode === "deckbuilding" ? DECK_SIZE : DECK_SIZE - channeled;
  const overBudget = total > maxComposition;
  const trimmedInput = costInput.trim();
  const showEmptyState = trimmedInput === "";

  const rows = useMemo<Row[]>(() => {
    if (!parsed.ok || overBudget) return [];

    if (subMode === "deckbuilding") {
      return DECKBUILDING_TURNS.map((turn) => {
        const rawChannels = (goingFirst ? 2 : 3) + (turn - 1) * 2;
        const channels = Math.min(rawChannels, DECK_SIZE);
        const p = probabilityCanCast(parsed.cost, composition, turn, goingFirst);
        return { turn, channels, exceedsBoundary: false, p };
      });
    }

    // Mid-game: iterate up to 5 future turns from currentTurn+1, early-exit
    // once draws plateau (deck exhausted).
    const channeledNow = runesSeenByTurn(currentTurn, goingFirst);
    const pileSize = total;
    const out: Row[] = [];
    let prevDraws = -1;
    for (let i = 1; i <= 5; i++) {
      const queryTurn = currentTurn + i;
      const futureSeen = runesSeenByTurn(queryTurn, goingFirst);
      const newDraws = futureSeen - channeledNow;
      if (newDraws === prevDraws) break;
      prevDraws = newDraws;
      const exceedsBoundary = newDraws > pileSize;
      const p = probabilityCanCastMidGame(
        parsed.cost,
        composition,
        currentTurn,
        queryTurn,
        goingFirst,
      );
      out.push({ turn: queryTurn, channels: newDraws, exceedsBoundary, p });
    }
    return out;
  }, [parsed, composition, goingFirst, overBudget, subMode, currentTurn, total]);

  const isImpossible = parsed.ok && rows.length > 0 && rows.every((r) => r.p === 0);
  const hasBoundaryWarning = subMode === "midgame" && rows.some((r) => r.exceedsBoundary);

  function setColor(c: Color, value: number) {
    setComposition((prev) => ({ ...prev, [c]: clampInt(value, 0, DECK_SIZE) }));
  }

  function applyPreset(values: number[]) {
    const nonZero = COLORS.filter((c) => composition[c] > 0);
    const slots: Color[] = [...nonZero];
    for (const c of COLORS_ALPHA) {
      if (slots.length >= values.length) break;
      if (!slots.includes(c)) slots.push(c);
    }
    const used = slots.slice(0, values.length);
    const next: Record<Color, number> = { ...EMPTY_DECK };
    used.forEach((c, i) => {
      next[c] = values[i];
    });
    setComposition(next);
  }

  function loadExample() {
    setCostInput("2RR");
    setGoingFirst(true);
    if (subMode === "deckbuilding") {
      setComposition({ R: 4, B: 4, P: 0, O: 0, G: 4, Y: 0 });
    } else {
      setComposition({ R: 2, B: 2, P: 0, O: 0, G: 2, Y: 0 });
      setCurrentTurn(2);
    }
  }

  const shareText = useMemo(() => {
    if (!parsed.ok || rows.length === 0) return "";
    const compStr =
      COLORS.filter((c) => composition[c] > 0)
        .map((c) => `${composition[c]}${c}`)
        .join("/") || "empty";
    if (subMode === "deckbuilding") {
      return [
        `Rune odds — cost ${parsed.cost.raw.trim()} vs ${compStr}, going ${goingFirst ? "first" : "second"}:`,
        ...rows.map((r) => `T${r.turn} (${r.channels} channels): ${pct(r.p)}`),
        "",
        "via witchtilt.com",
      ].join("\n");
    }
    return [
      `Mid-game rune odds — cost ${parsed.cost.raw.trim()} from T${currentTurn} going ${goingFirst ? "first" : "second"}, pile ${compStr}:`,
      ...rows.map(
        (r) =>
          `T${r.turn} (+${r.channels} new): ${pct(r.p)}${r.exceedsBoundary ? " ⚠" : ""}`,
      ),
      "",
      "via witchtilt.com",
    ].join("\n");
  }, [parsed, composition, rows, goingFirst, subMode, currentTurn]);

  async function handleCopy() {
    if (!shareText) return;
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // noop
    }
  }

  const showTable = parsed.ok && !overBudget && !showEmptyState;
  const compositionLabel =
    subMode === "deckbuilding" ? "Deck composition" : "Unknown pile composition";

  return (
    <>
      {/* Sub-mode toggle */}
      <section className="mb-8">
        <div className="grid w-full grid-cols-2 gap-2 sm:w-72">
          <button
            onClick={() => setSubMode("deckbuilding")}
            aria-pressed={subMode === "deckbuilding"}
            className={`rounded-sm border px-3 py-2 font-mono text-sm transition ${subMode === "deckbuilding" ? ACTIVE_BTN : INACTIVE_BTN}`}
          >
            Deckbuilding
          </button>
          <button
            onClick={() => setSubMode("midgame")}
            aria-pressed={subMode === "midgame"}
            className={`rounded-sm border px-3 py-2 font-mono text-sm transition ${subMode === "midgame" ? ACTIVE_BTN : INACTIVE_BTN}`}
          >
            Mid-game
          </button>
        </div>
      </section>

      {/* Cost input */}
      <section className="mb-8">
        <label
          htmlFor="cost-input"
          className="block font-mono text-xs uppercase tracking-wider text-ink-400"
        >
          Card cost
        </label>
        <input
          id="cost-input"
          type="text"
          value={costInput}
          onChange={(e) => setCostInput(e.target.value)}
          placeholder="e.g. 2RR"
          spellCheck={false}
          autoCapitalize="characters"
          autoCorrect="off"
          className="mt-2 w-full rounded-sm border border-ink-700 bg-ink-900 px-3 py-2 font-mono text-base text-ink-100 placeholder:text-ink-500 focus:border-accent focus:outline-none"
        />
        <div className="mt-2 min-h-[1.25rem] font-mono text-xs leading-5">
          {trimmedInput === "" ? null : !parsed.ok ? (
            <span className="text-yellow-500/80">{parsed.error}</span>
          ) : (
            <ParseFeedback cost={parsed.cost} />
          )}
        </div>
      </section>

      {/* Current-turn picker (mid-game only) */}
      {subMode === "midgame" && (
        <section className="mb-8">
          <label className="block font-mono text-xs uppercase tracking-wider text-ink-400">
            Current turn
          </label>
          <div className="mt-2 flex gap-1.5">
            {CURRENT_TURN_OPTIONS.map((t) => (
              <button
                key={t}
                onClick={() => setCurrentTurn(t)}
                aria-pressed={currentTurn === t}
                className={`h-9 w-11 rounded-sm border font-mono text-sm transition ${currentTurn === t ? ACTIVE_BTN : INACTIVE_BTN}`}
              >
                T{t}
              </button>
            ))}
          </div>
          <p className="mt-2 font-mono text-xs text-ink-500">
            {channeled} runes channeled so far · max {DECK_SIZE - channeled} left in unknown
            pile.
          </p>
        </section>
      )}

      {/* Deck / Pile composition */}
      <section className="mb-8">
        <div className="flex items-baseline justify-between">
          <label className="font-mono text-xs uppercase tracking-wider text-ink-400">
            {compositionLabel}
          </label>
          <span
            className={`font-mono text-xs ${overBudget ? "text-yellow-500" : "text-ink-500"}`}
          >
            {total}/{maxComposition}
            {overBudget ? " · over budget" : ""}
          </span>
        </div>

        <div className="mt-2 flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => applyPreset(p.values)}
              className="rounded-sm border border-ink-700 px-3 py-1.5 font-mono text-xs text-ink-300 transition hover:border-ink-600 hover:text-ink-100"
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
          {COLORS.map((c) => (
            <div
              key={c}
              className="flex items-center gap-2 rounded-sm border border-ink-700 bg-ink-900/50 px-2 py-1.5"
            >
              <span className="w-7 font-mono text-xs uppercase tracking-wider text-ink-300">
                {c}
              </span>
              <span className="hidden flex-1 font-mono text-[10px] uppercase tracking-wider text-ink-500 sm:inline">
                {COLOR_NAMES[c]}
              </span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={DECK_SIZE}
                value={composition[c]}
                onChange={(e) => setColor(c, parseInt(e.target.value || "0", 10))}
                className="w-12 rounded-sm border border-ink-700 bg-ink-900 px-2 py-1 text-center font-mono text-sm text-ink-100 focus:border-accent focus:outline-none"
                aria-label={`${COLOR_NAMES[c]} runes`}
              />
            </div>
          ))}
        </div>
        {overBudget && (
          <p className="mt-2 font-mono text-xs text-yellow-500/80">
            {subMode === "deckbuilding"
              ? `Deck has ${total} runes — drop some so the total ≤ 12.`
              : `Pile has ${total} runes but only ${maxComposition} cards remain after T${currentTurn} channels.`}
          </p>
        )}
      </section>

      {/* Turn order */}
      <section className="mb-8">
        <label className="block font-mono text-xs uppercase tracking-wider text-ink-400">
          Turn order
        </label>
        <div className="mt-2 grid w-full grid-cols-2 gap-2 sm:w-72">
          <button
            onClick={() => setGoingFirst(true)}
            aria-pressed={goingFirst}
            className={`rounded-sm border px-3 py-2 font-mono text-sm transition ${goingFirst ? ACTIVE_BTN : INACTIVE_BTN}`}
          >
            Going first
          </button>
          <button
            onClick={() => setGoingFirst(false)}
            aria-pressed={!goingFirst}
            className={`rounded-sm border px-3 py-2 font-mono text-sm transition ${!goingFirst ? ACTIVE_BTN : INACTIVE_BTN}`}
          >
            Going second
          </button>
        </div>
        <p className="mt-2 font-mono text-xs text-ink-500">
          First channels 2 on T1; second channels 3.
        </p>
      </section>

      {/* Empty state */}
      {showEmptyState && (
        <section className="mb-12 rounded-sm border border-ink-700 bg-ink-900/60 p-6">
          <p className="font-mono text-sm leading-relaxed text-ink-300">
            Type a cost. We&apos;ll tell you if your deck can actually run it. Try{" "}
            <button
              onClick={loadExample}
              className="text-accent underline underline-offset-2 hover:text-accent/80"
            >
              2RR
            </button>{" "}
            if you&apos;re not sure where to start.
          </p>
        </section>
      )}

      {/* Mid-game caveat */}
      {showTable && subMode === "midgame" && !isImpossible && (
        <section className="mb-6 rounded-sm border border-ink-700 bg-ink-900/40 p-4">
          <p className="font-mono text-xs leading-relaxed text-ink-400">
            <span className="text-accent">Mid-game note:</span> these odds count only{" "}
            <span className="text-ink-200">future draws from the pile</span>. If runes already
            in your pool cover part of the cost, subtract from the cost first.
          </p>
        </section>
      )}

      {/* Impossible-cost banner */}
      {showTable && isImpossible && (
        <section className="mb-6 rounded-sm border border-yellow-500/30 bg-yellow-500/5 p-4">
          <p className="font-mono text-xs leading-relaxed text-yellow-500/80">
            <span className="text-yellow-500">⚠ unachievable</span> — this cost can&apos;t be
            paid with the current{" "}
            {subMode === "deckbuilding" ? "deck composition" : "pile and turn-order"}. Missing a
            required color, cost exceeds max channels, or the {subMode === "deckbuilding" ? "deck" : "pile"} is empty.
          </p>
        </section>
      )}

      {/* Boundary warning (mid-game only) */}
      {showTable && hasBoundaryWarning && !isImpossible && (
        <section className="mb-6 rounded-sm border border-yellow-500/30 bg-yellow-500/5 p-4">
          <p className="font-mono text-xs leading-relaxed text-yellow-500/80">
            <span className="text-yellow-500">⚠ boundary reached</span> — one or more upcoming
            turns would exhaust the unknown pile and start drawing from buried runes. Those
            enter in a fixed order, not randomly. Flagged rows should be read as a ceiling.
          </p>
        </section>
      )}

      {/* Probability table */}
      {showTable && (
        <section className="mb-8">
          <h2 className="mb-3 font-mono text-xs uppercase tracking-wider text-ink-400">
            {subMode === "deckbuilding" ? "P(can cast) by end of turn" : "Upcoming turns"}
          </h2>
          <div className="overflow-x-auto rounded-sm border border-ink-700">
            <table className="w-full min-w-[320px] border-collapse font-mono text-xs sm:text-sm">
              <thead className="bg-ink-900">
                <tr>
                  <th className="border-b border-ink-700 px-2 py-2 text-left text-[10px] font-normal uppercase tracking-wider text-ink-400 sm:px-3 sm:py-2.5 sm:text-xs">
                    Turn
                  </th>
                  <th className="border-b border-ink-700 px-2 py-2 text-left text-[10px] font-normal uppercase tracking-wider text-ink-400 sm:px-3 sm:py-2.5 sm:text-xs">
                    {subMode === "deckbuilding" ? "Channels" : "Draws"}
                  </th>
                  <th className="border-b border-ink-700 px-2 py-2 text-right text-[10px] font-normal uppercase tracking-wider text-ink-400 sm:px-3 sm:py-2.5 sm:text-xs">
                    P(can cast)
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
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
                      {subMode === "deckbuilding" ? (
                        <>
                          {row.channels}
                          <span className="text-ink-600">/12</span>
                        </>
                      ) : (
                        <>
                          +{row.channels}
                          <span className="text-ink-600">/{total}</span>
                        </>
                      )}
                    </td>
                    <td
                      className="px-2 py-2 text-right text-ink-100 sm:px-3 sm:py-2.5"
                      style={{ backgroundColor: heatColor(row.p) }}
                    >
                      {pct(row.p)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 font-mono text-xs text-ink-500">
            {subMode === "deckbuilding"
              ? "Cell shading scales with probability. Read down to see when the cost crosses into castable territory."
              : `Draws are cumulative from T${currentTurn}. Shading scales with probability.`}
          </p>
        </section>
      )}

      {/* Share */}
      {showTable && (
        <section className="mb-12">
          <button
            onClick={handleCopy}
            className="rounded-sm border border-ink-700 bg-ink-900 px-4 py-2 font-mono text-sm text-ink-200 transition hover:border-accent hover:text-accent"
          >
            {copied ? "✓ copied" : "copy share text"}
          </button>
        </section>
      )}
    </>
  );
}

function ParseFeedback({ cost }: { cost: CardCost }) {
  // "Cost 2RR  →  Total: 4  ·  Energy: 2  ·  Red: 2"
  const parts: string[] = [`Total: ${cost.totalCost}`];
  if (cost.energy > 0) parts.push(`Energy: ${cost.energy}`);
  for (const c of COLORS) {
    const n = cost.colors[c];
    if (n && n > 0) parts.push(`${COLOR_NAMES[c]}: ${n}`);
  }
  return (
    <span className="text-ink-300">
      <span className="text-ink-500">Cost </span>
      <span className="text-ink-100">{cost.raw.trim().toUpperCase()}</span>
      <span className="text-ink-500"> → </span>
      {parts.join(" · ")}
    </span>
  );
}
