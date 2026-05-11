# CLAUDE.md — riftbound-runes

Per-repo bootstrap. Future Claude Code sessions read this first.

Cross-references:
- Project HQ in Notion: https://www.notion.so/3586b24433768182a15ffac7f3beac3e (Riftbound Channel HQ; Tool Roadmap and Brand Kit are sub-pages).
- Strategic / scope decisions: the "Croupier" chat in Claude Desktop. Larger-scope project direction is decided there, not in this repo. Flag apparent contradictions rather than silently overriding.

---

## Project overview

This repo is **Rune Odds**, a hypergeometric probability calculator for the Riftbound TCG's 12-card rune deck. It's the first tool under the **WitchTilt** YouTube channel + tools umbrella. The channel covers Riftbound and broader card-game strategy with a debate-comedy voice; the tools exist partly for the channel's content and partly as standalone player utilities.

Live at:
- **https://www.witchtilt.com** — canonical, custom domain via Cloudflare Registrar (acquired 2026-05-09).
- **https://riftbound-runes.vercel.app/** — stable Vercel fallback URL.

Currently single-page. Site buildout to a landing → tools → individual-tool-pages structure (with the calculator moving to `runes.witchtilt.com`) is on the roadmap.

---

## Tech stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Repo**: https://github.com/alexbmiller/riftbound-runes
- **Deployment**: Vercel, auto-deploys on push to `main`. Treat `main` as production; feature work goes on branches.
- **DNS**: Cloudflare manages witchtilt.com; A + CNAME records point root and www to Vercel (DNS-only proxy mode, NOT orange-cloud).
- **Email**: `contact@witchtilt.com` → forwards to `witchtilt@gmail.com` via Cloudflare Email Routing (inbound-only).
- **Dependencies**: minimal — Next.js, React, Tailwind. Hypergeometric math implemented from scratch (no library).

---

## Critical math model — DO NOT MIS-IMPLEMENT

The rune deck is **12 cards, sealed pre-game**.

**Channel counts by turn** (verified against official Riftbound sources — do not change):
- Going first: **2** on T1, +2 each subsequent turn (T2: 4, T3: 6, ...).
- Going second: **3** on T1, +2 each subsequent turn (T2: 5, T3: 7, ...).
- Cumulative channeling capped at remaining unknown deck size.

**Two calculator modes:**
1. **Deckbuilding** (default) — assumes a fresh, full 12-card deck. Inputs: target color count + turn order. Outputs: P(≥1 / ≥2 / ≥3 / ≥4 target runes) by end of each turn.
2. **Mid-game (v0.2)** — recycling-aware. Inputs: target count in unknown pile + pile size + current turn + turn order. Outputs scoped to the remaining unknown segment only. Rows where draws would reach the buried/recycled segment are flagged ⚠.

**Recycling rule** (resolved in v0.2): runes recycled mid-game go to the **exact bottom** of the rune deck (triggered by paying Power costs as a gameplay action). They are unreachable until everything above them has been channeled. The deck cycles continuously — never reshuffled, never restored to fresh.

**Hypergeometric formula** (canonical):

```
P(≥k targets in n draws) = 1 - Σ_{i=0..k-1} [C(K, i) × C(N-K, n-i)] / C(N, n)
```

where N = deck size, K = target count in deck, n = draws.

**Implementation note**: `binom()` in `lib/probability.ts` uses BigInt to avoid floating-point error on integer combinatorics, converting to Number only at the final division. Don't "simplify" it back to Math.

---

## Locked rules — do not reintroduce earlier mistakes

- **No opening hand of runes.** The 4-card opening hand comes from the **main deck**, not the rune deck. Channeling starts T1 and only T1.
- **No "shuffle on recycle".** Recycling goes to bottom, deterministically. Don't model it as a re-randomization.
- **Don't assume the rune deck depletes naturally.** It only changes via recycling. Without recycling actions, the same 12 cards rotate over the course of a game.
- **Don't change the going-first / going-second channel counts.**

---

## Architecture

```
riftbound-runes/
├── app/                    # Next.js App Router
│   ├── page.tsx            # Entire calculator UI (both modes; no sub-routes)
│   ├── layout.tsx          # Root layout
│   └── globals.css         # Tailwind directives + global styles
├── lib/
│   └── probability.ts      # All hypergeometric math; no UI imports
├── tailwind.config.js      # ink-* scale + accent (muted gold #d4af37)
├── next.config.js
├── tsconfig.json
├── package.json
├── CHANGELOG.md
├── NEXT.md                 # Cross-session handoff notes
└── README.md
```

UI is intentionally one file (`app/page.tsx`). There is no `components/` directory; don't add one without a real reason.

---

## How to run locally

```bash
npm install
npm run dev          # http://localhost:3000
```

Other scripts:
- `npm run build` — production build
- `npm run start` — serve production build
- `npm run lint` — Next.js lint

No test suite. Verify behavior in the browser; the math layer is small enough to spot-check by hand against the formula above.

---

## Conventions

- **TypeScript everywhere.** No `.js` source files in `app/` or `lib/`.
- **Tailwind utility classes only.** No CSS modules, no styled-components, no UI component libraries.
- **Separation of concerns**: math stays in `lib/probability.ts`; UI stays in `app/page.tsx`. Pure functions in `lib/`, no React state. Don't mix.
- **No comments explaining what code does.** Math functions are the exception — comment the model thoroughly.
- **Page layout order is fixed**: header → mode switcher → controls → explainer → table → share → footer. Don't restructure without a reason.

### Visual style

Near-black background · muted gold accent (`text-accent`, `border-accent`) · monospace for all numbers · sharp corners (`rounded-sm`) · no animations. Mobile-first — tables use `overflow-x-auto`.

- Active button: `border-accent bg-accent/10 text-accent`
- Inactive button: `border-ink-700 text-ink-300 hover:border-ink-600 hover:text-ink-100`

Brand colors live in `tailwind.config.js`: `ink-100`..`ink-950` (with `ink-950 = #0a0b0d` for backgrounds), `accent = #d4af37` (muted gold), `accent-dim = #8a7427`. Full brand kit is linked from Notion HQ.

### Voice (for any UI copy)

Confident, slightly nerdy, slightly funny. Comedy-debate energy. Not corporate, not cutesy. See the existing explainer copy in `app/page.tsx` as the reference register.

---

## Roadmap (active queue; see Tool Roadmap in Notion for the full list)

1. **v0.3** — multi-color queries (e.g., "P(≥1 Red AND ≥1 Blue by T2)") and domain requirements for specific cards.
2. **Site buildout** — landing page at root, calculator moves to `runes.witchtilt.com`, "tools" nav for future additions.
3. **Deck Builder** — separate tool, drag-and-drop card selection + deck validation + integrated Rune Odds inline.
4. Pack EV / Collection Tracker, Main Deck Probability Calculator, Resolution Order Sequencer, Draft Simulator — all queued.

---

## For future Claude Code sessions

1. Read this CLAUDE.md first.
2. Open the project HQ in Notion (linked at top) for strategic context and current priorities.
3. Strategic / scope changes usually originate in the Croupier chat in Claude Desktop — flag apparent contradictions rather than silently overriding.
4. Check the Tool Roadmap for what's next.
5. If touching the math layer, re-read **Critical math model** + **Locked rules** above.
6. Don't relitigate locked decisions (math model, brand colors, naming, voice) without explicit user request.
