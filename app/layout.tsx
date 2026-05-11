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
      <body>{children}</body>
    </html>
  );
}
