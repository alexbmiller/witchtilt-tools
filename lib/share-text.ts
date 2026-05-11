/**
 * Build the copy-shareable text block for a parsed deck's mana curve
 * (SPEC_decks_v0.1 §7). Pure function — takes the inputs the UI already has
 * and emits a single string suitable for pasting into Discord, X, etc.
 *
 * Format:
 *   Mana curve — witchtilt.com/decks
 *   Runes: 7 Mind, 5 Order
 *   Going first, P(can cast):
 *     T1 — 1: 100% | 2: 0% | 3: 0% | BB: 0% | ...
 *     T2 — ...
 *     ...
 *
 * Probabilities are rounded to whole percent for terseness (the live table
 * shows 1-decimal precision; share text trades precision for readability).
 */

import { COLORS, type Color } from './cost-parser';
import type { RuneCounts } from './cost-spread';

const COLOR_DOMAIN: Record<Color, string> = {
  R: 'Fury',
  B: 'Mind',
  P: 'Chaos',
  O: 'Body',
  G: 'Calm',
  Y: 'Order',
};

export interface ShareInput {
  runes: RuneCounts;
  costs: string[];
  /** matrix[costIdx][turnIdx] — probability in [0, 1] */
  matrix: number[][];
  turns: readonly number[];
  goingFirst: boolean;
}

function pctShort(p: number): string {
  if (p >= 0.9995) return '100%';
  if (p < 0.0005) return '0%';
  return `${Math.round(p * 100)}%`;
}

export function buildShareText({ runes, costs, matrix, turns, goingFirst }: ShareInput): string {
  const runeBreakdown = COLORS.filter((c) => runes[c] > 0)
    .map((c) => `${runes[c]} ${COLOR_DOMAIN[c]}`)
    .join(', ');

  const lines = [
    'Mana curve — witchtilt.com/decks',
    `Runes: ${runeBreakdown || '(none)'}`,
    `Going ${goingFirst ? 'first' : 'second'}, P(can cast):`,
  ];

  for (let t = 0; t < turns.length; t++) {
    const cells = costs.map((cost, i) => `${cost}: ${pctShort(matrix[i][t])}`).join(' | ');
    lines.push(`  T${turns[t]} — ${cells}`);
  }

  return lines.join('\n');
}
