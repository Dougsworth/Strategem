import type { ReactNode } from "react";
import type { Trend } from "@/lib/types";
import { TREND_LABEL, trendColor } from "@/lib/format";

// Small shared pills/chips — one source of truth for the uppercase mono labels
// used across the app (trend pills, the "Estimate"/"Auto" meta chips).

type Tone = "solid-accent" | "solid-positive" | "meta";

const TONE: Record<Tone, string> = {
  "solid-accent": "bg-accent text-paper",
  "solid-positive": "bg-positive text-paper",
  meta: "bg-ink-soft text-muted",
};

export function Badge({
  children,
  tone = "meta",
  className = "",
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide ${TONE[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

/** Trend label as either a solid pill (headers) or inline coloured text (lists). */
export function TrendBadge({
  trend,
  variant = "solid",
}: {
  trend: Trend;
  variant?: "solid" | "text";
}) {
  if (variant === "text") {
    return (
      <span className={trendColor(trend)}>{TREND_LABEL[trend]}</span>
    );
  }
  return (
    <Badge tone={trend === "rising" ? "solid-positive" : "solid-accent"}>
      {TREND_LABEL[trend]}
    </Badge>
  );
}
