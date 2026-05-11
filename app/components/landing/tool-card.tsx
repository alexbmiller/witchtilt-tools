export type ToolStatus = "live" | "coming-soon";

export interface Tool {
  title: string;
  description: string;
  detail?: string;
  status: ToolStatus;
  href?: string;
}

export default function ToolCard({ tool }: { tool: Tool }) {
  const isLive = tool.status === "live";

  const inner = (
    <>
      <span
        className={`font-mono text-[10px] uppercase tracking-[0.18em] ${
          isLive ? "text-accent" : "text-ink-500"
        }`}
      >
        {isLive ? "Live" : "Coming Soon"}
      </span>
      <h3 className="mt-3 font-display text-2xl text-ink-100">{tool.title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-ink-200">{tool.description}</p>
      {tool.detail && (
        <p className="mt-3 font-mono text-xs text-ink-400">{tool.detail}</p>
      )}
    </>
  );

  if (isLive && tool.href) {
    return (
      <a
        href={tool.href}
        className="block rounded-sm border border-ink-700 bg-ink-900/40 p-6 transition hover:-translate-y-0.5 hover:border-accent"
      >
        {inner}
      </a>
    );
  }

  return (
    <div className="rounded-sm border border-ink-700 bg-ink-900/20 p-6 opacity-60">
      {inner}
    </div>
  );
}
