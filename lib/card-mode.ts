/**
 * Card mode wrappers — P(can cast a parsed cost by turn T).
 *
 * Two flavors:
 *   - probabilityCanCast: deckbuilding query, samples from the full 12-card
 *     rune deck assuming nothing has been channeled yet.
 *   - probabilityCanCastMidGame: mid-game query, samples only from the
 *     unknown pile that remains face-down at currentTurn. The cumulative
 *     channel count (current + future) still has to pay generic mana.
 *
 * Both compose:
 *   - runesSeenByTurn (probability.ts) → channel-count schedule.
 *   - multivariateHypergeom (multivariate.ts) → P(color requirements met).
 *
 * Two short-circuit checks before delegating to multivariate:
 *
 *   1. totalCost === 0 → trivially castable (SPEC §5 case 4).
 *   2. channelsAvailable < totalCost → can't pay generic, return 0.
 *      Generic mana is purely a hand-size constraint at this layer.
 *
 * Mid-game caveat: probabilityCanCastMidGame computes P(NEW draws from the
 * pile alone satisfy cost.colors). Already-channeled runes count toward
 * generic but conservatively don't contribute color — if your existing rune
 * pool already covers part of the cost, treat it as paid and reduce your
 * cost before querying.
 */
import { runesSeenByTurn } from "./probability";
import { multivariateHypergeom } from "./multivariate";
import { COLORS, type CardCost, type Color } from "./cost-parser";

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

export function probabilityCanCastMidGame(
  cost: CardCost,
  pileComposition: Record<Color, number>,
  currentTurn: number,
  queryTurn: number,
  goingFirst: boolean,
): number {
  if (cost.totalCost === 0) return 1;
  if (queryTurn <= currentTurn) return 0;

  const channelsByQuery = runesSeenByTurn(queryTurn, goingFirst);
  if (channelsByQuery < cost.totalCost) return 0;

  const channelsByCurrent = runesSeenByTurn(currentTurn, goingFirst);
  const newDraws = channelsByQuery - channelsByCurrent;
  if (newDraws <= 0) return 0;

  let pileSize = 0;
  for (const c of COLORS) pileSize += pileComposition[c] ?? 0;
  if (pileSize <= 0) return 0;

  const effectiveDraws = Math.min(newDraws, pileSize);
  return multivariateHypergeom(pileSize, pileComposition, effectiveDraws, cost.colors);
}
