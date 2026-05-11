# CLAUDE.md — witchtilt-tools

Per-repo bootstrap. Future Claude Code sessions read this first.

Cross-references:
- Project HQ in Notion: https://www.notion.so/3586b24433768182a15ffac7f3beac3e (Riftbound Channel HQ; Tool Roadmap and Brand Kit are sub-pages).
- v0.3 architecture spec: `docs/SPEC_v0.3.md` (frozen 2026-05-11; color codes, cost grammar, multivariate model, build order).
- Strategic / scope decisions: the "Croupier" chat in Claude Desktop. Larger-scope project direction is decided there, not in this repo. Flag apparent contradictions rather than silently overriding.

---

## Project overview

This repo (renamed from `riftbound-runes` → `witchtilt-tools` on 2026-05-11) is **Rune Odds**, a hypergeometric probability calculator for the Riftbound TCG's 12-card rune deck. It's the first tool under the **WitchTilt** YouTube channel + tools umbrella. The channel covers Riftbound and broader card-game strategy with a debate-comedy voice; the tools exist partly for the channel's content and partly as standalone player utilities.

Live at **https://www.witchtilt.com** — canonical, custom domain via Cloudflare Registrar (acquired 2026-05-09).

Currently single-page. Site buildout to a landing → tools → individual-tool-pages structure (with the calculator moving to `runes.witchtilt.com`) is on the roadmap.

---

## Tech stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Tests**: Vitest (`npm test` one-shot, `npm run test:watch` for watch)
- **Icons**: lucide-react (used sparingly — currently just the header Info icon)
- **Repo**: https://github.com/alexbmiller/witchtilt-tools
- **Deployment**: Vercel, auto-deploys on push to `main`. Treat `main` as production; feature work goes on branches.
- **DNS**: Cloudflare manages witchtilt.com; A + CNAME records point root and www to Vercel (DNS-only proxy mode, NOT orange-cloud).
- **Email**: `contact@witchtilt.com` → forwards to `witchtilt@gmail.com` via Cloudflare Email Routing (inbound-only).
- **Dependencies**: minimal — Next.js, React, Tailwind, lucide-react. Hypergeometric math implemented from scratch (no library).

---

## Critical math model — DO NOT MIS-IMPLEMENT

The rune deck is **12 cards, sealed pre-game**.

**Channel counts by turn** (verified against official Riftbound sources — do not change):
- Going first: **2** on T1, +2 each subsequent turn (T2: 4, T3: 6, ...).
- Going second: **3** on T1, +2 each subsequent turn (T2: 5, T3: 7, ...).
- Cumulative channeling capped at remaining unknown deck size.

**Color codes** (single letters, per SPEC §1):
- `R` = Red / Fury · `B` = Blue / Mind · `P` = Purple / Chaos
- `O` = Orange / Body · `G` = Green / Calm · `Y` = Yellow / Order

**Two top-level modes** (v0.3+):
1. **Card mode** (default) — input is a parsed card cost (e.g. `2RR`) + per-color deck composition. Uses **multivariate** hypergeometric to compute P(can cast cost by turn N). Generic mana is a separate hand-size check; color requirements run through the multivariate sum over the deck partition.
2. **Rune mode** — v0.2 calculator, preserved verbatim. Single-color "≥k by turn N" queries.

Each mode has **Deckbuilding** and **Mid-game** sub-modes:
- **Deckbuilding**: fresh, full 12-card deck.
- **Mid-game**: sample is the unknown pile only. Rows where draws would reach the buried/recycled segment are flagged ⚠. Card-mode mid-game is **conservative on color** — already-channeled runes pay generic but don't contribute to color requirements (see `lib/card-mode.ts` docstring).

**Recycling rule**: runes recycled mid-game go to the **exact bottom** of the rune deck (triggered by paying Power costs as a gameplay action). They are unreachable until everything above them has been channeled. The deck cycles continuously — never reshuffled, never restored to fresh.

**Hypergeometric formula** (canonical, univariate — Rune mode):

```
P(≥k targets in n draws) = 1 - Σ_{i=0..k-1} [C(K, i) × C(N-K, n-i)] / C(N, n)
```

**Multivariate PMF** (Card mode):

```
P(X_1=k_1, ..., X_m=k_m) = [Π C(K_i, k_i)] / C(N, n)
```

Summed over all (k_c) where k_c ≥ r_c for required colors. Non-required colors collapse into a single "rest" group for efficiency.

**Implementation note**: `binom()` in `lib/probability.ts` uses BigInt to avoid floating-point error on integer combinatorics, converting to Number only at the final division. Both `lib/probability.ts` (Rune mode) and `lib/multivariate.ts` (Card mode) reuse the same memoized export. Don't "simplify" it back to plain Math.

---

## Locked rules — do not reintroduce earlier mistakes

- **No opening hand of runes.** The 4-card opening hand comes from the **main deck**, not the rune deck. Channeling starts T1 and only T1.
- **No "shuffle on recycle".** Recycling goes to bottom, deterministically. Don't model it as a re-randomization.
- **Don't assume the rune deck depletes naturally.** It only changes via recycling. Without recycling actions, the same 12 cards rotate over the course of a game.
- **Don't change the going-first / going-second channel counts.**
- **Cost-color mapping is canonical**: R/B/P/O/G/Y → Red/Blue/Purple/Orange/Green/Yellow → Fury/Mind/Chaos/Body/Calm/Order. Don't reorder or rename.

---

## Architecture

```
witchtilt-tools/
├── app/                          # Next.js App Router
│   ├── page.tsx                  # Shell: header, mode toggle (URL-synced), footer
│   ├── layout.tsx                # Root layout
│   ├── globals.css               # Tailwind directives + global styles
│   └── components/
│       ├── card-mode.tsx         # Card mode body (v0.3): cost input, deck/pile, table
│       ├── rune-mode.tsx         # Rune mode body (v0.2 verbatim)
│       ├── info-popover.tsx      # Header info popover (lucide Info icon)
│       └── shared.ts             # ACTIVE_BTN / INACTIVE_BTN / pct / heatColor
├── lib/
│   ├── probability.ts            # v0.2 univariate hypergeom + mid-game pile math + binom (exported)
│   ├── cost-parser.ts            # Card cost grammar (Color types, parseCost)
│   ├── multivariate.ts           # multivariateHypergeom over named colors
│   ├── card-mode.ts              # probabilityCanCast + probabilityCanCastMidGame wrappers
│   └── __tests__/                # Vitest suite (59 tests as of v0.3)
├── docs/
│   └── SPEC_v0.3.md              # v0.3 architecture spec (frozen 2026-05-11)
├── tailwind.config.js            # ink-* scale + accent (muted gold #d4af37)
├── next.config.js
├── tsconfig.json
├── package.json
├── CHANGELOG.md
├── NEXT.md                       # Cross-session handoff notes
└── README.md
```

Page layout is a thin shell. Mode-specific UI lives in its own component file. `shared.ts` holds cross-component style constants and number-formatting helpers — extend it rather than re-duplicating them in new components.

---

## How to run locally

```bash
npm install
npm run dev          # http://localhost:3000
npm test             # 59 vitest tests, one-shot
```

Other scripts:
- `npm run build` — production build
- `npm run start` — serve production build
- `npm run lint` — Next.js lint
- `npm run test:watch` — vitest watch mode

Math layer tests live in `lib/__tests__/`. Run `npm test` before pushing math changes; UI changes verify in the browser (or on the Vercel preview for the active branch).

---

## Conventions

- **TypeScript everywhere.** No `.js` source files in `app/` or `lib/`.
- **Tailwind utility classes only.** No CSS modules, no styled-components, no UI component libraries. (lucide-react for icons is fine — icons, not components.)
- **Separation of concerns**: math stays in `lib/`; UI stays in `app/components/`. Pure functions in `lib/`, no React state. Don't mix.
- **No comments explaining what code does.** Math functions are the exception — comment the model thoroughly.
- **Page layout order is fixed**: header → mode toggle → mode body → footer. Mode-body order is fixed per mode (see component files).

### Visual style

Near-black background · muted gold accent (`text-accent`, `border-accent`) · monospace for all numbers · sharp corners (`rounded-sm`) · no animations. Mobile-first — tables use `overflow-x-auto`, deck-input grids use 2-col / 3-col responsive layout.

- Active button: `border-accent bg-accent/10 text-accent`
- Inactive button: `border-ink-700 text-ink-300 hover:border-ink-600 hover:text-ink-100`

Brand colors live in `tailwind.config.js`: `ink-100`..`ink-950` (with `ink-950 = #0a0b0d` for backgrounds), `accent = #d4af37` (muted gold), `accent-dim = #8a7427`. Full brand kit is linked from Notion HQ.

### Voice (for any UI copy)

Confident, slightly nerdy, slightly funny. Comedy-debate energy. Not corporate, not cutesy. See the existing explainer copy in `app/components/rune-mode.tsx` and the empty-state in `app/components/card-mode.tsx` as the reference register.

---

## Roadmap (active queue; see Tool Roadmap in Notion for the full list)

1. **v0.3 (shipped)** — Card mode with multi-color AND queries, multivariate hypergeom, Card-mode mid-game support, info popover, Vitest suite, repo rename.
2. **v0.3.x** — polish + bugfixes as users surface them.
3. **Site buildout** — landing page at root, calculator moves to `runes.witchtilt.com`, "tools" nav for future additions.
4. **Deck Builder** — separate tool, drag-and-drop card selection + deck validation + integrated Rune Odds inline.
5. Pack EV / Collection Tracker, Main Deck Probability Calculator, Resolution Order Sequencer, Draft Simulator — all queued.

---

## For future Claude Code sessions

1. Read this CLAUDE.md first.
2. Open the project HQ in Notion (linked at top) for strategic context and current priorities.
3. Strategic / scope changes usually originate in the Croupier chat in Claude Desktop — flag apparent contradictions rather than silently overriding.
4. Check the Tool Roadmap for what's next.
5. If touching the math layer, re-read **Critical math model** + **Locked rules** above, and run `npm test` to catch regressions.
6. Don't relitigate locked decisions (math model, brand colors, color codes, voice) without explicit user request.
