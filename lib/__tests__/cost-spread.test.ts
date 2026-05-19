import { describe, expect, it } from 'vitest';
import { generateCostSpread, type RuneCounts } from '../cost-spread';

function runes(partial: Partial<RuneCounts>): RuneCounts {
  return { R: 0, B: 0, P: 0, O: 0, G: 0, Y: 0, ...partial };
}

describe('generateCostSpread', () => {
  it('returns pure-Energy rows when the rune pool is empty', () => {
    expect(generateCostSpread(runes({}))).toEqual(['1', '2', '3']);
  });

  it('mono-color: 6 rows = 3 pure-Energy + CC, 1C, 2C', () => {
    expect(generateCostSpread(runes({ Y: 12 }))).toEqual([
      '1', '2', '3',
      'YY', '1Y', '2Y',
    ]);
  });

  it('mono-color works regardless of which color is present', () => {
    expect(generateCostSpread(runes({ R: 12 }))).toEqual([
      '1', '2', '3',
      'RR', '1R', '2R',
    ]);
  });

  it('two-color: 12 rows with primary first, secondary second', () => {
    // 7 Mind (B) + 5 Order (Y) → primary B, secondary Y
    expect(generateCostSpread(runes({ B: 7, Y: 5 }))).toEqual([
      '1', '2', '3',
      'BB', '1B', '2B',
      'YY', '1Y', '2Y',
      'BY', '1BY', '2BB',
    ]);
  });

  it('two-color: primary is the more-represented color', () => {
    // Order them so that Y(5) < B(7) — Y appears alphabetically before B in some
    // sort orders, but our sort is count-descending, so B must be primary.
    const result = generateCostSpread(runes({ B: 7, Y: 5 }));
    expect(result[3]).toBe('BB');     // primary doubled
    expect(result[6]).toBe('YY');     // secondary doubled
    expect(result[9]).toBe('BY');     // mixed
    expect(result[11]).toBe('2BB');   // energy-into-primary-doubled
  });

  it('breaks ties on count by canonical RBPOGY order', () => {
    // 6/6 split. R and B tied at 6. R wins by canonical order.
    expect(generateCostSpread(runes({ R: 6, B: 6 }))).toEqual([
      '1', '2', '3',
      'RR', '1R', '2R',
      'BB', '1B', '2B',
      'RB', '1RB', '2RR',
    ]);
  });

  it('breaks ties on count by canonical RBPOGY order (reversed input)', () => {
    // Insertion-order shouldn't matter — same canonical result.
    expect(generateCostSpread(runes({ Y: 6, G: 6 }))).toEqual([
      '1', '2', '3',
      'GG', '1G', '2G',
      'YY', '1Y', '2Y',
      'GY', '1GY', '2GG',
    ]);
  });

  it('three+ colors: only the top 2 by count are used (rare; v0.2 will improve)', () => {
    // R:5, B:4, Y:3 — top 2 are R, B; Y is ignored.
    const result = generateCostSpread(runes({ R: 5, B: 4, Y: 3 }));
    expect(result).toEqual([
      '1', '2', '3',
      'RR', '1R', '2R',
      'BB', '1B', '2B',
      'RB', '1RB', '2RR',
    ]);
    expect(result.some((c) => c.includes('Y'))).toBe(false);
  });

  it('all six colors at equal count: top-2 falls to canonical R, B', () => {
    expect(generateCostSpread(runes({ R: 2, B: 2, P: 2, O: 2, G: 2, Y: 2 }))).toEqual([
      '1', '2', '3',
      'RR', '1R', '2R',
      'BB', '1B', '2B',
      'RB', '1RB', '2RR',
    ]);
  });

  it('a single rune in one color still triggers the mono-color spread', () => {
    expect(generateCostSpread(runes({ P: 1 }))).toEqual([
      '1', '2', '3',
      'PP', '1P', '2P',
    ]);
  });
});
