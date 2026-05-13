import type { Metadata } from "next";
import { IM_Fell_English_SC } from "next/font/google";
import "./globals.css";

const display = IM_Fell_English_SC({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  adjustFontFallback: false,
});

export const metadata: Metadata = {
  title: "Rune Odds — Riftbound TCG Probability Calculator",
  description:
    "Calculate the probability of drawing the runes you need in Riftbound. Hypergeometric math for the LoL TCG.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={display.variable}>
      <body>
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}

function SiteHeader() {
  return (
    <header className="border-b border-ink-800/70">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
        <a
          href="https://witchtilt.com"
          className="font-mono text-sm tracking-[0.2em] text-ink-200 transition hover:text-accent"
        >
          WITCHTILT
        </a>
        <nav>
          <a
            href="https://runes.witchtilt.com"
            className="font-mono text-xs text-ink-400 transition hover:text-ink-100 sm:text-sm"
          >
            Rune Odds
          </a>
        </nav>
      </div>
    </header>
  );
}
