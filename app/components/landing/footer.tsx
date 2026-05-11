export default function Footer() {
  return (
    <footer className="border-t border-ink-700 px-6 py-10">
      <div className="mx-auto flex max-w-4xl flex-col gap-2 font-mono text-xs text-ink-500">
        <p>&copy; 2026 WitchTilt. Built by Alex Miller.</p>
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
      </div>
    </footer>
  );
}
