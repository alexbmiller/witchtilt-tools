# Rune Odds v0.3 — Architecture Spec

**Scope**: AND-only multi-color queries via card-cost input. Headline shift: tool upgrades from "rune probability calculator" to "mana curve calculator."

**Status**: spec frozen 2026-05-11. Implement in build order. Don't scope-creep.

---

## 1. Color codes (canonical)

Six colors, six single-letter codes used in cost strings:

| Code | Color  | Domain |
|------|--------|--------|
| R    | Red    | Fury   |
| B    | Blue   | Mind   |
| P    | Purple | Chaos  |
| O    | Orange | Body   |
| G    | Green  | Calm   |
| Y    | Yellow | Order  |

**TODO before commit**: verify the official Riftbound cost-string convention against the rulebook. If Riot uses a different notation (e.g., domain words rather than color letters), update parser to match. Don't ship divergence from official game text.

---

## 2. Cost grammar

A cost string has the form `<generic><color1><color2>...`:

- **Generic** = leading digits (0–N). Optional; defaults to 0.
- **Color requirements** = single-letter codes from the table above, repeated for count.

### Examples

| Input | Generic | Color requirements | Total cost |
|-------|---------|--------------------|------------|
| `2RR` | 2       | R:2                | 4          |
| `1BG` | 1       | B:1, G:1           | 3          |
| `3`   | 3       | (none)             | 3          |
| `RRR` | 0       | R:3                | 3          |
| `5RGBY` | 5     | R:1, G:1, B:1, Y:1 | 9          |
| `0`   | 0       | (none)             | 0 (trivial)|

### Parser output

```typescript
interface CardCost {
  generic: number;
  colors: Record<Color, number>;  // missing colors omitted or = 0
  totalCost: number;              // generic + sum(colors)
  raw: string;                    // original input for display
}
```

Parser returns `CardCost | ParseError`. ParseError surfaces what failed (invalid char, leading non-digit, etc.) for UI feedback.

---

## 3. Castability check

A hand of channeled runes satisfies a cost iff:

1. Hand size ≥ total cost
2. For each color requirement `c`: count of `c` in hand ≥ required count of `c`

Generic mana is satisfied automatically once total channel count ≥ total cost.

---

## 4. Probability model

**Multivariate hypergeometric distribution.**

Given:
- Deck of size N=12 partitioned into color groups of sizes `K_R, K_B, K_P, K_O, K_G, K_Y` (sum ≤ 12; remainder is "uncolored" if any, though Riftbound rune decks should sum to exactly 12)
- Sample size n = channels seen by end of turn T
- Requirements `r_c` for each color from the parsed cost

Compute:
```
P(can cast by T) = sum over all valid hand compositions (k_R, k_B, ...) of:
  P(X_R = k_R, X_B = k_B, ...)
```

where "valid" means `k_c ≥ r_c` for each required color AND `sum(k_c) ≤ n`.

The multivariate hypergeometric PMF:
```
P(X_1=k_1, ..., X_m=k_m) = [Π C(K_i, k_i)] / C(N, n)
```

**Implementation**: enumerate valid hand compositions and sum. For deck size 12 and ≤6 colors required, search space is small (worst case ~12^6, in practice far fewer because color counts cap at their deck counts and constraints prune aggressively). No need for closed-form or Monte Carlo.

### Channels seen by turn

- Going first: `2 + 2*(T-1)` for T ≥ 1
- Going second: `3 + 2*(T-1)` for T ≥ 1
- Always cap at deck size (12) or remaining unknown segment (mid-game mode)

---

## 5. Edge cases (math layer must handle)

1. **Cost has more channels than seen** → P = 0 for that turn. Return 0, don't error.
2. **Cost requires more of a color than exists in deck** → P = 0 always. Return 0 with a flag for UI to show "impossible with this deckbuild."
3. **Total channels seen ≥ deck size** → use deck size as effective sample. Cap at 12 (or pile size in mid-game mode).
4. **Cost has 0 total cost** → P = 1 (trivially castable).
5. **Mid-game mode**: same multivariate logic, but the sample comes from the unknown segment, not the full 12. "Deck composition" inputs become "unknown pile composition" and sample size becomes `min(remainingChannels, unknownPileSize)`.

---

## 6. UX model

### Mode selector

Top of page, persistent radio toggle. Two modes:

- **Card mode** (default, primary): the v0.3 card-cost input experience.
- **Rune mode** (simple, secondary): the existing v0.2 UI, untouched. Both Deckbuilding and Mid-game sub-modes remain inside Rune mode.

### Card mode inputs

1. **Cost string text field**. Live parsing with feedback. As user types `2RR`, show parsed breakdown: "2 generic + 2 Red, total cost 4."
2. **Deck composition** — 6 number inputs (one per color), sum constrained ≤ 12. Show running total + over-budget feedback. Stretch: "common splits" preset chips (4-4-4, 6-3-3, 8-4, 12-0).
3. **Turn order toggle** — going first / going second.
4. **Mid-game sub-mode toggle** — adds inputs for unknown-pile composition and current turn. Card mode + mid-game must both work in v0.3.

### Card mode outputs

- Probability-by-turn table. Rows = turns 1–6. Primary column: P(can cast by end of turn N).
- Optional secondary column: P(can cast on exactly turn N) for users who want the marginal.
- Visual flag on rows where cost is mathematically unachievable.
- Carry-over: copy-share-text button.

### Rune mode

Existing v0.2 UI, untouched. Refactor only to extract it into its own component behind the mode toggle. Don't redesign it.

---

## 7. Code architecture

Verify file layout against actual repo before commits. Assumed structure:

```
lib/
├── hypergeom.ts          (existing — single-color hypergeometric)
├── cost-parser.ts        (new — parse cost strings)
├── multivariate.ts       (new — multivariate hypergeometric)
└── card-mode.ts          (new — P(castable) given deck + cost + turn)

app/
├── page.tsx              (refactor to host mode toggle)
└── components/
    ├── rune-mode.tsx     (extracted v0.2 UI)
    ├── card-mode.tsx     (new card-cost UI)
    └── shared/           (turn-order toggle, share-text button, etc.)
```

**Math layer stays pure** — no React, no state, no side effects. UI components stay dumb. Page-level state holds the mode selector.

### Public API surface

```typescript
// cost-parser.ts
export type Color = 'R' | 'B' | 'P' | 'O' | 'G' | 'Y';
export interface CardCost {
  generic: number;
  colors: Partial<Record<Color, number>>;
  totalCost: number;
  raw: string;
}
export type ParseResult = { ok: true; cost: CardCost } | { ok: false; error: string };
export function parseCost(input: string): ParseResult;

// multivariate.ts
export function multivariateHypergeom(
  deckSize: number,
  colorCounts: Record<Color, number>,
  sampleSize: number,
  requirements: Partial<Record<Color, number>>
): number;

// card-mode.ts
export function probabilityCanCast(
  cost: CardCost,
  deckComposition: Record<Color, number>,
  turn: number,
  goingFirst: boolean
): number;
```

---

## 8. Testing

Add `lib/__tests__/` (or whatever existing test convention the repo uses — verify first). Required cases:

- **Trivial cost** (`0`): P = 1 always
- **Impossible cost** (`RRR` when deck has 2 R): P = 0 always
- **Simple cost** (`1`, deck = 12R, T1 going first): P = 2/12 ≈ 0.167
- **Regression** (single-color cost equivalent to old v0.2 query): output matches v0.2 to floating-point precision
- **Two-color AND** (`RB`, deck = 6R/6B, T1 going first, 2 channels): hand-verify against multivariate PMF
- **Edge: cost > deck size** (`12RR`): P = 0 always

If the repo doesn't have a test framework set up yet, install one (Vitest is the Next.js-native choice). Don't ship math without tests.

---

## 9. Build order

Ship each step before moving on. Don't bundle.

1. **Cost parser + tests.** Standalone, no dependencies. Get this right first.
2. **Multivariate hypergeom + tests.** Pure math, validate single-color cases match v0.2.
3. **`probabilityCanCast` wrapper + tests.** Composes parser + multivariate. End of math layer.
4. **Mode toggle on page.** Extract existing v0.2 UI into `<RuneMode />`. Add stub `<CardMode />`. Ship and verify nothing regressed in Rune mode.
5. **Card mode UI.** Inputs, live parse feedback, output table.
6. **Mid-game support in card mode.** Extend math to use recycling-aware sample.
7. **Polish.** Share text, edge case messaging, empty states.

After step 3, math is done. After step 4, the refactor is done. Steps 5–7 are UX iteration.

---

## 10. Non-goals (explicit OUT of scope for v0.3)

Do not scope-creep these in:

- OR queries
- NOT queries
- Multi-card queries ("cast champion T2 AND combo piece T3")
- Mulligan logic
- Domain requirements for specific cards (different problem — those involve specific cards in deck, not just runes)
- Saved decks / history
- Card name database / autocomplete
- Login / accounts

Candidates for v0.4 or later.

---

## 11. Done criteria

v0.3 ships when:

- All math tests pass
- Card mode renders, parses live, shows probability table end-to-end for a real example
- Rune mode still works identically to v0.2 (regression check)
- Mid-game submode works in Card mode
- Mobile layout doesn't break
- Manual smoke test: cost `2RR` + deck `4R/4B/4G` + going first produces realistic, non-zero, monotonically-increasing-by-turn probabilities

---

## 12. Deployment

Work on branch `v0.3-card-mode`. Do NOT push directly to `main`. Vercel will auto-generate a preview deployment for the branch — test there before merging. Merge to main only when Done criteria are all met.
