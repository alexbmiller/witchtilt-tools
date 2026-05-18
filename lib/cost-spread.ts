/**
 * Mana-curve cost-spread generator (SPEC_decks_v0.1 §4).
 *
 * Given the rune-pool color counts from a parsed deck, return the list of
 * cost strings to display in the mana-curve table. Pure UI-orientation
 * helper — decides which costs are *worth showing* for this deck — not part
 * of the math layer.
 *
 * Spread shape:
 *   - Always:   `1`, `2`, `3`              (pure-Energy)
 *   - 1 color:  + `CC`, `1C`, `2C`         (3 colored rows)
 *   - 2 colors: also + `DD`, `1D`, `2D`,
 *                `CD`, `1CD`, `2CC`        (9 colored rows total)
 *
 * C and D are the deck's two most-represented colors. With 3+ colors, only
 * the top 2 are used (rare in practice; documented spec deviation expected
 * in v0.2). Ties broken by canonical color order R,B,P,O,G,Y.
 */
import { COLORS, type Color } from './cost-parser';

export type RuneCounts = Record<Color, number>;

export function generateCostSpread(runes: RuneCounts): string[] {
  const presentByCount = COLORS.filter((c) => runes[c] > 0).sort((a, b) => {
    const diff = runes[b] - runes[a];
    if (diff !== 0) return diff;
    return COLORS.indexOf(a) - COLORS.indexOf(b);
  });
  const top = presentByCount.slice(0, 2);

  const costs: string[] = ['1', '2', '3'];

  if (top.length >= 1) {
    const C = top[0];
    costs.push(`${C}${C}`, `1${C}`, `2${C}`);
  }
  if (top.length >= 2) {
    const C = top[0];
    const D = top[1];
    costs.push(`${D}${D}`, `1${D}`, `2${D}`);
    costs.push(`${C}${D}`, `1${C}${D}`, `2${C}${C}`);
  }

  return costs;
}
