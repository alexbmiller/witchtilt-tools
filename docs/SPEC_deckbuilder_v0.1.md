# Deck Builder v0.1 — Architecture Spec

**Scope**: The third major tool under the WitchTilt umbrella. Build a legal Riftbound deck *inside* WitchTilt, with rune-pool math live as you go. The Pastebin turns a pasted deck into math; the Builder turns *building* a deck into math.

**Status**: spec drafted 2026-05-11, **frozen pending Riot API key approval** (see §3). Branch when implementation starts: `deckbuilder-v0.1`. Promoted from `docs/DECKBUILDER_STRATEGY_NOTES.md` (Croupier strategy notes, kept alongside as historical rationale).

**Position in launch architecture**:
- `witchtilt.com` — landing page
- `runes.witchtilt.com` — Rune Odds v0.3 (math reference)
- `decks.witchtilt.com` — Deck Pastebin v0.1 (your deck → math)
- `builder.witchtilt.com` — **this tool** (build the deck *in* WitchTilt, math live as you go)

---

## 1. What this tool does (and doesn't)

### Does
- Browse the full Riftbound card pool via search + filters
- Add cards to a deck list, with count limits (≤3 per card) and deck-size validation (40 main + 12 runes per Riftbound rules)
- Auto-derive a starting rune pool from the cards added; allow manual override
- Show a live mana-curve probability table (the existing Pastebin component) updating on every deck change
- Show deck color distribution, average cost, and a curve histogram
- Encode the full deck into a shareable URL (no backend, no accounts)
- Export the decklist as the same text format the Pastebin parses (closing the loop between tools)

### Does NOT (out of scope for v0.1)
- Save decks across sessions (no localStorage in v0.1 — deferred to v0.2 / Ladder B)
- Accounts, login, server-side deck storage, shared/collaborative decks
- Card recommendations or "suggested upgrades"
- Win-rate / meta data of any kind (explicitly prohibited by Riot policy)
- Drag-and-drop reordering (click-to-add only in v0.1)
- Mobile-optimized *building* — mobile is for *viewing* a deck, not editing it
- Multi-deck comparison
- Printable physical-deck export

These are each candidates for v0.2+ (Ladder B) or beyond (Ladder C).

---

## 2. Position vs Pastebin

The Pastebin parses external decks into structured form for math. The Builder is the *upstream* tool: you compose the deck here, then either share the URL, export the text to paste elsewhere, or take it offline to play.

The reuse story is intentional:
- Math layer: identical (`probabilityCanCast` + `parseCost` + `multivariateHypergeom` from Rune Odds v0.3, untouched).
- Mana-curve table component: reused from `app/components/decks/mana-curve-table.tsx` with the same derived cost-spread rules.
- Decklist text format: Builder's "Export as text" produces the exact format Pastebin parses; users can round-trip between the two tools.

---

## 3. Hard dependency: Riot API key approval

**Do not start implementation until the Riot API key is approved.** The Deck Builder fundamentally requires a card database (names, costs, colors, types, domains, art). Both the data and the art come from the Riot API under the Digital Tools Policy.

**Application status (2026-05-11)**: submitted, awaiting review. Could be days to weeks.

**Sequencing implications**:

1. **No code commits to the implementation branch until approval.** Anything built without the API will need rebuilding once available; the API shape will likely dictate the card data structure.
2. **Spec finalization is fine to do now** (this document). The waiting period is good prep time.
3. **If approval drags past two weeks**, consider a "v0.0 preview" using a community-sourced card-name JSON (verify license) to validate the UX end-to-end. **Default plan: wait.** Don't make the rebuild burden bigger.

This dependency is structural, not a footnote — every other decision in this spec assumes it lands.

---

## 4. Scope: Ladder A only

The strategy notes lay out three ladders (A: minimal, B: persistence, C: collaboration). **v0.1 ships Ladder A only.** B and C are deferred and do not influence v0.1 architectural decisions.

Specifically excluded from v0.1 even though they may be tempting "while we're here":
- localStorage / "my decks" persistence (Ladder B)
- Deck rename / duplicate / version history (Ladder B)
- Print-ready exports (Ladder B)
- Server-side deck storage (Ladder C — requires real backend)
- Embeds, comments, shared editing (Ladder C)

Ladder B is the natural v0.2; Ladder C is a much larger architectural commitment and may never be appropriate.

---

## 5. UX direction: Approach 3 (hybrid)

The strategy notes evaluate three UX approaches; v0.1 adopts **Approach 3 — hybrid**:

- **Card library** (left/main area) — visual grid with card art, filterable by color, type, cost, search. Click a card to add it to the current deck.
- **Current deck** (right/sidebar) — compact list with small thumbnails, count, cost. Click an entry to inspect or remove.
- **Math panel** (right, below current deck) — always visible: mana curve table, color distribution, average cost, curve histogram.
- **Mobile fallback** — single column, current-deck-first. Mobile is explicitly view-only; build on desktop.

Rationale: every successful TCG deck builder (Scryfall, Limitless, Untapped) converges on this hybrid because the use cases need both modes — visual for browsing, efficient list for the current state.

---

## 6. Page anatomy (top to bottom on mobile, left-to-right on desktop)

### 6.1 Header
Branding consistent with the other tools: `BUILDER/DECKS` wordmark (or similar — final treatment in build polish), version label `v0.1 · riftbound tcg`, brief tagline. Same monospace + accent-gold pattern as the existing tools.

### 6.2 Filter bar (sticky on desktop)
- Search input (name-substring match)
- Color filter (six toggles: Fury/Mind/Chaos/Body/Calm/Order, plus "Any" reset)
- Cost filter (0–7+ range slider or chips)
- Type filter (Unit, Spell, Battlefield, Champion, Legend — whatever Riftbound's card types are once API confirms)

### 6.3 Card library grid
- Responsive grid of card tiles with art, name, cost, quick-add button
- Lazy-loaded images via Next.js `<Image>`
- Virtualization (react-window or similar) **only if** perf testing shows it's needed; the Riftbound pool is small for now

### 6.4 Current deck panel
- Heading: deck name (editable, plain text, default `Untitled deck`)
- Main deck section: each entry as `{count}× {name}` with cost and a small thumbnail; running total + 40-card legality indicator
- Rune pool section: 6 color sliders (sum = 12), plus an "auto-derive from main deck" reset button
- Action buttons: Share (copy URL), Export as text (copy Pastebin-compatible text), Clear deck

### 6.5 Math panel
Below the current deck on desktop; collapsed by default on mobile (expand to view).
- **Mana curve table** (same component as Pastebin: derived cost spread, T1–T4 always, T5 conditional)
- **Color distribution** — bar showing what % of main deck is each color (counts by card color, not rune color)
- **Average cost** — single number, computed across the main deck
- **Curve histogram** — count of cards by total cost (0, 1, 2, 3, 4, 5, 6+)

### 6.6 Footer
Reuse `app/components/landing/footer.tsx` — same WitchTilt branding + Riot fan-content disclaimer (required for any tool referencing Riftbound).

---

## 7. Design decisions

These adopt the recommendations from `docs/DECKBUILDER_STRATEGY_NOTES.md` §5 (Croupier's defaults). Each is revisable; recording the *current* call here so the build doesn't drift.

| ID | Question | Decision | Rationale |
|---|---|---|---|
| Q1 | Rune deck: auto-derived or manual? | **Both: auto-derived as starting point, manual override available** | Teaches the user that runes track main-deck colors; doesn't lock out advanced tuning |
| Q2 | Search/filter implementation | **Client-side filter on a JSON blob of all cards** | Riftbound's pool stays small enough for the first year; revisit at ~2000 cards |
| Q3 | Color identity / domain validation | **Warn but allow; toggle for strict mode** | Casual users learn rules without friction; power users can opt in to enforcement |
| Q4 | Deck metadata | **Name only** | Notes/author handle is feature creep; accounts aren't on the table for v0.1 |
| Q5 | Share URL encoding | **Full decklist base64-encoded in the URL (no backend)** | Matches every other TCG community deck-share tool's pattern; no servers to maintain. Long URLs (~600 chars for a 40-card deck) are tolerable |
| Q6 | Math panel content | **Mana curve + color distribution + average cost + curve histogram** | All derivable from the deck with no extra inputs; "is my deck shaped right" is a fundamental builder question |
| Q7 | First-visit onboarding | **Empty state + 2-3 example decks one click away** | Teaches by demonstration without forcing tutorial pacing. Pick examples that span deck philosophies (mono-color aggro, two-color midrange, three-color combo) |

---

## 8. Code architecture

```
app/
├── builder/
│   └── page.tsx              # /builder route — server component shell, header + Footer + BuilderApp client
└── components/builder/
    ├── builder-app.tsx       # client wrapper — owns deck state, parses URL on mount
    ├── filter-bar.tsx        # search + color/cost/type filters
    ├── card-library.tsx      # card grid view, wraps card-tile
    ├── card-tile.tsx         # single card with art + quick-add
    ├── current-deck.tsx      # right-panel list of deck entries
    ├── deck-list-item.tsx    # single deck row (thumb, count, name, cost, remove)
    ├── rune-deck-panel.tsx   # 6 sliders + auto-derive button
    ├── math-panel.tsx        # mana curve + color distribution + avg cost + histogram
    └── share-modal.tsx       # share URL + export text modal

lib/
├── card-database.ts          # client-side card data + filter indices (loaded from JSON build artifact)
├── deck-encoder.ts           # base64 URL encode/decode of deck state
├── deck-validator.ts         # domain rules, count limits, size validation
├── deck-stats.ts             # color distribution, avg cost, curve histogram (pure functions)
└── (existing math layer from v0.3 unchanged, reused)
```

**Reuse, don't re-implement:**
- Math: `probabilityCanCast`, `parseCost`, `multivariateHypergeom` (lib/card-mode.ts, lib/cost-parser.ts, lib/multivariate.ts)
- Mana-curve table: `app/components/decks/mana-curve-table.tsx` should be moved to `app/components/shared/mana-curve-table.tsx` (or kept in decks/ and imported across tools — decide during build)
- Cost-spread generator: `lib/cost-spread.ts` (already reusable)
- Footer: `app/components/landing/footer.tsx`

---

## 9. State management

- **Current deck** — `useReducer` in `builder-app.tsx`. Actions: `addCard`, `removeCard`, `setCount`, `setRunes`, `setName`, `loadFromUrl`, `clear`.
- **URL state** — `useSearchParams` from Next.js. The `?deck=<base64>` param is the source of truth on initial load; mutations update local state and push a new URL via `router.replace()` (debounced to avoid history spam).
- **No global state library** (Redux, Zustand) — scope doesn't warrant it. State lives in `builder-app.tsx` and flows down via props.
- **No localStorage** in v0.1 — deferred to Ladder B / v0.2.

---

## 10. Deck encoder (URL format)

A simple, deterministic format that base64-encodes to a URL-safe string. Sketch:

```
v1|name=<encodedName>|main=<cardId>:3,<cardId>:3,...|runes=R3B0P0O2G2Y5
```

The literal pipe-separated form gets base64url-encoded as the `?deck=` value. Decoding is the reverse. Format version (`v1`) lets us migrate cleanly later.

Decisions to lock at implementation time:
- Card IDs vs card names in the encoding (IDs are shorter and resilient to renames; names are debuggable). Default to **IDs** assuming the Riot API provides stable card IDs.
- Encoding length limit: should we warn the user if a deck URL exceeds, say, 1500 characters? Some chat platforms truncate.
- Should the deck name be URL-encoded inside the base64, or live in a separate query param? Spec leaves this to the implementer; recommend in-base64 for atomicity.

---

## 11. Validation rules

`lib/deck-validator.ts` exposes pure functions:

- `validateDeckSize(deck)` — 40 main + 12 runes. Returns `{ ok: boolean, mainTotal, runeTotal, errors }`.
- `validateCardCounts(deck)` — no card has more than 3 copies. Returns list of violations.
- `validateDomainMatch(deck, strictMode)` — every non-rune card's color matches at least one rune color present. In lenient (default) mode, returns warnings; in strict mode, blocks adds (UI surfaces via callback rather than throw).
- `validateChampion(deck)` — exactly 1 Champion in the main deck (per Riftbound rules; confirm via API once card types are known).

UI integration:
- Validation runs on every deck mutation, memoized.
- Errors/warnings show in the current-deck panel header and the share modal (don't block sharing — share whatever's there, even illegal — but flag clearly).

---

## 12. Math panel content

All derived from the current deck state; pure functions in `lib/deck-stats.ts`.

| Metric | Source | Display |
|---|---|---|
| **Mana curve** | `runes` + cost-spread shape, via existing `mana-curve-table` | Same table as Pastebin |
| **Color distribution** | Main deck card colors, weighted by count | Stacked horizontal bar with color swatches + % labels |
| **Average cost** | Sum(card.cost × card.count) / total main-deck count | Single number with 1 decimal |
| **Curve histogram** | Count of cards grouped by total-cost bucket: 0, 1, 2, 3, 4, 5, 6+ | Vertical bar chart (tiny — sparkline scale) |

---

## 13. Edge cases

1. **Empty deck on load** — show example-decks picker (Q7) instead of math panel
2. **Deck loaded from URL with unknown card IDs** (post-rotation, e.g.) — warn, list unknown IDs, allow editing around them
3. **Rune total != 12** — warn in the rune panel, but still compute math against the actual total (mirrors Pastebin behavior)
4. **Lenient-mode domain mismatch** — yellow warning chips on offending cards in the current deck panel; share/export still allowed
5. **Filter returns zero cards** — empty state in the card library with "no cards match — clear filters" link
6. **URL exceeds platform limits** (>2000 chars, rare) — share modal warns "this URL may be truncated by some chat platforms; consider sharing the exported text instead"

---

## 14. Riot policy compliance

Locked from the strategy notes (§7). The Builder must:

- Use **only** Riot-provided assets (card data + art) once the API key is granted
- Display the fan-content disclaimer in the footer (reused from landing)
- **Not** publish any meta data (play rates, win rates, popularity, tournament results)
- **Not** include in-app advertising
- **Not** enable automated gameplay simulation
- **Not** include skill-based matchmaking or leaderboards

Reference: `📜 Riftbound IP & Riot Digital Tools Policy` entry in the Compendium.

---

## 15. Build order (executable once Riot API approval lands)

1. **Card database integration** — fetch the Riot card data, normalize into a JSON build artifact, stand up `lib/card-database.ts` with indices. Verify shape before any UI work.
2. **Filter bar + card library** — render the grid against the database, wire search/color/cost/type filters. No deck state yet.
3. **Current deck panel + reducer** — implement `addCard` / `removeCard` / `setCount`. Card library wired to the reducer. No math yet.
4. **Validation + warnings UI** — `deck-validator.ts` + chip styling in current-deck panel.
5. **Rune panel** — sliders, auto-derive button, sum-to-12 enforcement.
6. **Math panel** — wire `mana-curve-table` (extracted to shared location), add `deck-stats.ts` and color-distribution / avg-cost / histogram UI.
7. **URL encoding + share modal** — `deck-encoder.ts`, share modal with copy-to-clipboard, export-as-text.
8. **Example decks + onboarding** — pick 3 diverse example decks (mono-aggro, two-color midrange, three-color combo); seed as JSON; render in empty state.
9. **Polish** — mobile layout, perf testing (virtualize if needed), share-URL length warnings, final copy review.
10. **Deployment** — add `builder.witchtilt.com` rewrite to `next.config.js`, CNAME in Cloudflare, Vercel domain entry, flip the landing tool card from Coming Soon to Live.

Ships when:
- Building a legal Ladder-A deck end-to-end works (browse → add → adjust runes → share URL → reload from URL produces same deck)
- Math panel updates live and matches Pastebin output for the same deck
- All Riot policy compliance items are in place
- Mobile view-only mode doesn't crash or overflow
- Lighthouse perf ≥ 80 (acceptable; image-heavy pages won't hit landing's ≥95)

---

## 16. Non-goals (resist scope creep)

Each of the below is a real future tool or feature, not a "while we're here" addition to Deck Builder v0.1:

- **Main Deck Probability Calculator** — separate tool (item #4 on the Tool Roadmap)
- **Pack EV / Collection Tracker** — separate tool
- **Draft Simulator** — separate tool; likely needs deeper Riot integration approval
- **Resolution Order Sequencer** — separate tool
- **Saved decks across sessions** — Ladder B, v0.2
- **Print-ready exports** — Ladder B, v0.2
- **Server-side anything** — Ladder C, much later

---

## 17. Deployment

- Branch: `deckbuilder-v0.1`
- Subdomain: `builder.witchtilt.com` — add rewrite to `next.config.js` following the same pattern as `runes` and `decks`; add CNAME in Cloudflare; add the domain to the Vercel project.
- Production URL after launch: `https://builder.witchtilt.com/`
- Path fallback: `https://witchtilt.com/builder` works the same (the Next.js route is `/builder`, the subdomain is a host rewrite that prepends `/builder/` to the path).
- Branch protection on `main` is active (see project memory `project_branch_protection.md`) — all work goes through PRs.

---

## 18. v0.2+ follow-ups (deferred, tracked here so they survive)

When v0.1 ships and a v0.2 conversation begins, prioritize in this order:

1. **localStorage for "my decks"** (Ladder B) — single most-requested likely follow-up
2. **Import from Pastebin format** — closing the round-trip with the existing tool
3. **Card recommendations / "complete this deck"** — could become its own thing
4. **Drag-and-drop reordering**
5. **Mobile-optimized building** (currently view-only on mobile)
6. **Print-ready export with card art**
7. **Deck folders / version history** (Ladder B)

Ladder C (collaboration, server-side, accounts) remains deferred indefinitely without a strategic reason to take on the architectural complexity.

---

**Filed 2026-05-11.** Frozen pending Riot API key approval. Promoted from `docs/DECKBUILDER_STRATEGY_NOTES.md` (kept alongside as historical context).
