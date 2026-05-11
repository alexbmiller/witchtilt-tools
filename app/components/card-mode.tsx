"use client";

export default function CardMode() {
  return (
    <section className="mb-12 rounded-sm border border-ink-700 bg-ink-900/60 p-6">
      <h2 className="font-mono text-xs uppercase tracking-wider text-ink-400">
        Card mode — under construction
      </h2>
      <p className="mt-3 max-w-prose font-mono text-xs leading-relaxed text-ink-300">
        Soon: type a card cost (like <span className="text-ink-100">2RR</span>), pick your deck&apos;s
        color split, and see whether you can actually pay it by turn N. Multi-color AND queries,
        generic + colored cost, the works.
      </p>
      <p className="mt-3 max-w-prose font-mono text-xs leading-relaxed text-ink-500">
        For now, switch to <span className="text-ink-300">Rune mode</span> (toggle above) for the
        v0.2 calculator — color-count probabilities by turn, with recycling-aware mid-game.
      </p>
    </section>
  );
}
