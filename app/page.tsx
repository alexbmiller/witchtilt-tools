import type { Metadata } from "next";
import Hero from "./components/landing/hero";
import ToolsGrid from "./components/landing/tools-grid";
import AboutStrip from "./components/landing/about-strip";
import Footer from "./components/landing/footer";

export const metadata: Metadata = {
  title: "WitchTilt — Tools for trading card players",
  description:
    "Hypergeometric probability tools, deck analysis, and TCG content. Built for Riftbound and beyond.",
  openGraph: {
    title: "WitchTilt",
    description: "Tools and arguments for trading card players.",
    url: "https://witchtilt.com",
    siteName: "WitchTilt",
  },
};

export default function Home() {
  return (
    <main>
      <Hero />
      <ToolsGrid />
      <AboutStrip />
      <Footer />
    </main>
  );
}
