import type { Metadata } from "next";
import DecklistInput from "../components/decks/decklist-input";
import Footer from "../components/landing/footer";

export const metadata: Metadata = {
  title: "Deck Pastebin — WitchTilt",
  description:
    "Paste a Riftbound decklist. See the mana curve and rune-pool probabilities for that exact deck.",
};

export default function DecksPage() {
  return (
    <main className="min-h-screen flex flex-col">
      <div className="flex-1 px-4 py-10 sm:py-16">
        <div className="mx-auto max-w-3xl">
          <header className="mb-10 border-b border-ink-700 pb-6">
            <div className="flex items-baseline justify-between">
              <h1 className="font-mono text-xl tracking-tight text-ink-100">
                <span className="text-accent">DECK</span>
                <span className="text-ink-400">/</span>
                <span>PASTEBIN</span>
              </h1>
              <span className="font-mono text-xs text-ink-500">v0.1 · riftbound tcg</span>
            </div>
            <p className="mt-3 max-w-prose text-sm text-ink-300">
              Paste a Riftbound decklist. We extract the rune pool and show you the probability of
              casting representative costs by each turn.
            </p>
          </header>

          <DecklistInput />
        </div>
      </div>
      <Footer />
    </main>
  );
}
