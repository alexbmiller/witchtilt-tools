import ToolCard, { Tool } from "./tool-card";

const TOOLS: Tool[] = [
  {
    title: "Rune Odds",
    description: "How likely are you to channel the colors you need by turn N?",
    detail: "Hypergeometric math for the 12-card rune deck.",
    status: "live",
    href: "https://runes.witchtilt.com",
  },
  {
    title: "Deck Pastebin",
    description: "Paste your decklist. See your mana curve.",
    detail: "Real decks, real probabilities.",
    status: "live",
    href: "https://decks.witchtilt.com",
  },
  {
    title: "Deck Builder",
    description: "Build decks with live odds as you go.",
    status: "coming-soon",
  },
  {
    title: "Pack EV Calculator",
    description: "Track packs you open. See if you're winning or losing.",
    status: "coming-soon",
  },
  {
    title: "Draft Simulator",
    description: "Practice Riftbound drafts against the bot.",
    status: "coming-soon",
  },
  {
    title: "Resolution Sequencer",
    description: "Walk through tricky stack interactions step by step.",
    status: "coming-soon",
  },
];

export default function ToolsGrid() {
  return (
    <section className="border-t border-ink-700 px-6 py-20">
      <div className="mx-auto grid max-w-4xl auto-rows-fr grid-cols-1 gap-4 md:grid-cols-2">
        {TOOLS.map((tool) => (
          <ToolCard key={tool.title} tool={tool} />
        ))}
      </div>
    </section>
  );
}
