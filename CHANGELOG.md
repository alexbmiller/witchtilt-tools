# Changelog

All notable changes to `witchtilt-tools` will be documented here. Each tool versions independently (Rune Odds, Deck Pastebin, the landing page, etc.) — entries are listed chronologically with a tool prefix. The goal is to be honest about what changed, what we got wrong, and why the math is what it is.

---

## [Deck Pastebin 0.1.0] — 2026-05-11

### Added

- **New tool, lives at `decks.witchtilt.com`** (and at `witchtilt.com/decks` via path). Paste a Riftbound decklist; the tool extracts the rune pool and renders the probability of casting representative costs by each turn. The substantive output is the mana-curve table.
- **Decklist parser** that handles real-world Riftbound text exports: `<count> <card name>` per line, `<count> <Domain> Rune` for runes (Fury/Mind/Chaos/Body/Calm/Order), section headers (Main Deck, Sideboard, Runes, custom labels), multicolor rune pools, battlefield collector-code suffixes preserved verbatim, comments (`//` and `#`), duplicate-entry merging within a section. Format verified 2026-05-11 against Mobalytics tournament exports and Riot's official organized-play deck recaps.
- **Mana-curve table** reusing `probabilityCanCast` from Rune Odds v0.3's math layer. The cost spread is **derived from the deck's actual rune colors** (top 2 by count, canonical R/B/P/O/G/Y tie-break), not a fixed list — mono-color decks get 6 rows, two-color decks get 12. Cost letters are tinted in their canonical color; cell shading reuses the existing gold-accent heat scale.
- **Pre-fill example deck** (7 Mind + 5 Order Viktor list) when the textarea is empty, so the curve renders on first visit instead of a blank state. Textarea stays visually empty so users can paste without clearing.
- **Turn-trim rule**: T6 is always dropped (entire 12-card rune deck is channeled by then; every row reads 100%). T5 is shown only when at least one row hasn't fully saturated by T4 (any cell < 99.95%, the same threshold `pct()` uses to round to 100%). Tightens the table on mobile without losing information.
- **Share-text button** producing a Discord/X-pastable block (rune breakdown, going-first/second, P-by-turn for each cost). Rounded to whole percent for terseness; live table keeps 1-decimal precision.
- **New lib modules + tests** — `lib/decklist-parser.ts`, `lib/cost-spread.ts`, `lib/share-text.ts`. Vitest suite grows from 59 to 105 tests. No changes to Rune Odds math.

### Why the cost spread is derived, not fixed

The original spec hardcoded `1, 2, 3, RR, BB, 1R, 1B, 2R, 2B, RB, 1RB, 2RR`. That's only Red and Blue — for any Yellow/Green/Body/Chaos deck, nine of the twelve rows would show perpetually 0%, making the table actively misleading. The derived shape keeps the same patterns but substitutes the deck's actual colors. Spec §4 was updated during build to record the decision.

### What v0.1 explicitly does NOT do

No card-database validation (we trust the user's list verbatim), no deck saving/sharing via URL, no edit-in-place, no card-image rendering, no deck-change suggestions, no mid-game pile inputs. Each is a v0.2+ candidate on its own.

### v0.2 next-up

The biggest unlock the tool is missing: cost spread should ultimately derive from the deck's **actual card costs** (not just its rune colors), which requires a name→cost lookup table. Tracked in `docs/SPEC_decks_v0.1.md` §11.

---

## [Landing 0.1.0] — 2026-05-11

### Added

- **Landing page at `witchtilt.com/`** — Hero (hex sigil + wordmark + tagline "Tools and arguments for trading card players"), tools grid (Rune Odds + Deck Pastebin live; Deck Builder / Pack EV / Draft Sim / Resolution Sequencer as coming-soon), about strip, footer with Riot fan-content disclaimer.
- **WitchTilt brand wired up** — IM Fell English SC for the wordmark (loaded via `next/font/google`, self-hosted at build), near-black `#0a0b0d` background, muted gold `#d4af37` accent, monospace numerics, sharp corners. Mobile-first; no animations beyond CSS hover.
- **Subdomain rewrites** in `next.config.js` so `runes.witchtilt.com` and `decks.witchtilt.com` serve their respective routes from the same deployment.
- **Riot Developer Portal token** at `/riot.txt` for domain verification.
- **Server-rendered**, zero client JS for the landing itself.

### Not in v0.1

No email capture, no analytics, no cookie banner, no blog, no animated hero, no `/about` page, no sidebar nav (deferred to v1+ when there are 5+ live tools). Social-link row is YouTube-only until the first video launches and TikTok/IG/X handles are confirmed.

---

## [Rune Odds 0.3.0] — 2026-05-11

### Added

- **Card mode** — new top-level mode toggle (Card mode default, Rune mode behind the switch). Type a card cost like `2RR`, configure your deck's color split, see the probability you can actually pay it by turn N. Generic + colored costs, multi-color AND queries.
- **Multivariate hypergeometric model** for multi-color queries. The deck partitions into the colors you specify plus an implicit "rest" group; we sum the PMF over every hand composition that satisfies the required minima. Single-color queries reduce exactly to the v0.2 univariate hypergeom — verified by a regression battery across deck size, sample size, and threshold.
- **Cost grammar** — `<generic digits><color letters>`, single-letter codes R/B/P/O/G/Y (Red/Blue/Purple/Orange/Green/Yellow → Fury/Mind/Chaos/Body/Calm/Order). Whitespace tolerated, case-insensitive. Example: `2RR` parses to generic=2, R:2, total=4.
- **Smart deck-composition presets** — 6-6, 4-4-4, 8-4, 6-3-3. Clicking a preset preserves any colors you've already filled in and pads the rest alphabetically.
- **Mid-game support inside Card mode** — same sub-mode pattern as Rune mode. Sample shifts to the unknown pile, with the boundary-crossing flag carried over.
- **Info popover** in the header — short hypergeometric explainer that applies to both modes.
- **Test suite** — Vitest, 59 tests covering parser, multivariate math, and the canCast wrappers. `npm test` to run.

### Changed

- **Repo renamed** from `riftbound-runes` to `witchtilt-tools` on GitHub (canonical home for the WitchTilt content + tools umbrella). Production URL unchanged: https://www.witchtilt.com.
- **`app/page.tsx` refactored** into per-mode components under `app/components/`. Rune mode is the verbatim v0.2 UI relocated — no behavior change. Cross-component styling and number-format helpers live in `app/components/shared.ts`.
- **Slider helper** in Rune-mode deckbuilding rewritten to call out the 12-card assumption explicitly: "Your rune deck is 12 cards total. Set how many of one color you're running; the remaining 12 − N are other colors."
- **Share-text URL** updated to `via witchtilt.com` in both modes (was `runeodds.app`, the pre-Cloudflare working name).
- **Version badge** in the header bumped to v0.3.

### Math model — Card mode

Multivariate hypergeometric PMF over a partitioned deck:

```
P(X_1=k_1, ..., X_m=k_m) = [Π C(K_i, k_i)] / C(N, n)
```

Where N = deck size, K_i = count of color i in deck, n = sample size, k_i = drawn of color i.

For "can I cast cost X by turn T?", sum over all valid (k_c) tuples — each k_c ≥ r_c for required colors, running sum ≤ n. Non-required colors collapse into a single "rest" group for efficiency (skips enumerating combinations that don't affect the answer).

**Generic mana** is handled at the wrapper layer as a pure hand-size check: if cumulative channels by turn T < total cost, P = 0. Otherwise the multivariate result is the answer — any remaining cards in the channeled set cover the generic portion.

### Why a new mode instead of replacing Rune mode

Rune mode answers "how many of one color will I see by turn N?" — useful for deckbuilding intuition about a single color's reliability ("am I running enough Reds?"). Card mode answers "can I cast this specific cost?" — useful when you have a real card in hand and want to know when you can play it.

The honest reason we kept both: Rune mode's framing is faster for the common case where you only care about one color, and we didn't want to force a richer input model onto users who don't need it.

### Mid-game in Card mode is conservative on color

Mid-game Card mode samples only from the unknown pile. Already-channeled runes count toward generic mana (they're in your pool, they pay it), but **conservatively don't contribute color** — if your existing pool already covers part of the cost, subtract it from the cost string before querying.

In practice: a player with 2R already channeled who wants to cast 2RR should query the math as if the cost were `2` (just generic, since the colored part is paid). We could have asked for explicit pool composition as a second input set; doubling the input surface for a mode that's already finicky felt worse than the slightly conservative bound.

---

## [Rune Odds 0.2.0] — 2026-05-06

### Added
- **Mid-game mode** — a mode switcher (Deckbuilding / Mid-game) now sits above the controls. Mid-game mode models the actual in-game rune pile state rather than assuming a fresh deck.
- **Two direct inputs for mid-game:** "Target color in unknown pile" and "Unknown pile size" — the exact two numbers hypergeom needs. No decomposition into channeled/recycled counts; you tell the tool the pile state you observe.
- **Current turn selector** (T1–T6) for mid-game. Determines how many runes your upcoming turns will draw, following the standard +2/turn schedule from your current position.
- **Boundary warning:** rows where upcoming draws would exhaust the unknown pile and reach the buried (recycled) segment are flagged with ⚠ and dimmed. A banner explains that the model breaks down at that point.
- **Share text updates** for mid-game: the copied text now includes current turn, going order, and pile state so Discord posts have full context.

### Math model — mid-game

The rune deck mid-game partitions into three layers:

1. **Channeled** — already revealed. Count is determined by turn number + going order.
2. **Remaining** (unknown) — face-down cards you'll draw from next. This is what the inputs describe.
3. **Buried** — recycled runes at the exact bottom, in known fixed order. Unreachable until the remaining layer is exhausted.

Channels draw from the remaining layer. The probability model is the same hypergeometric formula as deckbuilding, but with N = remaining pile size and K = target color in remaining pile:

```
P(X ≥ Y) = sum over y from Y to min(n, K) of:
  C(K, y) * C(N-K, n-y) / C(N, n)
```

This is correct as long as draws don't reach the buried layer. Once they would, the buried cards enter in a deterministic fixed order — not randomly — and hypergeom no longer applies. Those rows are flagged.

### Why direct inputs instead of channeled/recycled decomposition

The mid-game input could have been "how many did you channel" + "how many did you recycle" per color. We chose not to for two reasons:

1. Hypergeom only needs N and K. Those are derived facts; the pile state is the direct truth.
2. Recycling non-target runes still affects N (it shrinks the remaining pile, increasing concentration). Asking "total recycled" plus "target recycled" as separate inputs adds cognitive overhead without adding information the model doesn't already have from N and K directly.

The honest interface is: count the face-down runes, count the target color among them, enter both. Done.

---

## [Rune Odds 0.1.1] — 2026-05-06

### Added
- Explicit note in the UI clarifying that the tool's odds assume no recycling has occurred, and that this calculator is for deckbuilding questions, not live mid-game decisions.
- This CHANGELOG.

### Why this matters

Rune Odds calculates probabilities using the **hypergeometric distribution** — the standard model for "drawing without replacement from a deck of known composition." It answers the question:

> Given that my 12-card rune deck contains K runes of color X, what's the probability that I'll have seen at least Y of them after channeling N times?

That's the right model for a question like *"if I run 4 Reds in my rune deck, am I likely to have a Red by turn 3?"* — a deckbuilding question, asked before the game starts, where the deck composition is what you control.

**But Riftbound has a wrinkle: recycling.** When you spend a Power cost, you Recycle a rune by placing it at the *exact bottom* of your rune deck. The deck does not reshuffle. That recycled rune is now unreachable until you've channeled through every other card above it.

This violates a core hypergeometric assumption — that draws come from a uniformly-random deck. After even one recycle, the deck has known structure: a known card at a known position. Subsequent channels aren't drawing from a uniform-random pool anymore.

### What v0.1.0 got right

The published numbers are *correct* for the question the tool is actually asking: deckbuilding odds with no recycling. If you run 4 of a color in a 12-card rune deck, you genuinely have a 57.6% chance of seeing at least one by the end of turn 1 going first. That's not wrong — it's just answering a specific question.

### What v0.1.0 got wrong (or rather, didn't address)

The tool didn't make its assumptions explicit. A user who's deep in a game and wants to know "what's my probability of channeling a Red on the next turn, given I've already recycled a Red?" would get a number that's slightly too optimistic — because the recycled Red is buried at the bottom and effectively out of reach.

We're addressing this in two parts:
1. **Now (v0.1.1):** be honest about what the model assumes. Note added to the UI.
2. **Soon (v0.2):** add inputs for recycled runes by color so the tool can model the actual mid-game state.

### Math footnote for the curious

For a 12-card rune deck containing K runes of a target color, after channeling N cards (with no recycling), the probability of seeing at least Y of that color is:

```
P(X ≥ Y) = sum over y from Y to min(N, K) of:
  C(K, y) * C(12-K, N-y) / C(12, N)
```

Where `C(n, k)` is the binomial coefficient "n choose k."

For the recycling-aware version, the math gets more interesting:
- The deck is partitioned into a known "buried" segment (recycled cards, in known order at the bottom) and an unknown "remaining" segment.
- Channels draw from the top of the remaining segment, which has its own hypergeometric distribution over a smaller deck.
- The question becomes "P(seeing Y of color X in N channels from the remaining segment)" — same kind of math, smaller numbers.

We'll show our work in v0.2.

---

## [Rune Odds 0.1.0] — 2026-05-06

### Added
- Initial release. Hypergeometric probability calculator for the 12-card Riftbound rune deck.
- Inputs: number of target color in deck (0–12), turn order (going first / going second).
- Outputs: cumulative probabilities of seeing ≥1, ≥2, ≥3, ≥4 target runes by end of turns 1–6.
- "Copy share text" button for posting odds to Discord, Reddit, etc.
- Mobile-responsive table layout.

### Math model

- Rune deck is exactly 12 cards.
- Pre-game: rune deck is sealed face-down (no opening hand of runes).
- Turn 1 channel: 2 if going first, 3 if going second.
- Each subsequent turn: +2 channels.
- Capped at deck size of 12.

### Known limitation

Does not yet model recycling (see v0.1.1 note above).

---

## Roadmap

Shipped (2026-05-11):
- ~~Rune Odds v0.3 — Card mode + multivariate hypergeom~~
- ~~Site buildout — landing page at root, Rune Odds at `runes.witchtilt.com`, Deck Pastebin at `decks.witchtilt.com`~~
- ~~Deck Pastebin v0.1 — paste a deck, see the mana curve~~

Active queue:
- **Rune Odds v0.4 (in progress, 2026-05-13)** — merge Deck Pastebin into Rune Odds as a third mode. `decks.witchtilt.com` is held back for the future Deck Builder; the standalone pastebin page becomes a coming-soon placeholder. Branch: `runes-unified-tool`.
- **Deck Builder** — separate tool, drag-and-drop card selection + deck validation + integrated Rune Odds inline. Gated on Riot Developer API key approval, then takes over `decks.witchtilt.com`.
- **Pastebin v0.2 (deferred into Rune Odds)** — cost spread derived from the deck's actual card costs, not just rune colors. Requires a name→cost lookup. Lands as a Rune Odds improvement after v0.4, no longer a standalone-tool release.
- **Polish** — edge cases users surface, mobile refinements, og-image generation, social handles once first video lands.

Queued:
- Pack EV / Collection Tracker, Main Deck Probability Calculator, Resolution Order Sequencer, Draft Simulator.

If you spot something wrong with the math or have a feature request, the repo lives at [github.com/alexbmiller/witchtilt-tools](https://github.com/alexbmiller/witchtilt-tools).
