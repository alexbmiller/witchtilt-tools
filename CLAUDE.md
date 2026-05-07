# CLAUDE.md — Rune Odds

## Project

Hypergeometric probability calculator for the Riftbound TCG 12-card rune deck. Part of the WitchTilt content brand.

- **Stack**: Next.js 14 (App Router) · TypeScript · Tailwind CSS · Vercel
- **Repo**: https://github.com/alexbmiller/riftbound-runes
- **Deploy**: Vercel auto-deploys on push to `main`. Treat `main` as production. Feature work goes on branches.

## Key files

- `app/page.tsx` — entire UI (single page app, no sub-routes)
- `lib/probability.ts` — all math; no UI imports
- `tailwind.config.js` — custom colors: `ink-*` scale + `accent` (muted gold)

## Game rules baked into the math

- Rune deck is exactly 12 cards, sealed face-down pre-game.
- Going first: channel 2 on T1, then +2 each turn.
- Going second: channel 3 on T1, then +2 each turn.
- Recycled runes go to the **exact bottom** of the deck with no reshuffle. They're unreachable until everything above them is channeled.
- These channel counts are verified against official sources — don't change them.

## Modes

**Deckbuilding** (default): standard hypergeometric over the full 12-card deck. Inputs: target color count (0–12), turn order.

**Mid-game**: hypergeometric over the remaining unknown segment only. Inputs: target color in unknown pile, pile size, current turn, turn order. Rows where draws would hit the buried segment are flagged ⚠.

## Code conventions

- Math stays in `lib/probability.ts`. UI stays in `app/page.tsx`. Don't mix.
- No UI component libraries. Tailwind + custom only.
- No comments explaining what code does. Math functions are an exception — comment the model thoroughly.
- `binom()` uses BigInt to avoid floating-point errors on integer combinatorics; converts to Number only at the final division.

## Style

Near-black background · muted gold accent (`text-accent`, `border-accent`) · monospace for all numbers · sharp corners (`rounded-sm`) · no animations. Mobile-first — tables use `overflow-x-auto`.

Active button state: `border-accent bg-accent/10 text-accent`
Inactive button state: `border-ink-700 text-ink-300 hover:border-ink-600 hover:text-ink-100`

## Voice (for any UI copy)

Confident, slightly nerdy, slightly funny. Comedy-debate energy. Not corporate, not cutesy. See the existing explainer copy in `app/page.tsx` as the reference register.

## What NOT to do

- Don't reintroduce an "opening hand of runes" concept — the 4-card opening hand is from the main deck, not the rune deck.
- Don't change the going-first/going-second channel counts.
- Don't pull in a UI component library.
- Don't restructure the page layout without a reason — header, mode switcher, controls, explainer, table, share, footer.
