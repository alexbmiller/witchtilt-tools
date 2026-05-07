# Changelog

All notable changes to Rune Odds will be documented here. The goal is to be honest about what changed, what we got wrong, and why the math is what it is.

---

## [0.2.0] — 2026-05-06

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

## [0.1.1] — 2026-05-06

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

## [0.1.0] — 2026-05-06

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

- **v0.3** — multi-color queries. "What are my odds of having ≥1 Red AND ≥1 Blue by turn 2?"
- **v0.4** — domain requirements for specific cards (e.g., "P(I can cast a 2RR card on T4)").

If you spot something wrong with the math or have a feature request, the repo lives at [github.com/alexbmiller/riftbound-runes](https://github.com/alexbmiller/riftbound-runes).
