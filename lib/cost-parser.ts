/**
 * Riftbound card cost parser.
 *
 * Grammar (SPEC §2):
 *   cost  ::= <generic-digits>? <color-letter>*
 *   generic = decimal integer (defaults to 0 if absent)
 *   color   = one of R/B/P/O/G/Y (case-insensitive), repeated per unit required
 *
 * Domain ↔ letter mapping (SPEC §1, verified against Riftbound docs):
 *   R = Red    / Fury     B = Blue   / Mind
 *   P = Purple / Chaos    O = Orange / Body
 *   G = Green  / Calm     Y = Yellow / Order
 *
 * Whitespace is stripped before parsing. Anything else is a parse error.
 *
 * Examples:
 *   "2RR"   → generic=2, R:2, total=4
 *   "RRR"   → generic=0, R:3, total=3
 *   "3"     → generic=3, total=3
 *   "5RGBY" → generic=5, R:1, G:1, B:1, Y:1, total=9
 *   "0"     → generic=0, total=0 (trivially castable)
 */

export type Color = 'R' | 'B' | 'P' | 'O' | 'G' | 'Y';

export const COLORS: readonly Color[] = ['R', 'B', 'P', 'O', 'G', 'Y'] as const;

const COLOR_SET: ReadonlySet<string> = new Set(COLORS);

export interface CardCost {
  generic: number;
  colors: Partial<Record<Color, number>>;
  totalCost: number;
  raw: string;
}

export type ParseResult =
  | { ok: true; cost: CardCost }
  | { ok: false; error: string };

export function parseCost(input: string): ParseResult {
  const raw = input;
  const cleaned = input.replace(/\s+/g, '').toUpperCase();

  if (cleaned.length === 0) {
    return { ok: false, error: 'Cost is empty.' };
  }

  let i = 0;
  let genericStr = '';
  while (i < cleaned.length && cleaned[i] >= '0' && cleaned[i] <= '9') {
    genericStr += cleaned[i];
    i++;
  }
  const generic = genericStr === '' ? 0 : parseInt(genericStr, 10);

  const colors: Partial<Record<Color, number>> = {};
  while (i < cleaned.length) {
    const ch = cleaned[i];
    if (ch >= '0' && ch <= '9') {
      return {
        ok: false,
        error: `Digits must precede color letters (got '${ch}' at position ${i}).`,
      };
    }
    if (!COLOR_SET.has(ch)) {
      return {
        ok: false,
        error: `Unknown color '${ch}' at position ${i}. Valid: ${COLORS.join(', ')}.`,
      };
    }
    const color = ch as Color;
    colors[color] = (colors[color] ?? 0) + 1;
    i++;
  }

  let colorTotal = 0;
  for (const c of COLORS) colorTotal += colors[c] ?? 0;

  return {
    ok: true,
    cost: { generic, colors, totalCost: generic + colorTotal, raw },
  };
}
