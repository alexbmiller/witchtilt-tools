import { describe, it, expect } from 'vitest';
import { multivariateHypergeom } from '../multivariate';
import { hypergeomAtLeast } from '../probability';
import type { Color } from '../cost-parser';

const ZERO: Record<Color, number> = { R: 0, B: 0, P: 0, O: 0, G: 0, Y: 0 };
function deck(parts: Partial<Record<Color, number>>): Record<Color, number> {
  return { ...ZERO, ...parts };
}

const EPS = 1e-12;

describe('multivariateHypergeom — SPEC §5 edge cases', () => {
  it('trivial cost (no requirements) → P = 1', () => {
    expect(multivariateHypergeom(12, deck({ R: 6, B: 6 }), 4, {})).toBe(1);
  });

  it('zero-only requirements → P = 1', () => {
    expect(multivariateHypergeom(12, deck({ R: 6, B: 6 }), 4, { R: 0, B: 0 })).toBe(1);
  });

  it('requirement exceeds color in deck → P = 0', () => {
    expect(multivariateHypergeom(12, deck({ R: 2, B: 10 }), 12, { R: 3 })).toBe(0);
  });

  it('color absent from deck → P = 0', () => {
    expect(multivariateHypergeom(12, deck({ B: 12 }), 12, { R: 1 })).toBe(0);
  });

  it('requirements sum > sample size → P = 0', () => {
    expect(multivariateHypergeom(12, deck({ R: 6, B: 6 }), 2, { R: 2, B: 2 })).toBe(0);
  });

  it('sample >= deck size: full sample reveals everything', () => {
    expect(multivariateHypergeom(12, deck({ R: 6, B: 6 }), 14, { R: 1, B: 1 })).toBe(1);
  });

  it('zero sample with nonzero requirement → P = 0', () => {
    expect(multivariateHypergeom(12, deck({ R: 6, B: 6 }), 0, { R: 1 })).toBe(0);
  });
});

describe('multivariateHypergeom — SPEC §8 mandatory cases', () => {
  // Single-color regression: must match v0.2 univariate hypergeomAtLeast.
  it('single-color cost matches v0.2 univariate (R≥2 of 4R in 4 draws from 12)', () => {
    const v03 = multivariateHypergeom(12, deck({ R: 4 }), 4, { R: 2 });
    const v02 = hypergeomAtLeast(4, 4, 2);
    expect(Math.abs(v03 - v02)).toBeLessThan(EPS);
  });

  it('regression battery: every single-color k in {1..3} against v0.2', () => {
    for (const K of [3, 4, 6]) {
      for (const n of [2, 4, 6]) {
        for (const k of [1, 2, 3]) {
          const v03 = multivariateHypergeom(12, deck({ R: K }), n, { R: k });
          const v02 = hypergeomAtLeast(K, n, k);
          expect(Math.abs(v03 - v02)).toBeLessThan(EPS);
        }
      }
    }
  });

  // SPEC §8: "Two-color AND (RB, deck=6R/6B, T1 going first, 2 channels)"
  // Only valid hand composition is (R=1, B=1).
  //   P = C(6,1)·C(6,1) / C(12,2) = 36/66 = 6/11
  it('two-color AND (R≥1 ∧ B≥1, deck=6R/6B, 2 draws)', () => {
    const p = multivariateHypergeom(12, deck({ R: 6, B: 6 }), 2, { R: 1, B: 1 });
    expect(Math.abs(p - 36 / 66)).toBeLessThan(EPS);
  });

  it('cost > deck size always impossible (12RR-equivalent)', () => {
    expect(multivariateHypergeom(12, deck({ R: 6, B: 6 }), 12, { R: 13 })).toBe(0);
  });
});

describe('multivariateHypergeom — hand-verified multivariate cases', () => {
  // RR in 4R 4B 4G deck, sample 4.
  // P(k_R >= 2, sum_other = 4 - k_R)
  //   k_R=2: C(4,2)·C(8,2) = 6·28 = 168
  //   k_R=3: C(4,3)·C(8,1) = 4·8  = 32
  //   k_R=4: C(4,4)·C(8,0) = 1·1  = 1
  // Total = 201 / C(12,4) = 201/495.
  it('R≥2 from 4R 4B 4G in 4 draws → 201/495', () => {
    const p = multivariateHypergeom(12, deck({ R: 4, B: 4, G: 4 }), 4, { R: 2 });
    expect(Math.abs(p - 201 / 495)).toBeLessThan(EPS);
  });

  // 2RR cost vs deck 4R 4B 4G with 4 channels (T2 going first):
  // requirement is R>=2; the "2 Energy" is satisfied automatically once sample >= totalCost.
  // For the math layer, only color requirements matter here — same as previous case.
  it('R≥2 result is independent of Energy (math layer concern)', () => {
    // Math layer just answers "given sample, do colors meet requirements?".
    // Energy is the wrapper's job (step 3).
    expect(multivariateHypergeom(12, deck({ R: 4, B: 4, G: 4 }), 4, { R: 2 })).toBeCloseTo(
      201 / 495,
      12,
    );
  });

  // 1R1B from 4R 4B 4G in 3 draws:
  // Need k_R >= 1, k_B >= 1, k_R + k_B + k_other = 3.
  // Enumerate (k_R, k_B):
  //   (1,1) k_other=1: 4·4·4 = 64
  //   (1,2) k_other=0: 4·6·1 = 24
  //   (2,1) k_other=0: 6·4·1 = 24
  //   (2,2) sum=4 > 3, skip
  //   (1,3) k_other=-1, skip
  //   (3,1) k_other=-1, skip
  //   (3,0) requires k_B>=1, skip (B<1)
  // Total = 112 / C(12,3) = 112/220 = 28/55
  it('R≥1 ∧ B≥1 from 4R 4B 4G in 3 draws → 112/220', () => {
    const p = multivariateHypergeom(12, deck({ R: 4, B: 4, G: 4 }), 3, { R: 1, B: 1 });
    expect(Math.abs(p - 112 / 220)).toBeLessThan(EPS);
  });

  // Same RB requirement on a mono-color deck (all R, all B): impossible.
  it('R≥1 ∧ B≥1 from 12R deck → 0', () => {
    expect(multivariateHypergeom(12, deck({ R: 12 }), 6, { R: 1, B: 1 })).toBe(0);
  });

  // Smaller pile (mid-game style): same math with deckSize != 12.
  it('R≥1 from a 6-card pile of 2R 4other in 2 draws', () => {
    // P(>=1 R) = 1 - C(4,2)/C(6,2) = 1 - 6/15 = 9/15 = 0.6
    const p = multivariateHypergeom(6, deck({ R: 2 }), 2, { R: 1 });
    expect(Math.abs(p - 0.6)).toBeLessThan(EPS);
  });
});

describe('multivariateHypergeom — input robustness', () => {
  it('clamps negative sample size to 0 (and returns 0 if any req > 0)', () => {
    expect(multivariateHypergeom(12, deck({ R: 6 }), -1, { R: 1 })).toBe(0);
  });

  it('clamps sample beyond deck size', () => {
    // Drawing 20 from 12: equivalent to sampling all 12.
    const p = multivariateHypergeom(12, deck({ R: 6, B: 6 }), 20, { R: 6, B: 6 });
    expect(p).toBe(1);
  });

  it('over-sum deck input (colors > deckSize) returns 0 safely', () => {
    // Pathological: colors sum to 14 but deckSize is 12.
    expect(multivariateHypergeom(12, deck({ R: 7, B: 7 }), 4, { R: 2 })).toBe(0);
  });

  it('handles all six colors required simultaneously', () => {
    // Deck has 2 of each color (12 total). Need 1 of each. Sample = 6.
    // Only valid composition: (1,1,1,1,1,1).
    // P = [C(2,1)^6] / C(12,6) = 64 / 924
    const p = multivariateHypergeom(
      12,
      { R: 2, B: 2, P: 2, O: 2, G: 2, Y: 2 },
      6,
      { R: 1, B: 1, P: 1, O: 1, G: 1, Y: 1 },
    );
    expect(Math.abs(p - 64 / 924)).toBeLessThan(EPS);
  });
});
