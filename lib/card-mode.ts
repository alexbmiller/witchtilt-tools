/**
 * Card mode wrapper — P(can cast a parsed cost by end of turn T).
 *
 * Composes:
 *   - runesSeenByTurn (probability.ts) → sample size for turn T / turn order
 *   - multivariateHypergeom (multivariate.ts) → P(color requirements met)
 *
 * Two short-circuit checks before delegating to the multivariate math:
 *
 *   1. totalCost === 0 → trivially castable (SPEC §5 case 4).
 *   2. channelsSeen < totalCost → can't even pay the generic mana, return 0.
 *      Generic mana is not modeled by multivariateHypergeom; it's purely a
 *      hand-size constraint here.
 *
 * Once both pass, P(can cast) reduces to P(color requirements met) over the
 * sample of channelsSeen cards, which is exactly what multivariateHypergeom
 * computes — any remaining cards in the hand cover the generic portion.
 */
import { runesSeenByTurn } from "./probability";
import { multivariateHypergeom } from "./multivariate";
import type { CardCost, Color } from "./cost-parser";

export function probabilityCanCast(
  cost: CardCost,
  deckComposition: Record<Color, number>,
  turn: number,
  goingFirst: boolean,
): number {
  if (cost.totalCost === 0) return 1;

  const channelsSeen = runesSeenByTurn(turn, goingFirst);
  if (channelsSeen < cost.totalCost) return 0;

  return multivariateHypergeom(12, deckComposition, channelsSeen, cost.colors);
}
