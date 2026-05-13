import type { Metadata } from "next";
import Footer from "../components/landing/footer";

export const metadata: Metadata = {
  title: "Deck Builder — Coming Soon — WitchTilt",
  description:
    "A real Riftbound Deck Builder is coming to decks.witchtilt.com. Gated on the Riot Developer API key. Pastebin functionality moved into Rune Odds.",
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
                <span>BUILDER</span>
              </h1>
              <span className="font-mono text-xs text-ink-500">coming soon</span>
            </div>
            <p className="mt-3 max-w-prose text-sm text-ink-300">
              A real Deck Builder is what&rsquo;ll live here — drag-and-drop card selection, full
              validation, integrated rune odds. It&rsquo;s gated on the Riot Developer API key (the
              card database we need to actually know what cards exist). No ETA on approval. When it
              lands, this is the next standalone tool.
            </p>
          </header>

          <section className="space-y-6">
            <div className="rounded-sm border border-ink-700 px-5 py-5">
              <div className="font-mono text-xs uppercase tracking-wider text-ink-400">
                Looking for the Deck Pastebin?
              </div>
              <p className="mt-2 max-w-prose text-sm text-ink-300">
                Paste-a-decklist-see-the-curve moved into Rune Odds. Same parser, same math, one
                fewer tab.
              </p>
              <a
                href="https://runes.witchtilt.com?mode=deck"
                className="mt-4 inline-flex items-center gap-2 rounded-sm border border-ink-700 px-4 py-2 font-mono text-sm text-ink-200 transition hover:border-accent hover:text-accent"
              >
                <span aria-hidden="true">→</span> Rune Odds · Deck mode
              </a>
            </div>

            <p className="font-mono text-xs text-ink-500">
              Watching for Riot API approval. Check{" "}
              <a href="https://witchtilt.com" className="text-ink-300 hover:text-accent">
                witchtilt.com
              </a>{" "}
              for updates.
            </p>
          </section>
        </div>
      </div>
      <Footer />
    </main>
  );
}
