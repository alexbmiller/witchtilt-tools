/**
 * Hypergeometric distribution helpers for Riftbound rune math.
 *
 * Rune deck size is fixed at 12 in Riftbound. We use BigInt for combinatorics
 * to avoid floating point errors on the integer math, then convert to Number
 * only at the final probability division.
 *
 * IMPORTANT MODEL LIMITATION:
 * This module assumes a uniformly-random rune deck — i.e., no recycling has
 * occurred. In Riftbound, recycling places a rune at the EXACT BOTTOM of the
 * deck (no reshuffle), which means the deck has known structure mid-game and
 * the basic hypergeometric model no longer applies after the first recycle.
 *
 * This tool is intended for DECKBUILDING questions ("does my rune split give
 * me what I need?") and is correct under the no-recycling assumption.
 * Recycling-aware odds are a v0.2 feature. See CHANGELOG.md for details.
 */

const DECK_SIZE = 12;

// Memoize binomials for the small range we use (n, k both <= 12).
const binomCache = new Map<string, bigint>();

function binom(n: number, k: number): bigint {
  if (k < 0 || k > n) return 0n;
  if (k === 0 || k === n) return 1n;
  const key = `${n},${k}`;
  const cached = binomCache.get(key);
  if (cached !== undefined) return cached;

  // C(n, k) = C(n, n-k); pick the smaller for fewer multiplications.
  const kk = k > n - k ? n - k : k;
  let num = 1n;
  let den = 1n;
  for (let i = 0; i < kk; i++) {
    num *= BigInt(n - i);
    den *= BigInt(i + 1);
  }
  const result = num / den;
  binomCache.set(key, result);
  return result;
}

/**
 * P(X = x) where X ~ Hypergeometric(N=DECK_SIZE, K=successes, n=draws)
 */
export function hypergeomPmf(successesInDeck: number, draws: number, x: number): number {
  if (x < 0 || x > draws || x > successesInDeck) return 0;
  if (draws - x > DECK_SIZE - successesInDeck) return 0;

  const num = binom(successesInDeck, x) * binom(DECK_SIZE - successesInDeck, draws - x);
  const den = binom(DECK_SIZE, draws);
  // Convert to number at the end. Values fit easily in a double for these sizes.
  return Number(num) / Number(den);
}

/**
 * P(X >= x) — at least x successes drawn.
 */
export function hypergeomAtLeast(successesInDeck: number, draws: number, x: number): number {
  let p = 0;
  const upper = Math.min(draws, successesInDeck);
  for (let i = x; i <= upper; i++) {
    p += hypergeomPmf(successesInDeck, draws, i);
  }
  return p;
}

/**
 * Number of runes seen (cumulative draws from the rune deck) by the end of turn N.
 *
 * Riftbound rules:
 *   - The 12-card rune deck sits face down at the start of the game; no
 *     pre-game draws from it. (The 4-card opening hand is from the main deck,
 *     not the rune deck.)
 *   - Player going first channels 2 runes on turn 1.
 *   - Player going second channels 3 runes on turn 1.
 *   - Every subsequent turn the active player channels 2 more runes.
 *
 * Capped at deck size. Going second, the deck is fully drawn by end of T5
 * (3 + 2 + 2 + 2 + 2 = 11, then T6 would be 13). What happens after the deck
 * is empty (recycle? shuffle?) is an open question and not modeled here.
 */
export function runesSeenByTurn(turn: number, goingFirst: boolean): number {
  if (turn < 1) return 0; // pre-game: rune deck is sealed
  const turnOneChannel = goingFirst ? 2 : 3;
  const raw = turn === 1 ? turnOneChannel : turnOneChannel + (turn - 1) * 2;
  return Math.min(raw, DECK_SIZE);
}

export interface TurnRow {
  turn: number;
  runesSeen: number;
  probabilities: number[]; // index i = P(>= i target runes seen)
}

/**
 * Build a table of probabilities for turns 1..maxTurn, for "at least" thresholds 1..maxThreshold.
 */
export function buildProbabilityTable(
  targetInDeck: number,
  goingFirst: boolean,
  maxTurn: number = 6,
  maxThreshold: number = 4,
): TurnRow[] {
  const rows: TurnRow[] = [];
  for (let turn = 1; turn <= maxTurn; turn++) {
    const runesSeen = Math.min(runesSeenByTurn(turn, goingFirst), DECK_SIZE);
    const probabilities: number[] = [];
    for (let threshold = 1; threshold <= maxThreshold; threshold++) {
      probabilities.push(hypergeomAtLeast(targetInDeck, runesSeen, threshold));
    }
    rows.push({ turn, runesSeen, probabilities });
  }
  return rows;
}

export const DECK_SIZE_CONST = DECK_SIZE;

// ---------------------------------------------------------------------------
// Mid-game: generalized hypergeometric over an arbitrary-sized remaining pile
// ---------------------------------------------------------------------------

/**
 * Generalized hypergeometric PMF where the population size N is not fixed at
 * DECK_SIZE. Used for mid-game queries where we draw only from the remaining
 * unknown segment (not the full deck).
 *
 * P(X = x) where X ~ Hypergeometric(N, K, n)
 *   N = remaining pile size
 *   K = target color in remaining pile
 *   n = draws
 */
function hypergeomPmfN(N: number, K: number, n: number, x: number): number {
  if (N === 0) return x === 0 ? 1 : 0;
  if (x < 0 || x > n || x > K) return 0;
  if (n - x > N - K) return 0;
  const den = binom(N, n);
  if (den === 0n) return 0;
  const num = binom(K, x) * binom(N - K, n - x);
  return Number(num) / Number(den);
}

/** P(X >= threshold) with arbitrary population size. */
function hypergeomAtLeastN(N: number, K: number, n: number, threshold: number): number {
  if (N === 0 || K === 0) return 0;
  let p = 0;
  const upper = Math.min(n, K);
  for (let i = threshold; i <= upper; i++) {
    p += hypergeomPmfN(N, K, n, i);
  }
  return p;
}

export interface MidGameParams {
  /** K: target color runes in the face-down unknown segment (not channeled, not buried). */
  targetInRemaining: number;
  /** N: total runes in the face-down unknown segment. */
  remainingPileSize: number;
  goingFirst: boolean;
  currentTurn: number;
  maxThreshold?: number;
}

export interface MidGameTurnRow {
  turn: number;
  /** Raw cumulative draws from current turn (may exceed remainingPileSize at boundary). */
  draws: number;
  /** min(draws, remainingPileSize) — the count actually passed to hypergeom. */
  effectiveDraws: number;
  /** True when draws would reach into the buried segment — model breaks down here. */
  exceedsBoundary: boolean;
  probabilities: number[];
}

/**
 * Build a table of upcoming-turn probabilities for mid-game mode.
 *
 * The deck partitions into three layers:
 *   1. Channeled — already revealed, count known.
 *   2. Remaining — face-down unknown cards at the top of the unplayed portion.
 *      This is the only layer we draw from in a typical short-horizon query.
 *   3. Buried — recycled runes at the EXACT bottom, known order, unreachable
 *      until the remaining layer is exhausted.
 *
 * We model draws from layer 2 only. Once cumulative draws would exceed
 * remainingPileSize the buried layer becomes reachable; those rows are flagged.
 * The probabilities on flagged rows are still computed (using capped draws) so
 * they serve as a ceiling rather than being blank, but they're not reliable.
 */
export function buildMidGameTable(params: MidGameParams): MidGameTurnRow[] {
  const { targetInRemaining, remainingPileSize, goingFirst, currentTurn, maxThreshold = 4 } = params;
  const channeled = runesSeenByTurn(currentTurn, goingFirst);
  const rows: MidGameTurnRow[] = [];
  let prevRawDraws = -1;

  for (let i = 1; i <= 5; i++) {
    const futureSeen = runesSeenByTurn(currentTurn + i, goingFirst);
    const rawDraws = futureSeen - channeled;
    // Stop once runesSeenByTurn caps out — no new draws, no new rows.
    if (rawDraws === prevRawDraws) break;
    prevRawDraws = rawDraws;

    const exceedsBoundary = rawDraws > remainingPileSize;
    const effectiveDraws = Math.min(rawDraws, remainingPileSize);

    const probabilities: number[] = [];
    for (let threshold = 1; threshold <= maxThreshold; threshold++) {
      probabilities.push(
        hypergeomAtLeastN(remainingPileSize, targetInRemaining, effectiveDraws, threshold),
      );
    }

    rows.push({ turn: currentTurn + i, draws: rawDraws, effectiveDraws, exceedsBoundary, probabilities });
  }

  return rows;
}
