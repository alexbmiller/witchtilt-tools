export default function AboutStrip() {
  return (
    <section className="border-t border-ink-700 px-6 py-16">
      <div className="mx-auto max-w-2xl">
        <p className="text-base leading-relaxed text-ink-200">
          WitchTilt is one person building tools and content for trading card games.
          The math is real. The takes are genuine. New tools ship when they&rsquo;re ready,
          not on a schedule. If you want to know when something new lands,{" "}
          <a
            href="https://youtube.com/@witchtilt"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent underline-offset-4 hover:underline"
          >
            subscribe on YouTube
          </a>
          .
        </p>
      </div>
    </section>
  );
}
