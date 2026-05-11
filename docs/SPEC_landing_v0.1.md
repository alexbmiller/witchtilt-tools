# Landing Page v0.1 — Architecture Spec

**Scope**: The page that lives at `witchtilt.com/` after the post-v0.3 cleanup. Branded hero, tools grid, channel link, footer. Static. No backend.

**Status**: spec frozen 2026-05-11. Build after the post-v0.3 cleanup work block ships subdomains; before Deck Pastebin v0.1.

**Position in launch architecture**:
- `witchtilt.com` — **this page** (landing)
- `runes.witchtilt.com` — Rune Odds v0.3 (calculator)
- `decks.witchtilt.com` — Deck Pastebin v0.1 (companion tool)

---

## 1. What this page does (and doesn't)

### Does
- Establishes the WitchTilt brand identity to first-time visitors
- Surfaces live tools with direct links
- Teases upcoming tools so visitors understand this is a platform, not a one-off
- Provides a single discoverable link to the YouTube channel
- Loads fast, renders correctly on mobile, looks good in screenshots

### Does NOT (out of scope for v0.1)
- Email capture / newsletter signup (no backend, no list yet)
- Search or filtering across tools
- Blog or article content
- Animated hero sequences, video backgrounds, parallax effects
- Tool ratings, "trending" indicators, view counts
- Login or accounts
- Cookie banners (no tracking)

---

## 2. Page anatomy (top to bottom)

### 2.1 Hero

A single screen of content. Sets the brand on first paint.

**Contains:**
- The hexagonal sigil logo (existing SVG asset, ~120px square)
- Wordmark below or beside it: "WitchTilt" in the locked typography
- One-line tagline below the wordmark
- A small "→ YouTube" link or button below the tagline

**Tagline copy** (locked): **"Tools and arguments for trading card players."**

Rationale: "tools and arguments" signals both the calculator side and the debate-comedy content angle. "Trading card players" is broader than Riftbound, leaving room for future games without overpromising. Six words, two stressed beats, on-aesthetic.

**Mood**: dark background (locked `#0a0b0d`), gold accents (locked `#d4af37`), generous whitespace. No background image. The sigil + wordmark + tagline should feel like a stamped insignia, not a marketing page.

### 2.2 Tools grid

Three rows of two cards on desktop. Single column on mobile. Each card represents one tool — live or coming soon.

**Layout**: CSS grid, equal-height cards, ~16px gap. Cards should feel like physical artifacts (slightly raised border, hover-state subtle lift), not floating buttons.

**Live tool cards (v0.1 has two):**

Card 1: **Rune Odds**
- Status badge: "Live" (small, gold)
- Title
- One-line description: *"How likely are you to channel the colors you need by turn N?"*
- Tagline-style detail: "Hypergeometric math for the 12-card rune deck."
- Click → links to `https://runes.witchtilt.com`

Card 2: **Deck Pastebin**
- Status badge: "Live" (small, gold)
- Title
- One-line description: *"Paste your decklist. See your mana curve."*
- Tagline-style detail: "Real decks, real probabilities."
- Click → links to `https://decks.witchtilt.com`

**Coming Soon cards (v0.1 has four):**

Each shows: Status badge ("Coming Soon", muted gray), title, one-line description, no link (or muted/disabled click state).

- **Deck Builder** — "Build decks with live odds as you go."
- **Pack EV Calculator** — "Track packs you open. See if you're winning or losing."
- **Draft Simulator** — "Practice Riftbound drafts against the bot."
- **Resolution Sequencer** — "Walk through tricky stack interactions step by step."

Order: Live cards first (Rune Odds, Deck Pastebin), then Coming Soon in roughly the order they'll ship (Deck Builder is highest priority, Pack EV next, etc).

**No card should be more than 100 words total.** Brevity reads as confidence.

### 2.3 About strip (one short paragraph)

Between the tools grid and the footer, a single short paragraph that frames the project. Not a manifesto.

**Copy** (draft, to be reviewed):

> WitchTilt is one person building tools and content for trading card games. The math is real. The takes are genuine. New tools ship when they're ready, not on a schedule. If you want to know when something new lands, [subscribe on YouTube](https://youtube.com/@witchtilt).

This block is intentionally small. ~50 words. One link, to YouTube.

### 2.4 Footer

Four lines, muted color, small text.

- Line 1: Copyright + year + name. `© 2026 WitchTilt. Built by Alex Miller.`
- Line 2: `YouTube` (linked). TikTok / Instagram / X added once the first video launches and handles are confirmed.
- Line 3: `Source on GitHub` link to the witchtilt-tools repo.
- Line 4 (Riot fan content disclaimer, required per Riot's Legal Jibber Jabber Section 6, even smaller / more muted than the other lines):
  > *WitchTilt was created under Riot Games' "Legal Jibber Jabber" policy using assets owned by Riot Games. Riot Games does not endorse or sponsor this project.*

Keep it spare. No "navigation," no "company," no "legal." We don't have those things — but the Riot disclaimer is non-negotiable for any tool referencing Riftbound's name or game terms.

---

## 3. Visual design constraints

- **Color palette** (locked from Brand Kit): primary background `#0a0b0d`, primary text `#e8e6e0` (near-white), accent gold `#d4af37`, muted text `#888780`. Reuse the CSS variables that already exist in the witchtilt-tools styling.
- **Typography**: IM Fell English SC for the wordmark only (loaded via `next/font/google`, self-hosted at build time). Inter (or system sans) for everything else. Sizes: hero tagline 18px, tool card titles 20px medium, body 16px, footer 13px.
- **Spacing**: generous. Hero takes a full viewport height on desktop (`min-height: 80vh` is fine). Tools grid has at least 80px above and below.
- **No images** other than the sigil SVG. No icons inside tool cards. Status badges are CSS, not icons.
- **No animations beyond `transition` on hover states.** No scroll-triggered effects.
- **Mobile**: single column. Hero stays full-screen but content recenters. Tool cards stack vertically with same internal layout.

---

## 4. Code architecture

```
app/
├── page.tsx                     # the new landing page (replaces current root)
└── components/
    └── landing/
        ├── hero.tsx
        ├── tools-grid.tsx
        ├── tool-card.tsx        # used for both live + coming-soon
        ├── about-strip.tsx
        └── footer.tsx
```

Server component is fine — there's no client-side state on this page. No useState, no useEffect, no client directives unless something specifically requires it (which it shouldn't).

Tool data lives in a simple constant in `tools-grid.tsx`:

```typescript
type ToolStatus = "live" | "coming-soon";

interface Tool {
  title: string;
  description: string;
  detail: string;
  status: ToolStatus;
  href?: string; // only for live tools
}

const TOOLS: Tool[] = [
  {
    title: "Rune Odds",
    description: "How likely are you to channel the colors you need by turn N?",
    detail: "Hypergeometric math for the 12-card rune deck.",
    status: "live",
    href: "https://runes.witchtilt.com",
  },
  // ... etc
];
```

When future tools ship, we add them by changing the constant — no other code touches.

---

## 5. SEO + metadata

Set `metadata` export in `app/page.tsx`:

```typescript
export const metadata = {
  title: "WitchTilt — Tools for trading card players",
  description: "Hypergeometric probability tools, deck analysis, and TCG content. Built for Riftbound and beyond.",
  openGraph: {
    title: "WitchTilt",
    description: "Tools and arguments for trading card players.",
    url: "https://witchtilt.com",
    siteName: "WitchTilt",
    images: [
      {
        url: "/og-image.png", // TODO: generate later, not blocking v0.1 launch
        width: 1200,
        height: 630,
      },
    ],
  },
};
```

`og-image.png` is a v0.1.1 follow-up, not blocking the initial ship. Without it, links shared on Discord/X show no preview — acceptable for launch, fix soon after.

---

## 6. Edge cases + gotchas

- **The "Source on GitHub" link** should not appear until the LICENSE files are in place across repos. Pope to drop those before the landing page goes live. If the link points at a repo that's still licensed-by-default-which-is-all-rights-reserved, that's misleading. Easy fix: add LICENSE files first, then ship landing page.
- **Live tool links use subdomain URLs** (`runes.witchtilt.com`, not `witchtilt.com/runes`). This assumes the subdomain rewrites are configured in Vercel before this page is publicly reachable. Order of operations enforces this — landing page ships AFTER cleanup block lands subdomains.
- **Coming Soon cards should not be clickable.** Make sure CSS for "coming-soon" status removes hover lift and cursor change. Visually they're real cards, but tapping does nothing. Don't fake-link them to `#`.
- **No external dependencies at runtime.** No analytics, no runtime font fetches. IM Fell English SC is loaded via `next/font/google`, which downloads and self-hosts the font at build time — no Google Fonts request from the user's browser.

---

## 7. Build order

1. Build `<Hero />` component. Ship to preview. Verify on mobile.
2. Build `<ToolCard />` (both states — live and coming-soon).
3. Build `<ToolsGrid />` using `<ToolCard />` and the TOOLS constant.
4. Build `<AboutStrip />` and `<Footer />`.
5. Assemble in `app/page.tsx` with metadata export.
6. Polish pass — verify mobile, verify all links work (live tools and YouTube), verify footer copy.

Ships when:
- All four sections render and look right on desktop + mobile
- Live tool links go to the correct subdomains and load the actual tools
- Coming Soon cards are visually consistent with live cards but not clickable
- Page loads instantly (no blocking network requests beyond fonts)
- The hero feels like a stamped insignia, not a marketing page

---

## 8. Non-goals (explicit OUT of scope for v0.1)

Resist scope creep:

- Email capture or newsletter form (no backend yet, and no list to send to)
- Search/filter across tools
- Tool ratings or popularity indicators
- Blog posts, articles, "latest update" feeds
- Animated transitions beyond CSS hover
- Hero background image, video, or parallax
- "About me" page, contact form, or any second page beyond `/`
- Analytics, tracking pixels, or cookie banner
- Anything that requires loading a JavaScript bundle for non-interactive content

All of these are v0.2+ candidates if the channel grows enough to warrant them. None of them ship in v0.1.

---

## 9. Done criteria

Landing page v0.1 ships when:

- Page renders correctly at `witchtilt.com/` after the cleanup block has subdomains live
- Hero displays sigil, wordmark, tagline, and YouTube link without overflow
- Tools grid shows two live cards (Rune Odds, Deck Pastebin) and four coming-soon cards
- About strip shows the short paragraph + YouTube link
- Footer shows the three lines correctly
- All live links work and go to the right destinations
- Mobile layout doesn't break (test at iPhone-13-mini width and standard phone width)
- Lighthouse performance score ≥95 (this is a static page; it should be fast)

---

## 10. Deployment

Branch `landing-page-v0.1` off main (cut after the cleanup block merges). Don't push to main until verified on preview.

The landing page replaces `app/page.tsx` content but doesn't touch `/runes` (that route already exists post-cleanup). So this branch is purely additive to the new structure — no destructive changes.

After merge: `witchtilt.com/` shows the landing page. `runes.witchtilt.com` continues to serve the calculator. `decks.witchtilt.com` 404s until the pastebin ships. That 404 is fine for the brief window; the Deck Pastebin card on the landing page should still link to it, accepting the short 404 window as the cost of shipping landing-then-pastebin instead of vice versa.

(Alternative order: ship pastebin first, *then* landing page. This avoids the 404 window. But the landing page is simpler than the pastebin, so shipping landing first gives faster psychological momentum. Pope to decide. Both orders are defensible.)
