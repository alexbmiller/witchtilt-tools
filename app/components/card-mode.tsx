"use client";

import { useMemo, useState } from "react";
import { parseCost, COLORS, type Color, type CardCost } from "@/lib/cost-parser";
import { probabilityCanCast } from "@/lib/card-mode";
import { ACTIVE_BTN, INACTIVE_BTN, pct, heatColor } from "./shared";

const DECK_SIZE = 12;
const TURNS = [1, 2, 3, 4, 5, 6] as const;

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
  const [costInput, setCostInput] = useState("");
  const [composition, setComposition] = useState<Record<Color, number>>({ ...EMPTY_DECK });
  const [goingFirst, setGoingFirst] = useState(true);
  const [copied, setCopied] = useState(false);

  const parsed = useMemo(() => parseCost(costInput), [costInput]);
  const total = useMemo(() => compositionTotal(composition), [composition]);
  const overBudget = total > DECK_SIZE;
  const trimmedInput = costInput.trim();
  const showEmptyState = trimmedInput === "";

  // Probability rows — only computed when we have a valid parse and a sane deck.
  const rows = useMemo(() => {
    if (!parsed.ok || overBudget) return [];
    return TURNS.map((turn) => {
      const rawChannels = (goingFirst ? 2 : 3) + (turn - 1) * 2;
      const channels = Math.min(rawChannels, DECK_SIZE);
      const p = probabilityCanCast(parsed.cost, composition, turn, goingFirst);
      return { turn, channels, p };
    });
  }, [parsed, composition, goingFirst, overBudget]);

  // "Unachievable" — every turn returns 0 even with the math-layer's clamping.
  const isImpossible = parsed.ok && rows.length > 0 && rows.every((r) => r.p === 0);

  function setColor(c: Color, value: number) {
    setComposition((prev) => ({ ...prev, [c]: clampInt(value, 0, DECK_SIZE) }));
  }

  function applyPreset(values: number[]) {
    // Smart preset: keep non-zero colors as the first slots, then pad
    // with alphabetical-first colors to fill the preset's slot count.
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
    setComposition({ R: 4, B: 4, P: 0, O: 0, G: 4, Y: 0 });
    setGoingFirst(true);
  }

  // Share text — same line shape as Rune mode, with cost + deck composition.
  const shareText = useMemo(() => {
    if (!parsed.ok || rows.length === 0) return "";
    const deckStr =
      COLORS.filter((c) => composition[c] > 0)
        .map((c) => `${composition[c]}${c}`)
        .join("/") || "empty deck";
    return [
      `Rune odds — cost ${parsed.cost.raw.trim()} vs ${deckStr}, going ${goingFirst ? "first" : "second"}:`,
      ...rows.map((r) => `T${r.turn} (${r.channels} channels): ${pct(r.p)}`),
      "",
      "via runeodds.app",
    ].join("\n");
  }, [parsed, composition, rows, goingFirst]);

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

  return (
    <>
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

      {/* Deck composition */}
      <section className="mb-8">
        <div className="flex items-baseline justify-between">
          <label className="font-mono text-xs uppercase tracking-wider text-ink-400">
            Deck composition
          </label>
          <span
            className={`font-mono text-xs ${overBudget ? "text-yellow-500" : "text-ink-500"}`}
          >
            {total}/{DECK_SIZE}
            {overBudget ? " · over budget" : ""}
          </span>
        </div>

        {/* Preset chips */}
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

        {/* 2×3 mobile / 3×2 desktop grid of color inputs */}
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
                aria-label={`${COLOR_NAMES[c]} runes in deck`}
              />
            </div>
          ))}
        </div>
        {overBudget && (
          <p className="mt-2 font-mono text-xs text-yellow-500/80">
            Deck has {total} runes — drop some so the total ≤ 12.
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

      {/* Empty state — only when no cost typed yet */}
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

      {/* Impossible-cost banner */}
      {showTable && isImpossible && (
        <section className="mb-6 rounded-sm border border-yellow-500/30 bg-yellow-500/5 p-4">
          <p className="font-mono text-xs leading-relaxed text-yellow-500/80">
            <span className="text-yellow-500">⚠ unachievable</span> — this cost can&apos;t be paid
            with the current deck. Either you&apos;re short on a required color, the cost exceeds
            your max channel count (12), or the deck is empty.
          </p>
        </section>
      )}

      {/* Probability table */}
      {showTable && (
        <section className="mb-8">
          <h2 className="mb-3 font-mono text-xs uppercase tracking-wider text-ink-400">
            P(can cast) by end of turn
          </h2>
          <div className="overflow-x-auto rounded-sm border border-ink-700">
            <table className="w-full min-w-[320px] border-collapse font-mono text-xs sm:text-sm">
              <thead className="bg-ink-900">
                <tr>
                  <th className="border-b border-ink-700 px-2 py-2 text-left text-[10px] font-normal uppercase tracking-wider text-ink-400 sm:px-3 sm:py-2.5 sm:text-xs">
                    Turn
                  </th>
                  <th className="border-b border-ink-700 px-2 py-2 text-left text-[10px] font-normal uppercase tracking-wider text-ink-400 sm:px-3 sm:py-2.5 sm:text-xs">
                    Channels
                  </th>
                  <th className="border-b border-ink-700 px-2 py-2 text-right text-[10px] font-normal uppercase tracking-wider text-ink-400 sm:px-3 sm:py-2.5 sm:text-xs">
                    P(can cast)
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.turn} className="border-b border-ink-800 last:border-b-0">
                    <td className="px-2 py-2 text-ink-100 sm:px-3 sm:py-2.5">T{row.turn}</td>
                    <td className="px-2 py-2 text-ink-400 sm:px-3 sm:py-2.5">
                      {row.channels}
                      <span className="text-ink-600">/12</span>
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
            Cell shading scales with probability. Read down to see when the cost crosses into
            castable territory.
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
  // "Cost 2RR  →  Total: 4  ·  Generic: 2  ·  Red: 2"
  const parts: string[] = [`Total: ${cost.totalCost}`];
  if (cost.generic > 0) parts.push(`Generic: ${cost.generic}`);
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
