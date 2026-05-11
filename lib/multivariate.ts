/**
 * Multivariate hypergeometric — P(meets all color requirements) when drawing
 * a sample from a multi-colored deck.
 *
 * SPEC §4 model:
 *   Deck size N is partitioned into color groups K_R, K_B, K_P, K_O, K_G, K_Y.
 *   Anything unaccounted for (N - sum(K_c)) is treated as a single "rest" group
 *   — non-required colors AND any uncolored runes collapse together, because
 *   the query only cares about whether required minima are met.
 *
 *   The standard multivariate hypergeometric PMF:
 *     P(X_1=k_1, ..., X_m=k_m) = [Π C(K_i, k_i)] / C(N, n)
 *
 *   We sum this over all valid (k_c) tuples where:
 *     - k_c >= r_c for every required color c
 *     - Σ k_c (over required) + k_rest = n
 *     - 0 <= k_rest <= K_rest
 *
 * Enumeration is bounded by the per-color caps min(K_c, n) and the running
 * sum-cap n. For deck size 12 and <=6 required colors, the search is tiny;
 * no need for closed-form tricks or Monte Carlo.
 */
import { binom } from "./probability";
import { COLORS, type Color } from "./cost-parser";

export function multivariateHypergeom(
  deckSize: number,
  colorCounts: Record<Color, number>,
  sampleSize: number,
  requirements: Partial<Record<Color, number>>,
): number {
  if (deckSize <= 0) return 0;

  // Reject malformed decks (colored runes can't outnumber the deck itself).
  let totalColored = 0;
  for (const c of COLORS) totalColored += colorCounts[c] ?? 0;
  if (totalColored > deckSize) return 0;

  // SPEC §5 case 3: cap effective sample at deck size.
  const n = Math.min(Math.max(0, sampleSize), deckSize);

  // Identify required colors and verify each is achievable in isolation.
  type Req = { req: number; available: number };
  const required: Req[] = [];
  let sumRequired = 0;
  let sumColorsInRequired = 0;
  for (const c of COLORS) {
    const req = requirements[c] ?? 0;
    if (req <= 0) continue;
    const available = colorCounts[c] ?? 0;
    if (req > available) return 0; // SPEC §5 case 2
    required.push({ req, available });
    sumRequired += req;
    sumColorsInRequired += available;
  }

  // SPEC §5 case 4: trivial cost.
  if (required.length === 0) return 1;

  // Can't satisfy if requirements outnumber draws or deck doesn't hold them all.
  if (sumRequired > n) return 0;

  const kRest = deckSize - sumColorsInRequired;
  if (kRest < 0) return 0; // pathological input (colors over-sum the deck)

  const den = binom(deckSize, n);
  if (den === 0n) return 0;

  // Precompute the suffix-sum of minimum required draws so we can prune.
  const futureMin: number[] = new Array(required.length + 1).fill(0);
  for (let i = required.length - 1; i >= 0; i--) {
    futureMin[i] = futureMin[i + 1] + required[i].req;
  }

  let num = 0n;
  function enumerate(idx: number, partialSum: number, productNumer: bigint): void {
    if (idx === required.length) {
      const restDraws = n - partialSum;
      if (restDraws < 0 || restDraws > kRest) return;
      num += productNumer * binom(kRest, restDraws);
      return;
    }
    const { req, available } = required[idx];
    const maxK = Math.min(available, n - partialSum - futureMin[idx + 1]);
    for (let k = req; k <= maxK; k++) {
      enumerate(idx + 1, partialSum + k, productNumer * binom(available, k));
    }
  }
  enumerate(0, 0, 1n);

  return Number(num) / Number(den);
}
