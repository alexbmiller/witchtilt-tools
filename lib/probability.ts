/**
 * Hypergeometric distribution helpers for Riftbound rune math.
 *
 * Rune deck size is fixed at 12 in Riftbound. We use BigInt for combinatorics
 * to avoid floating point errors on the integer math, then convert to Number
 * only at the final probability division.
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
