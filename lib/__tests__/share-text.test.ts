import { describe, expect, it } from 'vitest';
import { buildShareText } from '../share-text';
import type { RuneCounts } from '../cost-spread';

function runes(partial: Partial<RuneCounts>): RuneCounts {
  return { R: 0, B: 0, P: 0, O: 0, G: 0, Y: 0, ...partial };
}

const TURNS = [1, 2, 3, 4, 5, 6] as const;

describe('buildShareText', () => {
  it('renders the documented format for a mono-color deck going first', () => {
    const text = buildShareText({
      runes: runes({ Y: 12 }),
      costs: ['1', '2', 'YY'],
      matrix: [
        [1, 1, 1, 1, 1, 1],
        [0, 1, 1, 1, 1, 1],
        [0, 0.997, 1, 1, 1, 1],
      ],
      turns: TURNS,
      goingFirst: true,
    });

    expect(text).toContain('Mana curve — witchtilt.com/decks');
    expect(text).toContain('Runes: 12 Order');
    expect(text).toContain('Going first, P(can cast):');
    expect(text).toContain('T1 — 1: 100% | 2: 0% | YY: 0%');
    expect(text).toContain('T2 — 1: 100% | 2: 100% | YY: 100%');
  });

  it('uses "Going second" when goingFirst is false', () => {
    const text = buildShareText({
      runes: runes({ R: 12 }),
      costs: ['1'],
      matrix: [[1, 1, 1, 1, 1, 1]],
      turns: TURNS,
      goingFirst: false,
    });
    expect(text).toContain('Going second, P(can cast):');
  });

  it('renders multi-color rune breakdown in canonical R,B,P,O,G,Y order', () => {
    const text = buildShareText({
      runes: runes({ B: 7, Y: 5 }),
      costs: ['1'],
      matrix: [[1, 1, 1, 1, 1, 1]],
      turns: TURNS,
      goingFirst: true,
    });
    // B comes before Y in canonical order regardless of how the user pasted them.
    expect(text).toContain('Runes: 7 Mind, 5 Order');
  });

  it('handles empty rune pool gracefully', () => {
    const text = buildShareText({
      runes: runes({}),
      costs: ['1', '2', '3'],
      matrix: [
        [1, 1, 1, 1, 1, 1],
        [0, 1, 1, 1, 1, 1],
        [0, 0, 1, 1, 1, 1],
      ],
      turns: TURNS,
      goingFirst: true,
    });
    expect(text).toContain('Runes: (none)');
  });

  it('rounds 99.95% up to 100% and tiny probabilities down to 0%', () => {
    const text = buildShareText({
      runes: runes({ Y: 12 }),
      costs: ['x'],
      matrix: [[0.9995, 0.0004, 0.5, 0.5, 0.5, 0.5]],
      turns: TURNS,
      goingFirst: true,
    });
    expect(text).toContain('x: 100%');
    expect(text).toContain('x: 0%');
    expect(text).toContain('x: 50%');
  });

  it('produces 1 header line + 3 metadata lines + N turn lines', () => {
    const text = buildShareText({
      runes: runes({ Y: 12 }),
      costs: ['1'],
      matrix: [[1, 1, 1, 1, 1, 1]],
      turns: TURNS,
      goingFirst: true,
    });
    const lines = text.split('\n');
    // header + 'Runes:' + 'Going X' + 6 turn lines = 9
    expect(lines).toHaveLength(9);
  });
});
