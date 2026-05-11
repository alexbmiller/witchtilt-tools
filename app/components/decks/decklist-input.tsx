"use client";

import { useMemo, useState } from "react";
import { COLORS, type Color } from "@/lib/cost-parser";
import { parseDecklist, type ParsedDeck } from "@/lib/decklist-parser";
import ManaCurveTable from "./mana-curve-table";

const EXAMPLE_DECK = `1 Viktor, Leader
3 Daring Poro
3 Machine Evangel
3 Stupefy
7 Mind Rune
5 Order Rune`;

const EMPTY_PLACEHOLDER = "Paste your decklist here…";

const COLOR_LABELS: Record<Color, string> = {
  R: "Fury",
  B: "Mind",
  P: "Chaos",
  O: "Body",
  G: "Calm",
  Y: "Order",
};

const COLOR_SWATCH: Record<Color, string> = {
  R: "bg-red-500/80",
  B: "bg-blue-500/80",
  P: "bg-purple-500/80",
  O: "bg-orange-500/80",
  G: "bg-emerald-500/80",
  Y: "bg-yellow-400/80",
};

export default function DecklistInput() {
  const [text, setText] = useState("");

  const hasInput = text.trim().length > 0;
  // When the textarea is empty, parse a built-in example so the mana curve
  // renders on first visit instead of a blank state. As soon as the user
  // pastes anything, we switch to parsing their input.
  const sourceText = hasInput ? text : EXAMPLE_DECK;
  const parsed: ParsedDeck = useMemo(() => parseDecklist(sourceText), [sourceText]);

  const showingExample = !hasInput;
  const foundNothing = hasInput && parsed.cards.length === 0 && parsed.totalRunes === 0;

  return (
    <div className="space-y-4">
      <label className="block">
        <span className="mb-2 block font-mono text-xs uppercase tracking-wider text-ink-400">
          Decklist
        </span>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={EMPTY_PLACEHOLDER}
          rows={14}
          spellCheck={false}
          className="w-full rounded-sm border border-ink-700 bg-ink-950 px-3 py-3 font-mono text-sm text-ink-100 placeholder:text-ink-600 focus:border-accent focus:outline-none"
          aria-label="Paste your Riftbound decklist"
        />
      </label>

      {foundNothing && (
        <p className="rounded-sm border border-ink-700 bg-ink-900/40 px-3 py-2 font-mono text-xs text-ink-300">
          Couldn&rsquo;t find any cards or runes. Each line should be{" "}
          <span className="text-accent">{`<count> <name>`}</span>, e.g.{" "}
          <span className="text-accent">3 Daring Poro</span> or{" "}
          <span className="text-accent">12 Order Rune</span>.
        </p>
      )}

      {parsed.errors.length > 0 && (
        <ul className="space-y-1 rounded-sm border border-red-900/60 bg-red-950/30 px-3 py-2 font-mono text-xs text-red-300">
          {parsed.errors.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      )}

      {parsed.warnings.length > 0 && (
        <ul className="space-y-1 rounded-sm border border-yellow-900/60 bg-yellow-950/20 px-3 py-2 font-mono text-xs text-yellow-200/90">
          {parsed.warnings.map((w, i) => (
            <li key={i}>{w}</li>
          ))}
        </ul>
      )}

      {!foundNothing && (
        <>
          {showingExample && (
            <p className="rounded-sm border border-accent/40 bg-accent/5 px-3 py-2 font-mono text-xs text-accent/90">
              Showing example deck (7 Mind + 5 Order). Paste your own decklist above to replace.
            </p>
          )}
          <ParsedSummary parsed={parsed} />
          <ManaCurveTable runes={parsed.runes} />
        </>
      )}
    </div>
  );
}

function ParsedSummary({ parsed }: { parsed: ParsedDeck }) {
  const sectionCounts = new Map<string, number>();
  for (const card of parsed.cards) {
    sectionCounts.set(card.section, (sectionCounts.get(card.section) ?? 0) + card.count);
  }

  const cardsBySection = new Map<string, ParsedDeck["cards"]>();
  for (const card of parsed.cards) {
    const list = cardsBySection.get(card.section) ?? [];
    list.push(card);
    cardsBySection.set(card.section, list);
  }

  return (
    <div className="space-y-3 rounded-sm border border-ink-700 px-4 py-3">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <div className="mb-1 font-mono text-xs uppercase tracking-wider text-ink-400">
            Parsed cards
          </div>
          {sectionCounts.size === 0 ? (
            <p className="font-mono text-sm text-ink-500">none</p>
          ) : (
            <ul className="space-y-0.5 font-mono text-sm text-ink-200">
              {Array.from(sectionCounts.entries()).map(([section, count]) => (
                <li key={section} className="flex justify-between gap-4">
                  <span className="text-ink-300">{section}</span>
                  <span>{count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <div className="mb-1 font-mono text-xs uppercase tracking-wider text-ink-400">
            Rune pool ({parsed.totalRunes})
          </div>
          {parsed.totalRunes === 0 ? (
            <p className="font-mono text-sm text-ink-500">none</p>
          ) : (
            <ul className="space-y-0.5 font-mono text-sm text-ink-200">
              {COLORS.filter((c) => parsed.runes[c] > 0).map((c) => (
                <li key={c} className="flex items-center justify-between gap-4">
                  <span className="flex items-center gap-2">
                    <span className={`inline-block h-2 w-2 rounded-sm ${COLOR_SWATCH[c]}`} />
                    <span className="text-ink-300">{COLOR_LABELS[c]}</span>
                  </span>
                  <span>{parsed.runes[c]}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {parsed.cards.length > 0 && (
        <details className="border-t border-ink-800 pt-2">
          <summary className="cursor-pointer font-mono text-xs uppercase tracking-wider text-ink-400 hover:text-ink-200">
            View parsed cards ({parsed.totalCards})
          </summary>
          <div className="mt-2 space-y-3">
            {Array.from(cardsBySection.entries()).map(([section, list]) => (
              <div key={section}>
                <div className="mb-1 font-mono text-[10px] uppercase tracking-wider text-ink-500">
                  {section}
                </div>
                <ul className="space-y-0.5 font-mono text-sm text-ink-300">
                  {list.map((card, i) => (
                    <li key={`${section}-${i}`} className="flex gap-3">
                      <span className="w-8 text-right text-ink-500">{card.count}×</span>
                      <span>{card.name}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
