import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rune Odds — Riftbound TCG Probability Calculator",
  description:
    "Calculate the probability of drawing the runes you need in Riftbound. Hypergeometric math for the LoL TCG.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
