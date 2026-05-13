# witchtilt-tools

Source for **WitchTilt**, a small set of tools for the **Riftbound: League of Legends TCG** (and eventually other card games). Live at **https://www.witchtilt.com**.

> **Working on this repo?** Read [`CLAUDE.md`](./CLAUDE.md) first — current architecture, math model, and locked rules. [`CHANGELOG.md`](./CHANGELOG.md) has shipped releases.

## What's here

- **Rune Odds** (live at [runes.witchtilt.com](https://runes.witchtilt.com)) — hypergeometric probability calculator for the 12-card Riftbound rune deck. Two modes:
  - **Card mode**: type a card cost like `2RR`, see your odds of paying it by turn N. Multivariate hypergeometric over your deck's color split.
  - **Rune mode**: simpler "≥k of one color by turn N" queries. Useful for deckbuilding intuition about a single color.
  - Each mode has **Deckbuilding** (fresh deck) and **Mid-game** (recycling-aware) sub-modes.
- **Deck Pastebin** (live at [decks.witchtilt.com](https://decks.witchtilt.com)) — paste a Riftbound decklist; the tool extracts the rune pool and renders the probability of casting representative costs by turn. Being folded into Rune Odds as a third mode (in progress).
- More tools queued — Deck Builder (gated on Riot Developer API key), Pack EV, Resolution Order Sequencer, Draft Simulator. See [`CLAUDE.md`](./CLAUDE.md) for the roadmap.

## Stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS
- Vitest for the math layer (105 tests as of Deck Pastebin v0.1)
- Deployed on Vercel, auto-deploys on push to `main`

## Run locally

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # one-shot vitest
```

Other scripts: `npm run build`, `npm run start`, `npm run lint`, `npm run test:watch`.

## Math model

The rune deck is exactly 12 cards, sealed pre-game. Drawing without replacement → hypergeometric distribution. Implemented with BigInt combinatorics in `lib/probability.ts` to avoid floating-point error on integer math.

**Channels per turn**:
- Going first: 2 (T1), then +2 each turn (T2: 4, T3: 6, ...).
- Going second: 3 (T1), then +2 each turn (T2: 5, T3: 7, ...).

The 4-card opening hand in Riftbound is drawn from the **main deck**, not the rune deck.

**Rune mode (univariate)** — for a target color with K runes in a deck of size N, after channeling n:

```
P(X ≥ k) = sum over y from k to min(n, K) of:
  C(K, y) * C(N-K, n-y) / C(N, n)
```

**Card mode (multivariate)** — for a parsed cost over a partitioned deck, sum the multivariate PMF over every hand satisfying the per-color minima:

```
P(X_1=k_1, ..., X_m=k_m) = [Π C(K_i, k_i)] / C(N, n)
```

Generic mana is handled at the wrapper layer as a hand-size check; non-required colors collapse into a single "rest" group for efficiency.

**Mid-game mode** samples from the unknown pile only. Already-channeled runes are excluded from the sample. Recycled runes go to the exact bottom of the deck and are unreachable until everything above them has been channeled — rows where draws would reach the buried segment are flagged ⚠. See [`docs/SPEC_v0.3.md`](./docs/SPEC_v0.3.md) for the full model and [`CHANGELOG.md`](./CHANGELOG.md) for the conceptual writeup.

## License

This project is released under the [MIT License](LICENSE).

You're free to use, copy, modify, and distribute this code, including for
commercial purposes. The only requirement is to preserve the copyright
notice and license text. There's no warranty — use at your own risk.

The **WitchTilt** name, logo, and brand identity are not part of this
license and remain the property of the author.
