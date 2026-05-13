# Deck Pastebin v0.1 — Architecture Spec

> **STATUS: ARCHIVED 2026-05-13.** This spec was implemented and shipped as Deck Pastebin v0.1 on 2026-05-11. The strategic decision on 2026-05-13 retired the standalone-tool framing: the pastebin functionality is being merged into Rune Odds as a third mode (Rune Odds v0.4, in progress on branch `runes-unified-tool`). The `decks.witchtilt.com` subdomain is being held back for the future Deck Builder, which is gated on Riot Developer API key approval.
>
> The architecture and parser details below remain accurate for the implementation that lives in `lib/decklist-parser.ts`, `lib/cost-spread.ts`, `lib/share-text.ts`, `app/components/decks/`, and `app/decks/page.tsx`. After v0.4 ships, that code will continue to back the new Rune Odds "Deck" mode rather than its own page; the `/decks` route becomes a coming-soon placeholder for the future Deck Builder.
>
> Read this document as historical context for how the pastebin was scoped — not as active spec.

---

**Scope**: A single page where a user pastes a Riftbound decklist and sees the mana curve / rune odds for that specific deck. No save, no edit, no accounts. Paste in → results out.

**Status**: spec frozen 2026-05-11. Build *after* Rune Odds v0.3 ships. Don't bundle.

**Position in the launch architecture**:
- `witchtilt.com` — landing page with tools grid (separate work block, the site buildout)
- `runes.witchtilt.com` — Rune Odds v0.3 (the calculator)
- `decks.witchtilt.com` — **this tool** (deck pastebin → curve preview)

---

## 1. What this tool does (and doesn't)

### Does
- Accept a Riftbound decklist as pasted text
- Parse it into structured cards and runes
- Extract rune counts by color
- Pipe those counts into Rune Odds math
- Display the deck's mana curve (probability of casting representative costs by turn)

### Does NOT (out of scope for v0.1)
- Save decks (no DB, no localStorage)
- Edit decks in-place (paste-only)
- Validate decks against full Riftbound legality rules (no card database; we trust the user's list)
- Show card images or art (no card DB, no asset pipeline)
- Share via URL (no persistence layer)
- Account or login (zero auth surface)
- Suggest deck changes ("you should run more Red")

These are all v0.2+ candidates and live in the Tool Roadmap.

---

## 2. Decklist format

Riftbound community uses a standard text format. Examples from public sources:

```
1 Viktor, Herald of the Arcane
1 Viktor, Leader
3 Seal of Unity
3 Stupefy
3 Hidden Blade
3 Siphon Power
3 Soaring Scout
3 Cull the Weak
3 Watchful Sentry
3 Faithful Manufactor
3 Vanguard Captain
3 Cruel Patron
3 Machine Evangel
3 Grand Strategem
3 Harnessed Dragon
1 Targon's Peak
1 Trifarian War Camp
1 Obelisk of Power
12 Order Rune
```

**Format** (verified 2026-05-11 against Mobalytics tournament deck exports and Riot's official organized-play deck recaps): each line is `<count> <card name>`. Whitespace-tolerant. Empty lines and comment lines (`//` or `#`) ignored.

**Rune lines** are special — they end in the word `Rune` preceded by a domain word (`Order`, `Fury`, `Mind`, `Chaos`, `Body`, `Calm`). The parser identifies these as runes, not playable cards, and counts them toward the rune deck composition. **Rune pools may be multicolor** (e.g., `7 Mind Rune` + `5 Order Rune` is a real, tournament-legal split) — sum across colors and warn only if the total isn't 12.

**Section headers**: real-world exports may include `Main Deck`, `Sideboard`, `Runes`, etc. as section labels (sometimes followed by `:` or a count). The parser recognises these and tracks which section each entry belongs to. Sideboard cards are parsed and surfaced informationally but never folded into the mana-curve math (the curve only ever reads the rune pool, so sideboards don't change probabilities). Unknown section labels are tolerated — they just become the label for any cards listed under them.

**Battlefield cards** sometimes carry a collector-code suffix in parens, e.g., `Obelisk of Power (284)`. We don't validate against any card database, so the full literal name (parens and all) is preserved. No special handling.

---

## 3. Parser output

```typescript
interface ParsedDeck {
  cards: DeckEntry[];     // all parsed non-rune entries, with section labels
  runes: RuneCounts;      // counts by color, sum may differ from 12 (warning issued)
  totalCards: number;     // sum of counts across all sections
  totalRunes: number;     // sum across colors
  warnings: string[];     // e.g., "rune pool has 10 runes", "duplicate entry"
  errors: string[];       // e.g., "couldn't parse line N"
}

interface DeckEntry {
  count: number;
  name: string;
  section: string;        // "Main Deck" (default), "Sideboard", or any custom header
}

type RuneCounts = Record<Color, number>;  // R/B/P/O/G/Y from cost-parser
```

Note: original spec named these `mainDeck` / `runeDeck`. Renamed during build to `cards` / `runes` because sideboards (and any other section labels) live in the same `cards` array tagged by `section` — `mainDeck` would be a misnomer.

**Domain-to-color mapping** for rune lines:
- `Fury Rune` → R
- `Mind Rune` → B
- `Chaos Rune` → P
- `Body Rune` → O
- `Calm Rune` → G
- `Order Rune` → Y

The parser tolerates case variation (`fury rune`, `FURY RUNE`, `Fury Rune` all work) and trailing whitespace.

---

## 4. What the page displays

Given a parsed deck, the page renders:

### Rune deck summary (always shown)
- Visual breakdown of the 12-card rune deck by color (small bars or stacked indicator)
- Total rune count + warning if not exactly 12

### Mana curve (the main output)
- A table showing P(can cast) by turn for **a representative spread of costs, derived from the deck's actual rune colors**
- Cost-spread shape (decided 2026-05-11, derived-from-colors approach): `1`, `2`, `3`, then one- and two-color variants of the shape `CC`, `1C`, `2C` per color present in the deck (and `CD`, `1CD`, `2CC` for any two-color combinations present). Mono-color decks see ~6 colored rows; two-color decks see ~12. v0.2 will let users specify their actual deck's costs directly.
- Each row = a cost, each column = a turn. The table always shows T1–T4 (the decision-making range for cheap costs). **T5 is shown only when at least one row hasn't fully saturated by T4** (any cell with P < 99.95%); otherwise it's just visual noise. T6 is never shown — by T6 you've channeled the entire 12-card rune deck and every cost rounds to 100%.
- Going first / going second toggle (same as Rune Odds)

Rationale: hardcoding R/B-only costs (the original v0.1 plan) makes the tool actively misleading for non-R/B decks (every color row would show `0%`). Deriving the spread from the pasted deck's runes keeps the table small and meaningful for any color composition without scope-creeping into user-customizable costs.

### Main deck list (informational)
- Just renders the parsed playable cards as a list with counts
- No probability math against the main deck (that's the future Main Deck Probability Calculator, item #3 on the roadmap)
- Purpose: confirms to the user "yes I parsed your list correctly"

---

## 5. Code architecture

As shipped:

```
lib/
├── decklist-parser.ts    (parse pasted text → ParsedDeck)
├── cost-spread.ts        (decide which costs to display from the deck's rune colors)
├── share-text.ts         (build the copy-shareable mana-curve text block)
└── (existing math layer from v0.3 unchanged, reused)

app/
├── decks/
│   └── page.tsx          (route — server component, header + Footer)
└── components/decks/
    ├── decklist-input.tsx    (client — textarea, warnings/errors, parsed summary)
    └── mana-curve-table.tsx  (client — derived cost rows, P-by-turn, share button)
```

Spec deltas from build:
- Components live in `app/components/decks/` (subdirectory) for consistency with the landing buildout's `app/components/landing/` pattern. Original spec had them flat in `app/components/`.
- The standalone `rune-breakdown.tsx` was folded into `decklist-input.tsx`'s `ParsedSummary` (small enough to not warrant its own file in v0.1; extract if it grows).
- `lib/cost-spread.ts` and `lib/share-text.ts` are new pure modules added during build, both with vitest coverage.

### Reuse, don't duplicate

The decklist tool **does not have its own math**. It parses the deck, extracts the rune counts, then calls:

```typescript
import { probabilityCanCast } from '@/lib/card-mode';
```

For each cost in the fixed spread, for each turn 1–6, call `probabilityCanCast(parseCost(costString), runeCounts, turn, goingFirst)`. Cache the matrix, render the table. That's the entire math story for this tool — no new math layer.

### Routing

Next.js App Router. New route at `app/decks/page.tsx`. Will eventually live at `decks.witchtilt.com` via Vercel subdomain config — but for now it's reachable at `witchtilt.com/decks` until the subdomain split happens in the site buildout work.

---

## 6. Edge cases

1. **Empty paste** → show example decklist as placeholder text; don't error
2. **Rune deck ≠ 12 cards** → warn, but still calculate. "Your rune deck has 11 cards; standard is 12. Probabilities below assume 11."
3. **Unrecognized card names in main deck** → ignore for math (we don't validate cards); list them as "couldn't identify" but proceed
4. **Unrecognized rune type** → warn, exclude from rune count
5. **Wildly malformed input** (just gibberish) → show "couldn't find any cards or runes — try the example format below"
6. **Duplicate entries** (same card listed twice) → sum the counts, warn user

---

## 7. UI behavior

- **Live parsing as user types/pastes.** Don't make them click a button.
- **Errors and warnings inline**, near the input, not blocking results.
- **Results visible immediately for any partial-but-valid input.** If they paste enough to compute a rune breakdown, show it.
- **Big "paste your decklist here" placeholder** with the example format inline.
- **Copy-share-text button** that produces text like:
  ```
  Deck: Viktor Order (parsed from witchtilt.com/decks)
  Runes: 12 Order (Y)
  Going first, P(can cast):
    T1 1: 100% | RR: 0% | YY: 0%
    T2 1: 100% | RR: 0% | YY: 100%
    ...
  ```

---

## 8. Build order

1. **Decklist parser + tests.** Standalone. Get the format right; edge cases (case insensitivity, comments, blank lines) tested.
2. **Page scaffolding** at `app/decks/page.tsx`. Just the route + placeholder content. Ship to branch, verify route works.
3. **Decklist input component** with live parse feedback.
4. **Rune breakdown component.**
5. **Mana curve table** — wire in `probabilityCanCast` from v0.3 math layer.
6. **Polish** — share text, edge case messaging, mobile layout.

Ships when:
- Parser correctly handles the example decklist from this doc
- A representative deck paste produces a sensible mana curve
- Rune mode and Card mode on `/` (Rune Odds) still work unchanged
- Mobile layout doesn't break

---

## 9. Non-goals (explicit OUT of scope)

Resist scope creep:

- Save / load decks
- Edit decks after pasting
- Card image rendering
- Card name autocomplete or validation against a card database
- Share URLs that encode the deck (no persistence)
- Suggesting deck changes
- Showing the main deck's probability of drawing specific cards (that's the Main Deck Probability Calculator, separate tool)
- Multi-deck comparison
- Account or login

Each of those is a real v0.2+ feature on its own. None of them ship in v0.1.

---

## 10. Deployment

Work on branch `decks-pastebin-v0.1`. Same pattern as Rune Odds v0.3 — don't push to main. Vercel preview deployment for the branch is the testing ground. Merge to main when done criteria are met.

Subdomain `decks.witchtilt.com` happens in the site buildout work block (Vercel project settings → Domains). Until then the tool lives at `witchtilt.com/decks` and works fine there.

---

## 11. Follow-ups for v0.2+

Deferred from v0.1 by explicit decision; tracked here so they're not lost.

- **Cost spread should derive from the deck's actual card costs, not just its rune colors.** Today the spread is built from the deck's rune-color composition (top 2 by count) + a fixed shape (`1/2/3`, `CC/1C/2C`, etc.). Smarter v0.2: parse each card's mana cost from the deck list and only display rows for costs that actually appear in this deck. Requires a card database (or at minimum a name→cost lookup) so we know what `Daring Poro` costs. Per §1 we explicitly don't have one yet — this is the largest unlock the tool is missing. Noted by user 2026-05-11.

- **3+ color cost spread.** Today's top-2-by-count fallback (R/B/P/O/G/Y tie-break) silently drops the third+ color for tri-color decks. v0.2 should either show top-3 mixes or let the user pick which 2-3 colors they care about. Documented inline in `lib/cost-spread.ts`.
