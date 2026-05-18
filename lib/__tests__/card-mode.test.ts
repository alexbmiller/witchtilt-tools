/**
 * SPEC v0.4 cost-model tests for probabilityCanCast and probabilityCanCastMidGame.
 *
 * v0.4 corrected rule: castable iff (channels ≥ Energy) AND
 * (channels[c] ≥ req[c] for every color c). Power pips are NOT added to the
 * Energy total — they are checked against the same pool independently, because
 * a single rune can be exhausted for Energy AND recycled for Power.
 *
 * Hand-computation deck for §3 worked checks: 4R / 4B / 4G (N=12).
 * Cumulative channels by turn:
 *   Going first:  T1=2, T2=4, T3=6, T4=8, T5=10, T6=12
 *   Going second: T1=3, T2=5, T3=7, T4=9, T5=11, T6=12
 */
import { describe, it, expect } from 'vitest';
import { probabilityCanCast, probabilityCanCastMidGame } from '../card-mode';
import { parseCost, type Color } from '../cost-parser';
import { hypergeomAtLeast } from '../probability';

const ZERO: Record<Color, number> = { R: 0, B: 0, P: 0, O: 0, G: 0, Y: 0 };
function deck(parts: Partial<Record<Color, number>>): Record<Color, number> {
  return { ...ZERO, ...parts };
}

function costOf(input: string) {
  const r = parseCost(input);
  if (!r.ok) throw new Error(`parser rejected "${input}": ${r.error}`);
  return r.cost;
}

const EPS = 1e-12;
const D444 = deck({ R: 4, B: 4, G: 4 }); // canonical hand-verification deck

// ---------------------------------------------------------------------------
// SPEC v0.4 §3 — hand-verification battery (Croupier hand-checks before merge)
// ---------------------------------------------------------------------------

describe('SPEC v0.4 §3 — 4RR (E=4, R:2) vs 4R/4B/4G going first', () => {
  // §3: castable iff total ≥ 4 AND red ≥ 2. v0.3 wrongly required 6.
  const cost = costOf('4RR');

  it('T1 (n=2): unaffordable — energy gate fails (2 < 4)', () => {
    // v0.3 and v0.4 agree at 0 here (v0.3 needed 6, v0.4 needs 4 — both fail at n=2).
    expect(probabilityCanCast(cost, D444, 1, true)).toBe(0);
  });

  it('T2 (n=4): energy gate passes; P(R≥2 in 4 draws) = 201/495', () => {
    // C(4,2)C(8,2) + C(4,3)C(8,1) + C(4,4)C(8,0) = 168+32+1 = 201; C(12,4)=495.
    // v0.3 wrongly returned 0 here (4 < required 6). v0.4 returns 201/495 ≈ 0.4061.
    const p = probabilityCanCast(cost, D444, 2, true);
    expect(Math.abs(p - 201 / 495)).toBeLessThan(EPS);
  });

  it('T3 (n=6): P(R≥2 in 6 draws) = 672/924 = 8/11', () => {
    // 420+224+28 = 672; C(12,6)=924. Both v0.3 and v0.4 agree from T3 onward.
    const p = probabilityCanCast(cost, D444, 3, true);
    expect(Math.abs(p - 8 / 11)).toBeLessThan(EPS);
  });
});

describe('SPEC v0.4 §3 — 1RR (E=1, R:2) vs 4R/4B/4G going first', () => {
  // §3: castable iff total ≥ 1 AND red ≥ 2. Binding constraint is red ≥ 2 →
  // minimum 2 runes, both Red. v0.3 wrongly required 3.
  const cost = costOf('1RR');

  it('T1 (n=2): energy trivially met; P(R≥2 in 2 draws) = 6/66 = 1/11', () => {
    // C(4,2)/C(12,2) = 6/66. v0.3 wrongly returned 0 (2 < required 3). v0.4 ≈ 0.0909.
    const p = probabilityCanCast(cost, D444, 1, true);
    expect(Math.abs(p - 1 / 11)).toBeLessThan(EPS);
  });

  it('T2 (n=4): matches the 2RR T2 number (same color requirement, same sample)', () => {
    // R:2 in 4 draws regardless of whether energy is 1 or 2 (both ≤ 4). v0.3 also = 201/495.
    const p = probabilityCanCast(cost, D444, 2, true);
    expect(Math.abs(p - 201 / 495)).toBeLessThan(EPS);
  });
});

describe('SPEC v0.4 §3 — 3RB (E=3, R:1, B:1) vs 4R/4B/4G going first', () => {
  // §3: castable iff total ≥ 3 AND red ≥ 1 AND blue ≥ 1. v0.3 wrongly required 5.
  const cost = costOf('3RB');

  it('T1 (n=2): unaffordable — energy gate fails (2 < 3)', () => {
    expect(probabilityCanCast(cost, D444, 1, true)).toBe(0);
  });

  it('T2 (n=4): P(R≥1 ∧ B≥1 in 4 draws) = 356/495', () => {
    // Enumerated over (kR, kB, kG):
    //   (1,1,2): 4·4·6 = 96
    //   (1,2,1): 4·6·4 = 96
    //   (1,3,0): 4·4·1 = 16
    //   (2,1,1): 6·4·4 = 96
    //   (2,2,0): 6·6·1 = 36
    //   (3,1,0): 4·4·1 = 16
    //   Total = 356; C(12,4) = 495.
    // v0.3 wrongly returned 0 here (4 < required 5). v0.4 ≈ 0.7192.
    const p = probabilityCanCast(cost, D444, 2, true);
    expect(Math.abs(p - 356 / 495)).toBeLessThan(EPS);
  });

  it('T3 (n=6): P(R≥1 ∧ B≥1 in 6 draws) = 868/924 = 31/33', () => {
    // 1 - P(R=0) - P(B=0) + 0 = 1 - 28/924 - 28/924 = 868/924.
    // Both v0.3 and v0.4 agree from T3 onward.
    const p = probabilityCanCast(cost, D444, 3, true);
    expect(Math.abs(p - 31 / 33)).toBeLessThan(EPS);
  });
});

describe('SPEC v0.4 §3 — 1RB (E=1, R:1, B:1) vs 4R/4B/4G going first', () => {
  // §3: minimum 2 runes (1R 1B); energy auto-covered. v0.3 wrongly required 3.
  const cost = costOf('1RB');

  it('T1 (n=2): P(R≥1 ∧ B≥1 in 2 draws) = 16/66 = 8/33', () => {
    // Only valid composition (1,1): C(4,1)·C(4,1)/C(12,2) = 16/66.
    // v0.3 wrongly returned 0 (2 < required 3). v0.4 ≈ 0.2424.
    const p = probabilityCanCast(cost, D444, 1, true);
    expect(Math.abs(p - 8 / 33)).toBeLessThan(EPS);
  });
});

// ---------------------------------------------------------------------------
// SPEC v0.4 §3 — additional worked checks (Energy-only, trivial)
// ---------------------------------------------------------------------------

describe('SPEC v0.4 §3 — pure-Energy costs (UNCHANGED from v0.3)', () => {
  // §3: pure-energy costs were always computed correctly. These tests pin
  // the regression: their outputs must match v0.3 numbers exactly.

  it('"2" (E=2) is 1 whenever channels ≥ 2', () => {
    const cost = costOf('2');
    // T1 first: 2 channels = 2 ≥ 2 → 1
    // T1 second: 3 channels ≥ 2 → 1
    expect(probabilityCanCast(cost, D444, 1, true)).toBe(1);
    expect(probabilityCanCast(cost, D444, 1, false)).toBe(1);
  });

  it('"3" needs 3 channels: 0 on T1 first, 1 from T2 first onward', () => {
    const cost = costOf('3');
    expect(probabilityCanCast(cost, D444, 1, true)).toBe(0); // 2 < 3
    expect(probabilityCanCast(cost, D444, 2, true)).toBe(1); // 4 ≥ 3, no color req
    expect(probabilityCanCast(cost, D444, 1, false)).toBe(1); // 3 ≥ 3
  });

  it('"5" needs 5 channels: 0 on T1/T2 first, 1 from T3 first onward', () => {
    const cost = costOf('5');
    expect(probabilityCanCast(cost, D444, 1, true)).toBe(0); // 2 < 5
    expect(probabilityCanCast(cost, D444, 2, true)).toBe(0); // 4 < 5
    expect(probabilityCanCast(cost, D444, 3, true)).toBe(1); // 6 ≥ 5
    expect(probabilityCanCast(cost, D444, 2, false)).toBe(1); // 5 ≥ 5
  });

  it('"0" trivially castable on every turn / order / composition', () => {
    const cost = costOf('0');
    for (const turn of [1, 2, 3, 4, 5, 6]) {
      for (const goingFirst of [true, false]) {
        expect(probabilityCanCast(cost, D444, turn, goingFirst)).toBe(1);
        expect(probabilityCanCast(cost, deck({ R: 12 }), turn, goingFirst)).toBe(1);
      }
    }
  });
});

describe('SPEC v0.4 §3 — pure-Power costs (E=0; coincidentally correct in v0.3)', () => {
  // §3: pure-color costs were also computed correctly in v0.3 (the additive
  // bug had no effect when generic was 0 because totalCost = sum(color pips)
  // is exactly what the per-color minima already enforce). v0.4 makes it
  // principled; numbers are unchanged.

  it('"RR" vs 4R/4B/4G going first matches multivariate', () => {
    // T1 first (n=2): P(R≥2 in 2 draws) = C(4,2)/C(12,2) = 6/66 = 1/11.
    expect(probabilityCanCast(costOf('RR'), D444, 1, true)).toBeCloseTo(1 / 11, 12);
    // T2 first (n=4): 201/495.
    expect(probabilityCanCast(costOf('RR'), D444, 2, true)).toBeCloseTo(201 / 495, 12);
  });

  it('"RB" vs 6R/6B going first → 6/11 on T1', () => {
    // Only valid composition (1R,1B): C(6,1)·C(6,1)/C(12,2) = 36/66 = 6/11.
    const p = probabilityCanCast(costOf('RB'), deck({ R: 6, B: 6 }), 1, true);
    expect(Math.abs(p - 6 / 11)).toBeLessThan(EPS);
  });

  it('"RRR" against a 2R deck → 0 on every turn (impossible)', () => {
    const cost = costOf('RRR');
    for (const turn of [1, 2, 3, 4, 5, 6]) {
      expect(probabilityCanCast(cost, deck({ R: 2, B: 10 }), turn, true)).toBe(0);
    }
  });

  it('"R" with 1R/11B deck on T1 first matches the spec example (2/12 = 1/6)', () => {
    // 1 - C(11,2)/C(12,2) = 1 - 55/66 = 11/66 = 1/6.
    const p = probabilityCanCast(costOf('R'), deck({ R: 1, B: 11 }), 1, true);
    expect(Math.abs(p - 1 / 6)).toBeLessThan(EPS);
  });
});

// ---------------------------------------------------------------------------
// 2RR — the canonical video example. Old-vs-new explicitly tabulated.
// ---------------------------------------------------------------------------

describe('SPEC v0.4 §5 — 2RR vs 4R/4B/4G canonical example, old vs new', () => {
  /*
   * Old-vs-new probability table for `2RR` on 4R / 4B / 4G:
   *
   *   Going first
   *   Turn   Channels   v0.3 (BUG)   v0.4 (CORRECT)   Δ
   *   T1     2          0            6/66   = 0.0909   +0.0909
   *   T2     4          201/495      201/495 = 0.4061  ±0
   *   T3     6          672/924      672/924 = 0.7273  ±0
   *   T4     8          462/495      462/495 = 0.9333  ±0
   *   T5     10         1            1                 ±0
   *   T6     12         1            1                 ±0
   *
   *   Going second
   *   Turn   Channels   v0.3 (BUG)   v0.4 (CORRECT)   Δ
   *   T1     3          0            52/220 = 0.2364   +0.2364
   *   T2     5          456/792      456/792 = 0.5758  ±0
   *   T3     7          ...          ...               ±0
   *
   * v0.3 wrongly reported P=0 on T1 for both turn orders because its model
   * required 4 channels (2 generic + 2 red pips summed). v0.4 returns the
   * multivariate P(R≥2) at n=2 / n=3. T2 onward, both gates pass — the
   * numbers agree because the engine is unchanged.
   *
   * Note: the 19/33 ≈ 0.5758 hero stat (T2 going second) is UNAFFECTED by
   * the fix because that point lies past where both gates open.
   */
  const cost = costOf('2RR');

  it('T1 going first changes from 0 (v0.3) to 1/11 (v0.4)', () => {
    expect(Math.abs(probabilityCanCast(cost, D444, 1, true) - 1 / 11)).toBeLessThan(EPS);
  });

  it('T2 going first is unchanged at 201/495', () => {
    expect(Math.abs(probabilityCanCast(cost, D444, 2, true) - 201 / 495)).toBeLessThan(EPS);
  });

  it('T1 going second changes from 0 (v0.3) to 52/220 = 13/55 (v0.4)', () => {
    expect(Math.abs(probabilityCanCast(cost, D444, 1, false) - 13 / 55)).toBeLessThan(EPS);
  });

  it('T2 going second is unchanged at 456/792 = 19/33 ≈ 0.5758 (hero-stat regression)', () => {
    expect(Math.abs(probabilityCanCast(cost, D444, 2, false) - 19 / 33)).toBeLessThan(EPS);
  });

  it('curve going first is monotonically non-decreasing', () => {
    const probs = [1, 2, 3, 4, 5, 6].map((t) => probabilityCanCast(cost, D444, t, true));
    for (let i = 1; i < probs.length; i++) {
      expect(probs[i]).toBeGreaterThanOrEqual(probs[i - 1] - EPS);
    }
    expect(probs[0]).toBeGreaterThan(0); // v0.4 — T1 is no longer 0
    expect(probs[5]).toBeGreaterThan(0.9);
  });
});

// ---------------------------------------------------------------------------
// Regression vs v0.2 univariate — pure-color costs must still match
// ---------------------------------------------------------------------------

describe('regression — pure-color costs match v0.2 univariate exactly', () => {
  it('single-color k in {1..3} against v0.2 hypergeomAtLeast', () => {
    for (const K of [3, 4, 6]) {
      for (const k of [1, 2, 3]) {
        if (k > K) continue;
        const cost = costOf('R'.repeat(k));
        for (const goingFirst of [true, false]) {
          for (const turn of [1, 2, 3, 4, 5]) {
            const channelsSeen = (goingFirst ? 2 : 3) + (turn - 1) * 2;
            const cappedSeen = Math.min(channelsSeen, 12);
            // Pure-color costs have energy=0, so the energy gate is trivially open.
            // multivariate(K, n, k) = hypergeomAtLeast(K, n, k) for single-color.
            const expected = hypergeomAtLeast(K, cappedSeen, k);
            const actual = probabilityCanCast(cost, deck({ R: K }), turn, goingFirst);
            expect(Math.abs(actual - expected)).toBeLessThan(EPS);
          }
        }
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe('probabilityCanCast — edge cases', () => {
  it('cost demanding more of a color than the deck holds → 0 on every turn', () => {
    const cost = costOf('RRR'); // R:3
    for (const turn of [1, 2, 3, 4, 5, 6]) {
      expect(probabilityCanCast(cost, deck({ R: 2, B: 10 }), turn, true)).toBe(0);
    }
  });

  it('huge energy ("12R") needs full deck and a Red: 0 until T6 first / T5 second', () => {
    const cost = costOf('12R');
    // T5 first = 10 channels < 12 energy → 0; T6 first = 12 ≥ 12 → multivariate.
    expect(probabilityCanCast(cost, deck({ R: 12 }), 5, true)).toBe(0);
    expect(probabilityCanCast(cost, deck({ R: 12 }), 6, true)).toBe(1);
    // Note: v0.3 would have demanded 13 channels (12+1) and returned 0 on every turn.
    // v0.4 correctly returns 1 on T6 once the full deck is channeled.
  });
});

// ---------------------------------------------------------------------------
// Deck-mode integration — mana-curve-table calls probabilityCanCast directly
// ---------------------------------------------------------------------------

describe('Deck-mode integration — corrected mapping flows through the mana curve', () => {
  // mana-curve-table.tsx does: parseCost(spreadRow) → probabilityCanCast(...)
  // This block exercises that exact pipeline on a spread row that v0.3 got
  // wrong (any Power-bearing row at the early-turn threshold).

  it('"2R" on 4R/4B/4G going first: T1 changes from 0 (v0.3) to 19/33 (v0.4)', () => {
    // E=2, R:1. T1 first (n=2): energy gate 2 ≥ 2 ✓.
    // P(R≥1 in 2 draws from 4R+8other) = 1 - C(8,2)/C(12,2) = 1 - 28/66 = 38/66 = 19/33.
    // v0.3 needed totalCost=3 channels and returned 0.
    const cost = costOf('2R');
    const p = probabilityCanCast(cost, D444, 1, true);
    expect(Math.abs(p - 19 / 33)).toBeLessThan(EPS);
  });

  it('"2R" T2 first is unchanged at 85/99 (regression check)', () => {
    // 1 - C(8,4)/C(12,4) = 1 - 70/495 = 425/495 = 85/99. Both models agree.
    const cost = costOf('2R');
    const p = probabilityCanCast(cost, D444, 2, true);
    expect(Math.abs(p - 85 / 99)).toBeLessThan(EPS);
  });
});

// ---------------------------------------------------------------------------
// Mid-game wrapper — corrected mapping flows through
// ---------------------------------------------------------------------------

describe('probabilityCanCastMidGame — SPEC v0.4 §3 flows through mid-game', () => {
  it('1RB cost, full 12-card deck as pile, currentTurn=0 = deckbuilding', () => {
    // With currentTurn=0 and pile=full deck, mid-game must equal deckbuilding.
    const cost = costOf('1RB');
    for (const goingFirst of [true, false]) {
      for (const queryTurn of [1, 2, 3, 4]) {
        const a = probabilityCanCast(cost, D444, queryTurn, goingFirst);
        const b = probabilityCanCastMidGame(cost, D444, 0, queryTurn, goingFirst);
        expect(Math.abs(a - b)).toBeLessThan(EPS);
      }
    }
  });

  it('1RB cost, 2R/2B/2G pile, T0→T1 first: v0.4 = 4/15, v0.3 wrongly = 0', () => {
    // newDraws = 2. Energy: cumulative 2 ≥ 1 ✓ (v0.4) — v0.3 needed cumulative 3.
    // multivariate(6, {R:2,B:2,G:2}, 2, {R:1,B:1}) = C(2,1)·C(2,1)/C(6,2) = 4/15.
    const cost = costOf('1RB');
    const p = probabilityCanCastMidGame(cost, deck({ R: 2, B: 2, G: 2 }), 0, 1, true);
    expect(Math.abs(p - 4 / 15)).toBeLessThan(EPS);
  });

  it('queryTurn ≤ currentTurn → 0 for non-trivial cost', () => {
    const cost = costOf('R');
    expect(probabilityCanCastMidGame(cost, deck({ R: 4 }), 3, 3, true)).toBe(0);
    expect(probabilityCanCastMidGame(cost, deck({ R: 4 }), 3, 2, true)).toBe(0);
  });

  it('empty pile + non-trivial color cost → 0', () => {
    expect(probabilityCanCastMidGame(costOf('R'), deck({}), 1, 3, true)).toBe(0);
  });

  it('pile missing required color → 0', () => {
    expect(probabilityCanCastMidGame(costOf('R'), deck({ B: 6 }), 1, 3, true)).toBe(0);
  });

  it('trivial cost "0" → 1 regardless of pile / turn', () => {
    expect(probabilityCanCastMidGame(costOf('0'), deck({ R: 6 }), 1, 3, true)).toBe(1);
    expect(probabilityCanCastMidGame(costOf('0'), deck({}), 5, 6, false)).toBe(1);
  });
});
