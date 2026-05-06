# Rune Odds — Riftbound Probability Calculator (v0.1)

A small, fast tool for calculating rune draw probabilities in **Riftbound: League of Legends TCG**.

## What it does

- Calculates the probability of drawing at least N runes of a target color by the end of each turn (1–6).
- Accounts for going first (channel 2 on T1) vs going second (channel 3 on T1).
- Shows opening-hand probabilities separately.
- Pure client-side math (hypergeometric distribution). No backend, no tracking.

## Stack

- Next.js 14 + TypeScript
- Tailwind CSS
- Deploys to Vercel for free in ~60 seconds

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Deploy

```bash
# from the project root, after creating a GitHub repo
git init
git add .
git commit -m "v0.1"
git remote add origin <your-repo-url>
git push -u origin main
```

Then go to vercel.com → Import Project → pick the repo → Deploy. That's it.

## Roadmap

- v0.2: Mulligan logic (recycle up to 2, draw from top without reshuffle)
- v0.3: Multi-color queries ("P(≥1 Red AND ≥1 Blue by T2)")
- v0.4: Domain requirements for specific cards (e.g. "P(I can cast a 2RR card on T4)")

## Math notes

The rune deck is exactly 12 cards. Drawing without replacement → hypergeometric distribution.

For target K of color in deck of size N=12, drawing n cards, probability of exactly x successes:

```
P(X = x) = C(K, x) * C(N-K, n-x) / C(N, n)
```

Implemented with BigInt combinatorics to avoid floating-point error on the integer math.

Runes seen by end of turn T (the rune deck is sealed pre-game; channeling starts on T1):

- Going first: 2 (T1) + 2*(T-1) for T ≥ 2
- Going second: 3 (T1) + 2*(T-1) for T ≥ 2

The 4-card opening hand in Riftbound is drawn from the **main deck**, not the rune deck.
A separate main-deck calculator is on the roadmap.

## License

MIT, do whatever.
