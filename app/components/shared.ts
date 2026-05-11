export const ACTIVE_BTN = "border-accent bg-accent/10 text-accent";
export const INACTIVE_BTN =
  "border-ink-700 text-ink-300 hover:border-ink-600 hover:text-ink-100";

export function pct(p: number): string {
  if (p >= 0.9995) return "100%";
  if (p < 0.0005) return "<0.1%";
  return `${(p * 100).toFixed(1)}%`;
}

export function heatColor(p: number): string {
  const opacity = 0.08 + Math.min(p, 1) * 0.55;
  return `rgba(212, 175, 55, ${opacity.toFixed(3)})`;
}
