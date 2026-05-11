import { describe, it, expect } from 'vitest';
import { parseCost, COLORS } from '../cost-parser';

function ok<T extends { ok: true; cost: unknown }>(r: T | { ok: false }) {
  if (!r.ok) throw new Error('expected ok=true');
  return r.cost;
}

describe('parseCost — SPEC §2 canonical examples', () => {
  it('"2RR" → generic=2, R:2, total=4', () => {
    const r = parseCost('2RR');
    expect(r).toEqual({
      ok: true,
      cost: { generic: 2, colors: { R: 2 }, totalCost: 4, raw: '2RR' },
    });
  });

  it('"1BG" → generic=1, B:1, G:1, total=3', () => {
    const r = parseCost('1BG');
    expect(r).toEqual({
      ok: true,
      cost: { generic: 1, colors: { B: 1, G: 1 }, totalCost: 3, raw: '1BG' },
    });
  });

  it('"3" → generic=3, no colors, total=3', () => {
    const r = parseCost('3');
    expect(r).toEqual({
      ok: true,
      cost: { generic: 3, colors: {}, totalCost: 3, raw: '3' },
    });
  });

  it('"RRR" → generic=0, R:3, total=3', () => {
    const r = parseCost('RRR');
    expect(r).toEqual({
      ok: true,
      cost: { generic: 0, colors: { R: 3 }, totalCost: 3, raw: 'RRR' },
    });
  });

  it('"5RGBY" → generic=5, R:1 G:1 B:1 Y:1, total=9', () => {
    const r = parseCost('5RGBY');
    expect(r).toEqual({
      ok: true,
      cost: {
        generic: 5,
        colors: { R: 1, G: 1, B: 1, Y: 1 },
        totalCost: 9,
        raw: '5RGBY',
      },
    });
  });

  it('"0" → generic=0, no colors, total=0 (trivial)', () => {
    const r = parseCost('0');
    expect(r).toEqual({
      ok: true,
      cost: { generic: 0, colors: {}, totalCost: 0, raw: '0' },
    });
  });
});

describe('parseCost — accepted variants', () => {
  it('all six color letters parse', () => {
    for (const c of COLORS) {
      const r = parseCost(c);
      expect(r.ok).toBe(true);
      const cost = ok(r);
      expect((cost as { colors: Record<string, number> }).colors[c]).toBe(1);
    }
  });

  it('ignores whitespace anywhere', () => {
    const r = parseCost('  2 R R  ');
    expect(r).toEqual({
      ok: true,
      cost: { generic: 2, colors: { R: 2 }, totalCost: 4, raw: '  2 R R  ' },
    });
  });

  it('normalizes lowercase to uppercase', () => {
    const r = parseCost('2rb');
    expect(r).toEqual({
      ok: true,
      cost: { generic: 2, colors: { R: 1, B: 1 }, totalCost: 4, raw: '2rb' },
    });
  });

  it('handles multi-digit generic', () => {
    const r = parseCost('10R');
    expect(r).toEqual({
      ok: true,
      cost: { generic: 10, colors: { R: 1 }, totalCost: 11, raw: '10R' },
    });
  });

  it('handles leading zeros in generic', () => {
    const r = parseCost('02R');
    expect(r).toEqual({
      ok: true,
      cost: { generic: 2, colors: { R: 1 }, totalCost: 3, raw: '02R' },
    });
  });

  it('counts repeated colors in any order', () => {
    const r = parseCost('RBRBR');
    expect(ok(r)).toEqual({
      generic: 0,
      colors: { R: 3, B: 2 },
      totalCost: 5,
      raw: 'RBRBR',
    });
  });

  it('preserves the original input in raw, including whitespace and case', () => {
    const r = parseCost(' 1 r ');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.cost.raw).toBe(' 1 r ');
  });
});

describe('parseCost — errors', () => {
  it('empty input is an error', () => {
    const r = parseCost('');
    expect(r.ok).toBe(false);
  });

  it('whitespace-only input is an error', () => {
    const r = parseCost('   ');
    expect(r.ok).toBe(false);
  });

  it('digits after color letters are an error', () => {
    const r = parseCost('2R2');
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toMatch(/position 2/);
  });

  it('unknown color letter is an error', () => {
    const r = parseCost('2X');
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toMatch(/X/);
  });

  it('special characters are an error', () => {
    const r = parseCost('2R-R');
    expect(r.ok).toBe(false);
  });

  it('rejects letters not in the domain set even if alphabetic', () => {
    // F could be confused with "Fury" but the canonical letter is R; reject F.
    const r = parseCost('2F');
    expect(r.ok).toBe(false);
  });
});
