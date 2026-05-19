/**
 * Card mode wrappers — P(can cast a parsed cost by turn T).
 *
 * Two flavors:
 *   - probabilityCanCast: deckbuilding query, samples from the full 12-card
 *     rune deck assuming nothing has been channeled yet.
 *   - probabilityCanCastMidGame: mid-game query, samples only from the
 *     unknown pile that remains face-down at currentTurn.
 *
 * Cost model (SPEC v0.4 §3): castable iff
 *   (1) total channeled runes ≥ Energy            (exhaust to pay Energy), AND
 *   (2) for every color c: channeled[c] ≥ req[c]  (recycle to pay Power)
 * A single rune can satisfy BOTH — exhausting and recycling are independent
 * actions on the same card. So Power pips are NOT added to the Energy total;
 * the two parts are checked against the same pool independently.
 *
 *   - runesSeenByTurn (probability.ts) → channel-count schedule.
 *   - multivariateHypergeom (multivariate.ts) → P(color requirements met).
 *
 * Mid-game caveat: probabilityCanCastMidGame computes P(NEW draws from the
 * pile alone satisfy cost.colors). Already-channeled runes count toward
 * Energy but conservatively don't contribute Power — if your existing rune
 * pool already covers part of the cost, treat it as paid and reduce your
 * cost before querying.
 */
import { runesSeenByTurn } from "./probability";
import { multivariateHypergeom } from "./multivariate";
import { COLORS, type CardCost, type Color } from "./cost-parser";

function colorReqSum(cost: CardCost): number {
  let s = 0;
  for (const c of COLORS) s += cost.colors[c] ?? 0;
  return s;
}

export function probabilityCanCast(
  cost: CardCost,
  deckComposition: Record<Color, number>,
  turn: number,
  goingFirst: boolean,
): number {
  if (cost.energy === 0 && colorReqSum(cost) === 0) return 1;

  const channelsSeen = runesSeenByTurn(turn, goingFirst);
  if (channelsSeen < cost.energy) return 0;

  return multivariateHypergeom(12, deckComposition, channelsSeen, cost.colors);
}

export function probabilityCanCastMidGame(
  cost: CardCost,
  pileComposition: Record<Color, number>,
  currentTurn: number,
  queryTurn: number,
  goingFirst: boolean,
): number {
  if (cost.energy === 0 && colorReqSum(cost) === 0) return 1;
  if (queryTurn <= currentTurn) return 0;

  const channelsByQuery = runesSeenByTurn(queryTurn, goingFirst);
  if (channelsByQuery < cost.energy) return 0;

  const channelsByCurrent = runesSeenByTurn(currentTurn, goingFirst);
  const newDraws = channelsByQuery - channelsByCurrent;
  if (newDraws <= 0) return 0;

  let pileSize = 0;
  for (const c of COLORS) pileSize += pileComposition[c] ?? 0;
  if (pileSize <= 0) return 0;

  const effectiveDraws = Math.min(newDraws, pileSize);
  return multivariateHypergeom(pileSize, pileComposition, effectiveDraws, cost.colors);
}
