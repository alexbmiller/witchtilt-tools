# NEXT.md — Handoff for v0.2

This document describes what to build next and why. Drop into a fresh Claude Code session (or any AI assistant with repo access), open this file first, and you have full context without needing the original conversation.

## Project: Rune Odds — Riftbound TCG probability calculator

- **Live**: https://riftbound-runes-ilbmlmv7b-alexbmillers-projects.vercel.app/
- **Stack**: Next.js 14 (App Router) + TypeScript + Tailwind, deployed on Vercel.
- **Current version**: v0.1.1 (see CHANGELOG.md).
- **Project owner**: Alex Miller — senior full-stack dev. Skip explanations of git, npm, Vercel, TypeScript basics, etc. Jump straight to the work.

## What v0.2 needs to do

**Add a "distribution mode" switcher** so the user can pick which probability model the tool runs against. Two modes for now, structured so more can be added later without UI churn.

### Mode 1: Hypergeometric (deckbuilding) — the current model

- This is what v0.1.1 already does. Don't change the math.
- The mode should be labeled clearly, e.g. "Deckbuilding (no recycling)" or "Hypergeometric — fresh deck."
- Keep this as the default mode. It's the right answer for the question most people are asking.

### Mode 2: Recycling-aware (mid-game)

This is the new functionality. The user enters their *current game state* and the tool returns the probability of channeling target colors on upcoming turns.

**Required inputs (in addition to the existing "target color in deck" and "going first/second"):**

- **Current turn number** (1–N). Determines how many channels have already happened.
- **Runes already channeled by color**. The user tracks which runes they've revealed/used.
- **Runes recycled by color**. These have been placed at the EXACT BOTTOM of the deck in known order. They are unreachable until everything above them has been channeled.

**Math model:**

Riftbound recycling places recycled runes at the bottom of the rune deck with NO RESHUFFLE. The deck partitions into:

1. **Channeled (visible)**: cards already revealed. Known.
2. **Remaining (unknown)**: cards still face-down at the top of the deck. Unknown order.
3. **Buried (recycled)**: cards at the bottom of the deck in known order.

For a typical mid-game query like "what are my odds of channeling a Red on my next turn":

- The next channels draw from the *remaining* segment (top of unknown portion).
- Compute hypergeometric odds against the remaining segment only — its size is `12 - (channeled) - (recycled)`, and the relevant count is `(target color in original deck) - (target channeled) - (target recycled)`.
- The buried segment becomes reachable only if you channel through the entire remaining segment first. For most realistic queries (next 1–3 turns) you can ignore it — the buried segment is unreachable in the time horizon people care about.
- For longer-horizon queries that *would* reach the buried segment, you'd need to model it as deterministic draws from the bottom in known order. Not required for v0.2 unless straightforward to add.

**Reasonable v0.2 scope**: handle the common case (next 1–3 turns from current state, ignoring the buried segment as effectively-unreachable). Surface a warning if the user's inputs imply they'd burn through the entire remaining segment within the displayed horizon.

### UI considerations

- The mode switcher should be prominent but not the first thing the user sees. The default deckbuilding mode is the right starting point.
- When switching to recycling mode, additional inputs appear (channeled count, recycled count, current turn). Don't make the user fill them in unnecessarily for the deckbuilding mode.
- Maintain the existing visual style: monospace numerics, near-black background, muted gold accent, sharp corners, no decorative animations. The tool's aesthetic is part of the brand (WitchTilt — see below).
- Mobile-first — the existing layout already handles small screens with `overflow-x-auto` on the table. New inputs need to follow the same pattern.

### Code organization

- Keep the math separate from the UI. `lib/probability.ts` already has a clean hypergeometric helper — extend it with recycling-aware functions, don't conflate them. New helpers might be: `runesRemainingByTurn`, `hypergeomMidGame`, etc.
- Add a discriminated union for the mode if it helps type-safety: `type Mode = { kind: "deckbuilding" } | { kind: "midgame", channeled: number, recycled: number, ... }`.
- Comment the math thoroughly. The CHANGELOG.md has the conceptual model; mirror those comments in the code.
- Update CHANGELOG.md when v0.2 is shipped, following the existing format.

### Tests / sanity checks

There are no formal tests in the repo yet. For v0.2, consider adding a small `lib/probability.test.ts` (Vitest or whatever fits the Next.js setup) with at minimum:

- Hypergeometric mode produces the same results v0.1.1 produced (regression test against known good values like P(≥1 | K=4, n=2) = 0.5758).
- Mid-game mode correctly reduces to hypergeometric when no recycling has occurred.
- Mid-game mode handles edge cases: 0 remaining, all of color recycled, etc.

If formal tests are out of scope, at minimum write a sanity script (like `sanity.js`) that prints expected vs actual for a handful of cases and run it before deploying.

## What NOT to change

- **Don't reintroduce an "opening hand of runes" concept.** Riftbound's 4-card opening hand is from the main deck, not the rune deck. The rune deck is sealed pre-game and only revealed via channeling.
- **Don't change the going-first/going-second channel counts.** Verified: 2 first / 3 second on T1, then +2 each turn. Multiple official sources confirmed.
- **Don't restructure the existing UI without reason.** The current layout is intentional — header, controls, setup explainer, table, share button, footer. Extend, don't rebuild.
- **Don't pull in a UI component library.** Tailwind + custom is the chosen direction.

## Brand context (for any UI copy you write)

- **Channel name**: WitchTilt (the broader content/brand parent).
- **Tool name**: Rune Odds (sub-brand under WitchTilt).
- **Voice**: Confident, slightly nerdy, slightly funny. Comedy-debate hybrid energy. NOT corporate, NOT cringey, NOT cutesy.
- **Aesthetic**: Late-night card shop. Near-black + muted gold. Sharp lines. Monospace where numbers appear.
- **Existing examples of voice**: see the v0.1.1 setup explainer and CHANGELOG.md. Match that register.

## Workflow expectations

- Ship-first mindset. Get it working, deploy, iterate. Don't gold-plate.
- Senior dev — skip the basics, jump to the point.
- Honest pushback welcomed. If something in this doc seems wrong, say so before building on top of it.
- Vercel auto-deploys on push to main. Treat main as production; use feature branches for v0.2 work.

## Open questions to resolve before or during v0.2

1. **UX for recycling input**: a single number per color? A running tally as the game progresses? Worth thinking about whether there's a clever input pattern (counters that increment, or "click to log a recycle" buttons) that makes the tool genuinely usable mid-game without breaking flow.
2. **Should the share-text feature export the current game state?** "Recycled 2R, 1B; channeled 4 cards; T3 going first; odds of next Red: 47.2%" — could be useful for Discord posts dissecting specific game moments.
3. **Multi-color queries** (originally planned for v0.2, now pushed to v0.3) — confirm with the user whether they want any of that scope in v0.2 or keep it tight.

## When you're done

- Update `app/page.tsx` version label.
- Add v0.2 entry to `CHANGELOG.md`.
- Update `README.md` if anything user-facing materially changed.
- Consider whether this NEXT.md should be updated to describe v0.3, or just deleted (since v0.2 is no longer "next").
- Push to main; Vercel deploys; verify on the live URL.
