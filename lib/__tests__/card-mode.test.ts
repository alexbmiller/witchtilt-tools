import { describe, it, expect } from 'vitest';
import { probabilityCanCast } from '../card-mode';
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

describe('probabilityCanCast — SPEC §8 mandatory cases', () => {
  // SPEC §8: "Trivial cost (`0`): P = 1 always"
  it('trivial cost "0" → P = 1 on every turn / order / deck', () => {
    const cost = costOf('0');
    for (const turn of [1, 2, 3, 4, 5, 6]) {
      for (const goingFirst of [true, false]) {
        expect(probabilityCanCast(cost, deck({ R: 4, B: 4, G: 4 }), turn, goingFirst)).toBe(1);
        expect(probabilityCanCast(cost, deck({ R: 12 }), turn, goingFirst)).toBe(1);
      }
    }
  });

  // SPEC §8: "Impossible cost (`RRR` when deck has 2 R): P = 0 always"
  it('impossible cost "RRR" against a 2R deck → P = 0 on every turn', () => {
    const cost = costOf('RRR');
    for (const turn of [1, 2, 3, 4, 5, 6]) {
      for (const goingFirst of [true, false]) {
        expect(probabilityCanCast(cost, deck({ R: 2, B: 10 }), turn, goingFirst)).toBe(0);
      }
    }
  });

  // SPEC §8: "Simple cost (`1`, deck = 12R, T1 going first): P = 2/12 ≈ 0.167"
  // Interpretation: cost "R" (1 red, total cost 1) against a deck containing
  // 1 R rune out of 12; T1 going first = 2 channels.
  //   P(>=1 R in 2 draws from N=12, K=1) = 1 - C(11,2)/C(12,2) = 1 - 55/66 = 11/66 = 1/6
  it('simple single-color cost matches the spec\'s 2/12 = 1/6 example', () => {
    const cost = costOf('R');
    const p = probabilityCanCast(cost, deck({ R: 1 }), 1, true);
    expect(Math.abs(p - 1 / 6)).toBeLessThan(EPS);
  });

  // SPEC §8: "Regression (single-color cost equivalent to old v0.2 query):
  //   output matches v0.2 to floating-point precision"
  it('single-color regression battery vs v0.2 hypergeomAtLeast', () => {
    // For each (K, k, turn, goingFirst), the wrapper must produce the same
    // probability as hypergeomAtLeast(K, runesSeen, k) when totalCost <= runesSeen.
    for (const K of [3, 4, 6]) {
      for (const k of [1, 2, 3]) {
        if (k > K) continue;
        const cost = costOf('R'.repeat(k));
        for (const goingFirst of [true, false]) {
          for (const turn of [1, 2, 3, 4, 5]) {
            const channelsSeen = (goingFirst ? 2 : 3) + (turn - 1) * 2;
            const cappedSeen = Math.min(channelsSeen, 12);
            const expected =
              cappedSeen >= cost.totalCost ? hypergeomAtLeast(K, cappedSeen, k) : 0;
            const actual = probabilityCanCast(cost, deck({ R: K }), turn, goingFirst);
            expect(Math.abs(actual - expected)).toBeLessThan(EPS);
          }
        }
      }
    }
  });

  // SPEC §8: "Two-color AND (RB, deck=6R/6B, T1 going first, 2 channels)"
  // Hand-verified in multivariate.test.ts: P = 36/66 = 6/11.
  it('two-color AND "RB" vs 6R/6B, T1 going first → 6/11', () => {
    const cost = costOf('RB');
    const p = probabilityCanCast(cost, deck({ R: 6, B: 6 }), 1, true);
    expect(Math.abs(p - 6 / 11)).toBeLessThan(EPS);
  });

  // SPEC §8: "Edge: cost > deck size (12RR): P = 0 always"
  it('cost > deck size "12RR" → P = 0 on every turn', () => {
    const cost = costOf('12RR');
    expect(cost.totalCost).toBe(14);
    for (const turn of [1, 2, 3, 4, 5, 6]) {
      for (const goingFirst of [true, false]) {
        expect(probabilityCanCast(cost, deck({ R: 6, B: 6 }), turn, goingFirst)).toBe(0);
      }
    }
  });
});

describe('probabilityCanCast — generic mana mechanics', () => {
  it('generic cost only ("3") needs 3 channels: 0 before T2 first-going', () => {
    // T1 going first: 2 channels < 3 totalCost → P = 0
    // T2 going first: 4 channels >= 3 → P = 1 (no color requirement)
    const cost = costOf('3');
    expect(probabilityCanCast(cost, deck({ R: 6, B: 6 }), 1, true)).toBe(0);
    expect(probabilityCanCast(cost, deck({ R: 6, B: 6 }), 2, true)).toBe(1);
  });

  it('"2RR" (total 4) is 0 on T1 going first but nonzero on T2', () => {
    const cost = costOf('2RR');
    expect(probabilityCanCast(cost, deck({ R: 4, B: 4, G: 4 }), 1, true)).toBe(0);
    const t2 = probabilityCanCast(cost, deck({ R: 4, B: 4, G: 4 }), 2, true);
    // multivariate(12, {R:4,B:4,G:4}, 4, {R:2}) = 201/495
    expect(Math.abs(t2 - 201 / 495)).toBeLessThan(EPS);
  });

  it('"2RR" going second crosses threshold one turn earlier', () => {
    // Going second: T1 channels=3 (<4 totalCost), T2 channels=5.
    const cost = costOf('2RR');
    expect(probabilityCanCast(cost, deck({ R: 4, B: 4, G: 4 }), 1, false)).toBe(0);
    expect(probabilityCanCast(cost, deck({ R: 4, B: 4, G: 4 }), 2, false)).toBeGreaterThan(0);
  });
});

describe('probabilityCanCast — sanity smoke test from SPEC §11', () => {
  // "Manual smoke test: cost `2RR` + deck `4R/4B/4G` + going first produces
  //  realistic, non-zero, monotonically-increasing-by-turn probabilities"
  it('2RR vs 4R/4B/4G going first is monotonically non-decreasing', () => {
    const cost = costOf('2RR');
    const composition = deck({ R: 4, B: 4, G: 4 });
    const probs = [1, 2, 3, 4, 5, 6].map((t) =>
      probabilityCanCast(cost, composition, t, true),
    );
    // T1: 0 (can't afford 4-cost yet)
    expect(probs[0]).toBe(0);
    // T2+: increasing
    for (let i = 1; i < probs.length; i++) {
      expect(probs[i]).toBeGreaterThanOrEqual(probs[i - 1] - EPS);
    }
    // T6 should be very high but not necessarily 1 (deck is large).
    expect(probs[5]).toBeGreaterThan(0.9);
  });
});

describe('probabilityCanCast — wired through the parser', () => {
  it('full pipeline: parseCost → probabilityCanCast for "5RGBY"', () => {
    // Total cost 9. T4 going first = 8 channels (still < 9 → 0). T5 = 10 channels.
    const cost = costOf('5RGBY');
    expect(probabilityCanCast(cost, deck({ R: 3, G: 3, B: 3, Y: 3 }), 4, true)).toBe(0);
    expect(
      probabilityCanCast(cost, deck({ R: 3, G: 3, B: 3, Y: 3 }), 5, true),
    ).toBeGreaterThan(0);
  });

  it('higher-domain-count deck satisfies a same-color cost faster', () => {
    // "RR" with deck of 6R is easier than deck of 2R.
    const cost = costOf('RR');
    const easy = probabilityCanCast(cost, deck({ R: 6, B: 6 }), 2, true);
    const hard = probabilityCanCast(cost, deck({ R: 2, B: 10 }), 2, true);
    expect(easy).toBeGreaterThan(hard);
  });
});
