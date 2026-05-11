"use client";

import { useMemo, useState } from "react";
import { parseCost, type Color } from "@/lib/cost-parser";
import { probabilityCanCast } from "@/lib/card-mode";
import { type RuneCounts } from "@/lib/decklist-parser";
import { generateCostSpread } from "@/lib/cost-spread";
import { buildShareText } from "@/lib/share-text";
import { ACTIVE_BTN, INACTIVE_BTN, heatColor, pct } from "../shared";

const TURNS = [1, 2, 3, 4, 5, 6] as const;

const COLOR_TEXT_CLASS: Record<Color, string> = {
  R: "text-red-400",
  B: "text-blue-400",
  P: "text-purple-400",
  O: "text-orange-400",
  G: "text-emerald-400",
  Y: "text-yellow-400",
};

function CostLabel({ cost }: { cost: string }) {
  return (
    <>
      {cost.split("").map((ch, i) => {
        if (ch >= "0" && ch <= "9") {
          return <span key={i}>{ch}</span>;
        }
        const tint = COLOR_TEXT_CLASS[ch as Color];
        return (
          <span key={i} className={tint ?? ""}>
            {ch}
          </span>
        );
      })}
    </>
  );
}

export default function ManaCurveTable({ runes }: { runes: RuneCounts }) {
  const [goingFirst, setGoingFirst] = useState(true);
  const [justCopied, setJustCopied] = useState(false);

  const costs = useMemo(() => generateCostSpread(runes), [runes]);

  const matrix = useMemo(() => {
    return costs.map((cost) => {
      const result = parseCost(cost);
      if (!result.ok) return TURNS.map(() => 0);
      return TURNS.map((t) => probabilityCanCast(result.cost, runes, t, goingFirst));
    });
  }, [costs, runes, goingFirst]);

  const onlyGeneric = costs.length === 3;

  async function handleCopy() {
    const text = buildShareText({ runes, costs, matrix, turns: TURNS, goingFirst });
    try {
      await navigator.clipboard.writeText(text);
      setJustCopied(true);
      setTimeout(() => setJustCopied(false), 2000);
    } catch {
      // Clipboard API can fail on insecure contexts or denied permissions.
      // Fall back to nothing — user can manually select the text if needed.
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-mono text-xs uppercase tracking-wider text-ink-400">
          Mana curve — P(can cast) by turn
        </h2>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setGoingFirst(true)}
            aria-pressed={goingFirst}
            className={`rounded-sm border px-3 py-1.5 font-mono text-xs transition ${goingFirst ? ACTIVE_BTN : INACTIVE_BTN}`}
          >
            Going 1st
          </button>
          <button
            onClick={() => setGoingFirst(false)}
            aria-pressed={!goingFirst}
            className={`rounded-sm border px-3 py-1.5 font-mono text-xs transition ${!goingFirst ? ACTIVE_BTN : INACTIVE_BTN}`}
          >
            Going 2nd
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-sm border border-ink-700">
        <table className="w-full min-w-[480px] border-collapse font-mono text-xs sm:text-sm">
          <thead className="bg-ink-900">
            <tr>
              <th className="border-b border-ink-700 px-2 py-2 text-left text-[10px] font-normal uppercase tracking-wider text-ink-400 sm:px-3 sm:py-2.5 sm:text-xs">
                Cost
              </th>
              {TURNS.map((t) => (
                <th
                  key={t}
                  className="border-b border-ink-700 px-2 py-2 text-center text-[10px] font-normal uppercase tracking-wider text-ink-400 sm:px-3 sm:py-2.5 sm:text-xs"
                >
                  T{t}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {costs.map((cost, i) => (
              <tr key={cost} className="border-b border-ink-800 last:border-b-0">
                <td className="px-2 py-2 text-ink-100 sm:px-3 sm:py-2.5">
                  <CostLabel cost={cost} />
                </td>
                {matrix[i].map((p, j) => (
                  <td
                    key={j}
                    className="px-2 py-2 text-center text-ink-100 sm:px-3 sm:py-2.5"
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

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-mono text-xs text-ink-500">
          {onlyGeneric ? (
            <>
              No rune colors detected — only generic costs shown. Add rune lines like{" "}
              <span className="text-accent">12 Order Rune</span> to see colored cost rows.
            </>
          ) : (
            <>
              Cost rows derived from your deck&rsquo;s rune colors. Cell shading scales with probability.
            </>
          )}
        </p>
        <button
          onClick={handleCopy}
          className="rounded-sm border border-ink-700 bg-ink-900 px-3 py-1.5 font-mono text-xs text-ink-200 transition hover:border-accent hover:text-accent"
        >
          {justCopied ? "Copied" : "Copy share text"}
        </button>
      </div>
    </section>
  );
}
