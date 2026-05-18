# Rune Odds v0.4 — Cost Model Correction

**Status**: spec frozen 2026-05-18. This is a CORRECTNESS fix, not a feature. It changes computed probabilities for every cost that has a Power component. Gates Video #1 — no recording until v0.4 ships and numbers are re-verified.

**Branch when started**: `v0.4-cost-model-fix` off main.

---

## 1. The bug, stated plainly

Rune Odds v0.3 models a cost like `4RR` as: **"≥6 runes channeled, of which ≥2 are Red."** It treats the energy number and the color pips as additive: `requiredTotal = generic + Σ(color pips)`.

This is wrong. It does not match Riftbound's actual cost mechanic. Every probability the tool currently reports for a card with a Power cost is **systematically too pessimistic** — it demands more runes than the game actually requires.

## 2. The correct mechanic (verified against rules 2026-05-18)

Riftbound costs have two independent parts:

- **Energy** (the number, e.g. the `4` in `4RR`): paid by **exhausting** runes. Any color. 1 energy per rune exhausted. Exhausted runes stay on the board.
- **Power** (the colored pips, e.g. `RR`): paid by **recycling** runes of the matching domain/color. 1 power per rune recycled. Recycled runes leave the board (go to bottom of rune deck).

**The decisive rule**: a single rune can pay BOTH costs. You may exhaust a rune for energy and ALSO recycle that same (already-exhausted) rune for power. Confirmed by:
- riftbound.gg beginner's guide: "You can use the same Rune to pay both costs at once."
- Riot Grove Origins FAQ: "You can recycle a rune (even an exhausted one) to produce 1 power of that rune's domain/color."
- riftboundguide.com (rules verified against Core Rules RUP3): exhaust and recycle are distinct actions on a rune; a rune can be exhausted then recycled.

**Domain matching is strict**: a Power cost of a given color must be paid by recycling a rune of exactly that color. No substitution. (Exception: a universal/any-color Power pip, if such costs exist in the pool, accepts any rune. v0.4 scope: treat all color pips as strict-domain. Universal-power handling deferred to v0.4.1 if it turns out real cards use it — flag for verification, do not build speculatively.)

## 3. The corrected castability rule

Given a set of channeled, available runes, and a cost with energy `E` and per-color power requirements `req[c]` (e.g. `4RR` → E=4, req[R]=2):

**Castable iff:**
1. `total_available ≥ E`  (enough runes to exhaust for energy), AND
2. for every color `c`: `available[c] ≥ req[c]`  (enough runes of each color to recycle for that color's power)

**The color requirements are NOT added to E.** They are checked independently against the same pool. A rune that is one of the `req[c]` recycled runes also counts toward the `E` exhaust requirement.

### Worked checks (these become the hand-verification battery)

- `4RR` (E=4, R:2): castable iff total ≥ 4 AND red ≥ 2. Minimum 4 runes (≥2 Red). **v0.3 wrongly required 6.**
- `1RR` (E=1, R:2): castable iff total ≥ 1 AND red ≥ 2. Binding constraint is red ≥ 2 (which forces total ≥ 2). Minimum 2 runes, both Red. **v0.3 wrongly required 3.**
- `3RB` (E=3, R:1, B:1): castable iff total ≥ 3 AND red ≥ 1 AND blue ≥ 1. Minimum 3 runes incl. ≥1R and ≥1B. **v0.3 wrongly required 5.**
- `1RB` (E=1, R:1, B:1): castable iff total ≥ 1 AND red ≥ 1 AND blue ≥ 1. Binding: need ≥1R and ≥1B → minimum 2 runes (1R 1B), energy auto-covered. **v0.3 wrongly required 3.**
- `2` (E=2, no color): castable iff total ≥ 2. Unchanged from v0.3 (no power component, no bug). Pure-energy costs were always correct.
- `RR` (E=0, R:2): castable iff red ≥ 2. (Total ≥ 0 trivially true.) **v0.3 treated as total ≥ 2 AND red ≥ 2 — wrong if 2 Red is somehow <2 total, which is impossible, so this case was coincidentally correct. But the model was right for the wrong reason; the new model makes it principled.**
- `0` (E=0, no color): trivially castable. Unchanged.

Note the pattern: **pure-energy costs (no pips) were always computed correctly in v0.3.** Only costs with ≥1 color pip were wrong. This narrows what changed and what regression-tests must cover.

## 4. What changes in code

The math engine (`multivariateHypergeom` in `lib/multivariate.ts`) does NOT change. It already computes P(sampling from a partitioned deck yields a configuration meeting per-color minimums). The bug is upstream, in how a parsed cost becomes the requirement passed to it.

### 4.1 Cost → requirement mapping (the actual fix)

Current (wrong), conceptually:
```
requiredTotal = cost.generic + sum(cost.colors)
P = P(channeled ≥ requiredTotal AND for each c: channeled[c] ≥ cost.colors[c])
```

Corrected:
```
energyReq = cost.generic            // the number alone — NOT plus colors
colorReq  = cost.colors             // unchanged
P = P(channeled_total ≥ energyReq AND for each c: channeled[c] ≥ colorReq[c])
```

The change is removing `+ sum(cost.colors)` from the total requirement. The per-color checks stay. That's the whole correctness fix at the model level.

### 4.2 Naming cleanup (do this while we're here)

The v0.3 codebase uses "generic" for the energy number. Riftbound's term is **Energy**. Rename through the cost parser, types, and UI copy:
- `cost.generic` → `cost.energy`
- Parse-feedback / UI label "generic" → "energy"
- Keep the parser's input grammar identical (`4RR` still parses the same string) — only the internal field name and user-facing vocabulary change.

This is not optional polish — using the wrong word for the core resource in a tool whose entire value proposition is "correct, verifies information for people" undermines trust. The tool should speak Riftbound's vocabulary exactly: Energy, Power, Exhaust, Recycle, Channel.

### 4.3 Files touched (verify against actual repo before editing)

- `lib/cost-parser.ts` — rename `generic` → `energy` in `CardCost` type and `parseCost`. Grammar unchanged.
- `lib/card-mode.ts` — `probabilityCanCast`: change requirement construction so color pips are NOT summed into the total; total requirement = energy only.
- `lib/__tests__/` — rewrite every test that asserted the old additive model. The multivariate engine's own tests stand. The cost-interpretation tests are wrong and must be rebuilt against §3's worked checks.
- Deck mode (the unified pastebin) — it calls the same `probabilityCanCast`. Once the core mapping is fixed, Deck mode is automatically corrected. Verify, don't separately patch.
- UI copy across all three modes — "generic" → "energy"; ensure parse feedback reads in Riftbound vocabulary.

## 5. Testing — mandatory before merge

Rebuild the cost-interpretation test suite around §3's worked checks. Required cases:

- Every worked check in §3, asserted as exact probabilities against a hand-computed multivariate hypergeometric.
- Regression: every pure-energy cost (`2`, `3`, `5`, `0`) must produce IDENTICAL output to v0.3 (these were never wrong; if they change, the fix broke something).
- Regression: pure-color costs (`RR`, `RB`, `RRR`) verified against the new principled model.
- The canonical `2RR` example used throughout v0.3 docs and the video lineage: recompute under the corrected model. Document old vs new number explicitly in the test file as a comment so the magnitude of the correction is visible.
- Mid-game / Deck mode: at least one end-to-end check confirming the corrected mapping flows through both.

Do NOT merge until every test passes AND Croupier has hand-verified at least the `4RR`, `1RR`, `3RB`, and `2RR` cases against the multivariate formula by hand (same protocol as v0.3 — the hand-verification caught a spec bug last time; keep the protocol).

## 6. Video impact (consequence, not scope)

Every number that appears in Video #1 must be recomputed under v0.4 and re-verified before recording. Specifically:
- The `2RR` example in Section 3's walkthrough — recompute, the T-by-T curve changes.
- The 57.58% T1 hero stat — determine whether it involves a Power cost. If it's pure rune-presence probability (P of channeling ≥1 of a color by T1), it is UNAFFECTED. If it involves casting a costed card, it was computed under the wrong model and the hero number changes. **This must be resolved before the cold open is recorded.** (Pope to confirm exactly what the 57.58% measures; spec cannot resolve this without that input.)
- Any split-comparison numbers (6-6 vs 8-4) in Section 4 — recompute.

The video bends around the corrected tool. Not the reverse. A correct tool with a different hero number beats a compelling tool that lies.

## 7. Non-goals (explicit, resist scope creep)

- Universal/any-color Power pips — not built unless verification shows real cards use them. Flag, don't speculate.
- Seals (Gear that pays Power without recycling) — out of scope. v0.4 models the rune-only case. Seals are a future consideration; note in Compendium, don't build.
- The Rune Pool emptying twice per turn, multi-card-per-turn sequencing, "rune debt" across turns — all out of scope. v0.4 answers "can I pay this one cost from this channeled pool," same question shape as v0.3, just correctly.
- Mid-game mode mechanic changes beyond inheriting the corrected mapping — none. Same fix flows through.

## 8. Done criteria

v0.4 ships when:
- Cost→requirement mapping no longer sums color pips into the energy total.
- "generic" renamed to "energy" through code and UI; tool speaks Riftbound vocabulary (Energy / Power / Exhaust / Recycle).
- Full cost-interpretation test suite rebuilt around §3, all passing.
- Pure-energy regression confirms no change to costs that were already correct.
- Croupier hand-verified `4RR`, `1RR`, `3RB`, `2RR`.
- Old-vs-new delta documented for the `2RR` video example.
- All three modes (Card / Rune / Deck) verified to reflect the corrected model.

## 9. Sequence

1. Branch `v0.4-cost-model-fix` off main.
2. Rename `generic` → `energy` (parser, types, UI). Commit: `refactor: rename generic cost to energy to match Riftbound vocabulary`.
3. Fix the mapping in `probabilityCanCast` (stop summing color pips into total). Commit: `fix: correct cost model — power pips no longer added to energy requirement`.
4. Rebuild cost-interpretation test suite around §3. Commit: `test: rebuild cost-model tests against corrected Riftbound rules`.
5. Croupier hand-verification pass on the four key cases.
6. Verify Deck mode + Rune mode + mid-game inherit the fix. Commit: `test: verify corrected model flows through all three modes`.
7. Document old-vs-new for video numbers. Hand to Croupier for Video #1 number re-verification.
8. Merge only when §8 fully satisfied.

---

**This spec exists because Pope correctly identified, from playing the actual game, that the tool's cost model didn't match the rules. The tool's entire value proposition is being correct. This fix is the highest-priority WitchTilt work and gates the video.**
