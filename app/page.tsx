"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import RuneMode from "./components/rune-mode";
import CardMode from "./components/card-mode";

type Mode = "card" | "rune";

const ACTIVE_BTN = "border-accent bg-accent/10 text-accent";
const INACTIVE_BTN = "border-ink-700 text-ink-300 hover:border-ink-600 hover:text-ink-100";

function Page() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const mode: Mode = searchParams.get("mode") === "rune" ? "rune" : "card";

  function changeMode(next: Mode) {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "card") params.delete("mode");
    else params.set("mode", "rune");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return (
    <main className="min-h-screen px-4 py-10 sm:py-16">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <header className="mb-10 border-b border-ink-700 pb-6">
          <div className="flex items-baseline justify-between">
            <h1 className="font-mono text-xl tracking-tight text-ink-100">
              <span className="text-accent">RUNE</span>
              <span className="text-ink-400">/</span>
              <span>ODDS</span>
            </h1>
            <span className="font-mono text-xs text-ink-500">v0.3 · riftbound tcg</span>
          </div>
          <p className="mt-3 max-w-prose text-sm text-ink-300">
            Hypergeometric probability for a 12-card rune deck. Tells you the odds of drawing what
            you need by the turn you need it.
          </p>
        </header>

        {/* Top-level mode toggle: Card (default) vs Rune (v0.2 UI) */}
        <section className="mb-8">
          <div className="grid w-full grid-cols-2 gap-2 sm:w-72">
            <button
              onClick={() => changeMode("card")}
              aria-pressed={mode === "card"}
              className={`rounded-sm border px-3 py-2 font-mono text-sm transition ${mode === "card" ? ACTIVE_BTN : INACTIVE_BTN}`}
            >
              Card mode
            </button>
            <button
              onClick={() => changeMode("rune")}
              aria-pressed={mode === "rune"}
              className={`rounded-sm border px-3 py-2 font-mono text-sm transition ${mode === "rune" ? ACTIVE_BTN : INACTIVE_BTN}`}
            >
              Rune mode
            </button>
          </div>
        </section>

        {mode === "card" ? <CardMode /> : <RuneMode />}

        {/* Footer */}
        <footer className="border-t border-ink-700 pt-6 font-mono text-xs text-ink-500">
          <p>
            Built for Riftbound players. Math: hypergeometric distribution over a 12-card rune deck.
          </p>
          <p className="mt-1">
            Not affiliated with Riot Games or UVS Games. Riftbound is a trademark of Riot Games.
          </p>
        </footer>
      </div>
    </main>
  );
}

export default function Home() {
  // useSearchParams requires a Suspense boundary for static rendering.
  return (
    <Suspense fallback={null}>
      <Page />
    </Suspense>
  );
}
