export default function Footer() {
  return (
    <footer className="border-t border-ink-700 px-6 py-10">
      <div className="mx-auto flex max-w-4xl flex-col gap-2 font-mono text-xs text-ink-500">
        <p>&copy; 2026 WitchTilt.</p>
        <p>
          <a
            href="https://youtube.com/@witchtilt"
            target="_blank"
            rel="noopener noreferrer"
            className="transition hover:text-accent"
          >
            YouTube
          </a>
        </p>
        <p>
          <a
            href="https://github.com/alexbmiller/witchtilt-tools"
            target="_blank"
            rel="noopener noreferrer"
            className="transition hover:text-accent"
          >
            Source on GitHub
          </a>
        </p>
        <p className="mt-2 max-w-prose text-[11px] italic leading-relaxed text-ink-600">
          WitchTilt was created under Riot Games&rsquo; &ldquo;Legal Jibber Jabber&rdquo; policy using assets owned by Riot Games. Riot Games does not endorse or sponsor this project.
        </p>
      </div>
    </footer>
  );
}
