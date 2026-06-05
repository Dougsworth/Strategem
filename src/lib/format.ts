import type { Phase, Trend } from "./types";

/** "4h ago", "2d ago", "just now". */
export function timeAgo(ms: number | null): string {
  if (!ms) return "—";
  const diff = Date.now() - ms;
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.round(days / 30)}mo ago`;
}

export const TREND_LABEL: Record<Trend, string> = {
  rising: "Rising",
  steady: "Steady",
  plateau: "Plateau",
  declining: "Declining",
};

/** Tailwind text-color class for a trend badge. */
export function trendColor(trend: Trend): string {
  switch (trend) {
    case "rising":
      return "text-positive";
    case "declining":
    case "plateau":
      return "text-accent";
    default:
      return "text-muted";
  }
}

export const PHASE_LABEL: Record<Phase, string> = {
  opening: "Opening",
  middlegame: "Middlegame",
  endgame: "Endgame",
};

/** Round to a whole-number percent string. */
export function pct(n: number | null): string {
  return n === null ? "—" : `${Math.round(n)}%`;
}
