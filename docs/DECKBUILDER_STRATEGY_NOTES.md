# Deck Builder — Strategy Notes (pre-spec)

**Purpose**: This is NOT yet a build spec. It's strategic context for the next session, when SPEC_deckbuilder_v0.1.md will be written. The goal is to capture the direction, scope ladders, and open decisions while the architectural context from the v0.3 / pastebin sprint is still fresh.

**Status**: drafted 2026-05-11. Promote to a full SPEC in a focused next-session block when Pope returns to WitchTilt work. Branch when started: `deckbuilder-v0.1`.

---

## 1. Position in the tools roster

The Deck Builder is the third major tool after Rune Odds and Deck Pastebin. It sits at `builder.witchtilt.com` (new subdomain, same Vercel rewrite pattern as the existing two — add the rewrite in `next.config.js` and a CNAME in Cloudflare DNS when ready).

**The role this tool plays:**

- Rune Odds is "abstract math on hypothetical decks"
- Deck Pastebin is "your real deck → math"
- Deck Builder is "build the deck *in WitchTilt*, with math live as you go"

It's the tool that converts WitchTilt from "math reference site" into "deckbuilding workshop." The Pastebin is the bridge; the Builder is the destination.

---

## 2. Hard dependency: Riot API key approval

**The Deck Builder cannot ship in its real form until the Riot API key is approved.** Reasons:

- Real deck building requires a card database (name, cost, type, abilities)
- Real deck building benefits enormously from card art (visual recognition matters in a UI)
- Both come from the Riot API per the Digital Tools Policy

**Application status**: submitted 2026-05-11, awaiting Riot review. Could be days to weeks.

**What this means for sequencing:**

1. **Don't start coding the Deck Builder until Riot approves.** Anything built without the API will need to be rebuilt once the API is available, and the API shape will likely dictate data structure decisions.
2. **The waiting period is good prep time.** Use it to: nail down the UX direction, decide the scope ladder, draft the SPEC. When the API key lands, implementation can move fast because the design is settled.
3. **If approval drags past two weeks**, consider a "v0.0 preview" that uses only the card name database from a community source (verify legality first) just to validate the UX. But default plan is to wait.

---

## 3. Scope ladders — three serious versions to consider

### Ladder A — Minimal builder (the v0.1 we'd ship first)

Goal: build a legal Riftbound deck with live rune odds visible as you go.

**Must have:**
- Card library: search/filter by name, cost, color, type
- Add cards to a deck list (count enforcement: max 3 per card, deck size validation per Riftbound rules)
- Show running rune deck composition (auto-derived from cards added? Or manually set? — open question, see section 5)
- Live mana curve probability table (same component as Pastebin) updating as the deck changes
- Save deck to URL (deterministic URL encoding, no backend, no accounts) — share via copy link
- Export decklist as text (the same format the Pastebin parses, completing the loop)

**Explicitly out of scope:**
- Accounts / saved decks across sessions
- Deck folders, deck history, deck versioning
- Card recommendations
- Win-rate or meta analysis (prohibited by Riot policy)
- Multi-deck comparison
- Mobile-optimized deckbuilding (use mobile to view, not build)

### Ladder B — Builder with persistence (v0.2 candidate, post-Builder-v0.1)

Adds:
- Local storage for "my decks" (browser-only, no accounts, no server data)
- Deck rename / delete / duplicate
- Export to physical-deck-ready format (printable list with card images)
- Import from Pastebin format (closing the loop between the two tools)

### Ladder C — Builder with collaboration (v0.3+ candidate, much later)

Adds:
- Server-side deck storage (requires backend, accounts, etc. — real architectural commitment)
- Shared decks between users
- Comments on decks
- Embed deck on external sites

**Recommendation: Ladder A only for v0.1. Don't bundle B or C without explicit decision.**

---

## 4. UX direction — three real approaches to weigh

### Approach 1 — Spreadsheet-style (utilitarian)

Two panes: card library on the left (table view with filter row), current deck list on the right (compact list with counts). Math panel below the deck list. Minimal card art (small thumbnails or none). Optimized for power users who know what they want and want to add it fast.

**Pros**: ships faster, mobile-friendly, lower data needs, performant with hundreds of cards.
**Cons**: feels less premium, less likely to retain casual users, lower screenshot value for marketing.

### Approach 2 — Card-grid (visual)

Card library shows actual card images in a grid (filterable by color/type/cost). Click to add. Current deck displayed as a stack of card backs or thumbnails. Math panel sidebar.

**Pros**: feels premium, looks great in launch screenshots, matches Riftbound's visual identity, casual users intuit it immediately.
**Cons**: requires actual card art (so genuinely gated on Riot API), higher data needs, performance more challenging.

### Approach 3 — Hybrid (recommended for v0.1)

Card library is a grid with card images (Approach 2), but the *deck list* on the right is a compact list with small thumbnails + count + cost (Approach 1's density). Math sidebar always visible. Mobile falls back to single-column with current-deck-first.

**Pros**: best of both — visual where it matters (browsing), efficient where it matters (current state). Gets the screenshot value without sacrificing power.
**Cons**: more component variety to design and build.

**Recommendation: Approach 3.** It's what every successful TCG deck builder (Scryfall, Limitless, Untapped) converges on. The convergence isn't a coincidence — the use cases genuinely need both modes.

---

## 5. Open design questions to resolve before SPEC

These are the questions that need clear answers before the SPEC is written. Pope should think about each and Croupier can argue for defaults.

### Q1: Rune deck — auto-derived or manually set?

Riftbound has a 12-card rune deck *separate* from the main deck. The user can either:

(a) Auto-derive runes from the main deck (algorithmically suggest based on card colors used)
(b) Manually set rune composition with a 6-slider UI (one per color, sum = 12)
(c) Both, with the auto-derived version as a starting point that the user can override

**Recommendation: (c).** The auto-derived starting point teaches the user that runes should be aligned with their main deck. The override lets advanced users tune for specific scenarios (mana-fixing vs color consistency tradeoff).

### Q2: Search/filter — how aggressive?

The Riftbound card pool is currently small (one set), so simple keyword search is enough for v0.1. But the architecture decision matters:

(a) Client-side filter on a JSON blob of all cards (works at small scale, breaks at thousands of cards)
(b) Server-side search with API calls (more robust, requires backend complexity, slower for casual use)
(c) Hybrid — client-side primary index, server-side search for complex queries

**Recommendation: (a) for v0.1.** Riftbound's card pool will stay small enough for client-side for at least the first year. When it grows past ~2000 cards, revisit.

### Q3: Color identity / domain validation

Riftbound has color identity rules — a deck has a *domain* (color or color combination) and cards in the deck must match. The builder needs to:

(a) Enforce strictly (block illegal cards from being added)
(b) Warn but allow (show "this card is outside your domain" without blocking)
(c) Let users set "any colors" mode for experimental brews

**Recommendation: (b) with toggle for (a).** Defaults to lenient with clear warnings so casual users learn the rules without friction. Power users can enable strict mode.

### Q4: Deck name / metadata

For v0.1, what metadata does a deck have beyond cards?

(a) Just cards
(b) Cards + user-given name
(c) Cards + name + notes/description field
(d) Cards + name + notes + author handle (but no accounts)

**Recommendation: (b).** Name only. Notes is feature creep. Author handle implies accounts which we don't have. Keep it tight.

### Q5: URL encoding — what's in the link?

When user clicks "share deck," the URL contains:

(a) An ID pointing to server-stored deck (requires backend)
(b) The full decklist encoded in the URL (no backend, but long URLs)
(c) A hash + the decklist (clean URL, requires backend for resolution)

**Recommendation: (b).** No backend in v0.1 means no accounts to maintain, no servers to scale, no data privacy concerns. URL length is a real issue (a 40-card deck might create a 600-character URL) but base64 encoding helps and most TCG community deck-share tools work this way.

### Q6: Math panel — show what?

The Builder's value-add over Pastebin is *real-time math as you build*. But what specifically?

(a) Just the existing 12-cost mana curve (same as Pastebin)
(b) Mana curve + per-card "T_N cast probability" annotations on each card in the deck list
(c) Mana curve + deck color distribution + average cost + curve histogram

**Recommendation: (c).** The deck color distribution is fundamental info that's missing from the Pastebin. Average cost gives a one-glance deck-speed metric. Curve histogram is the "is my deck shaped right" visual. All three are derivable from the deck list with no extra inputs needed.

### Q7: Onboarding — first-time-user experience

A new user lands on `builder.witchtilt.com` for the first time. What do they see?

(a) Empty state with "start a new deck" CTA
(b) Empty state + 2-3 example decks they can click to load and explore
(c) Forced tutorial walkthrough on first visit

**Recommendation: (b).** Example decks teach the tool by demonstration without forcing tutorial pacing. Pick 3 diverse examples (mono-color aggro, two-color midrange, three-color combo) representing different builder philosophies.

---

## 6. Architecture decisions

### 6.1 Routes

- Main page: `builder.witchtilt.com/`
- Loaded deck: `builder.witchtilt.com/?deck=<base64>` (URL-decoded into deck state)
- Card library always visible at root

### 6.2 Code structure

```
app/
├── builder/
│   └── page.tsx              # the new builder route
├── components/
│   └── builder/
│       ├── card-library.tsx
│       ├── card-grid.tsx
│       ├── card-tile.tsx
│       ├── current-deck.tsx
│       ├── deck-list-item.tsx
│       ├── rune-deck-panel.tsx
│       ├── math-panel.tsx
│       ├── filter-bar.tsx
│       └── share-modal.tsx
└── lib/
    ├── card-database.ts      # client-side card data + indices
    ├── deck-encoder.ts       # base64 URL encoding/decoding
    └── deck-validator.ts     # domain rules, count limits, deck-size validation
```

Math reuse: `probabilityCanCast` from `lib/card-mode.ts` (existing v0.3 layer) called from `math-panel.tsx`.

### 6.3 Card data source

When Riot API key approval lands, the card database is fetched once at build time (or on page load with caching), turned into client-side JSON, and indexed for fast filtering. No live API calls during interaction.

### 6.4 State management

- Local state for current deck (React `useState` / `useReducer`)
- URL state for shareable decks (`useSearchParams` from Next.js)
- No global state library needed (Redux, Zustand) — scope doesn't warrant it
- No localStorage in v0.1 (defer to Ladder B v0.2)

### 6.5 Performance considerations

- Card library renders potentially hundreds of cards. Use virtualization (react-window or similar) only if perf testing shows it's needed
- Math panel re-computes on every deck change. Memoize aggressively
- Image loading for card art is the biggest perf risk; use Next.js `<Image>` with lazy loading + responsive sizes

---

## 7. Riot policy compliance (locked from earlier session)

The Builder must:

- Use ONLY Riot-provided assets (cards, art, rulesets) once API key is granted
- Display the fan-content disclaimer in footer (same as landing page)
- NOT publish meta data (play rates, win rates, popularity counts)
- NOT include in-app advertising
- NOT enable automated gameplay simulation
- NOT include skill-based matchmaking or leaderboards

**Reference**: `📜 Riftbound IP & Riot Digital Tools Policy` entry in Compendium.

---

## 8. Launch sequence (when SPEC is written and approved)

1. Wait for Riot API key approval ⏳
2. Set up Riot API integration: fetch card database, store as JSON build artifact
3. Build Ladder A in build order: card library → deck list → math panel → share encoding
4. Polish pass: example decks, mobile layout, share modal copy
5. Add `builder.witchtilt.com` subdomain to Vercel + CNAME in Cloudflare
6. Update the landing page Tools Grid: "Deck Builder" card flips from Coming Soon to Live
7. Optional: announcement video #2 or community Discord post

---

## 9. What's explicitly NOT this tool

Resist the impulse to bundle. These are separate tools that will get their own SPECs:

- **Main Deck Probability Calculator** — math for drawing specific cards from main deck (separate from rune math). Item #4 on the original Tool Roadmap.
- **Pack EV / Collection Tracker** — pack-opening expected value math + collection inventory.
- **Draft Simulator** — drafting practice. Likely requires deeper API integration and Riot case-by-case approval.
- **Resolution Order Sequencer** — stack interaction walkthrough tool.

Each deserves its own SPEC. Don't let "while we're here" extend Deck Builder scope.

---

## 10. Pre-SPEC checklist (for next session)

Before writing SPEC_deckbuilder_v0.1.md, Pope should:

1. Confirm Riot API key approval status (if not yet approved, defer this work)
2. Pick answers for Q1–Q7 in section 5 (or accept Croupier's recommendations)
3. Confirm Ladder A is the right scope (don't expand to B/C without decision)
4. Confirm Approach 3 (hybrid UX) is the right direction
5. Verify the witchtilt-tools repo is healthy (no pending merges, no stale branches)

Then Croupier writes the SPEC in the same pattern as SPEC_v0.3, SPEC_decks_v0.1, SPEC_landing_v0.1.

---

**Filed 2026-05-11** at end of Croupier session (Day 1 of WitchTilt launch sprint). Not yet a SPEC — strategy notes only. Promote when next-session block begins.
