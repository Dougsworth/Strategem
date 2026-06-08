import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";

// Shared landing primitives, on-brand with the app's design tokens.

/** Section eyebrow: "§ 02 — ─── WHAT'S INSIDE". */
export const Eyebrow = ({ n, label }: { n: string; label: string }) => (
  <div className="flex items-center gap-3">
    <span className="font-mono text-[11px] font-medium text-accent">{n}</span>
    <span className="h-px w-8 bg-line" />
    <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
      {label}
    </span>
  </div>
);

const PRIMARY =
  "group inline-flex h-12 items-center gap-2 rounded-full bg-accent px-6 text-sm font-semibold text-paper " +
  "shadow-[0_14px_36px_-12px_oklch(0.56_0.19_38_/_0.55)] transition-all duration-200 " +
  "hover:-translate-y-0.5 hover:shadow-[0_20px_46px_-12px_oklch(0.56_0.19_38_/_0.65)] active:scale-[0.99]";

const SECONDARY =
  "inline-flex h-12 items-center gap-2 rounded-full border border-line bg-card px-6 text-sm font-semibold text-ink " +
  "transition-all duration-200 hover:-translate-y-0.5 hover:bg-ink-soft active:scale-[0.99]";

/** Primary call-to-action. href defaults to #start so the landing's click
 *  delegation routes it into the sign-up flow. */
export const PrimaryCta = ({
  children,
  href = "#start",
  className = "",
  arrow = true,
}: {
  children: ReactNode;
  href?: string;
  className?: string;
  arrow?: boolean;
}) => (
  <a href={href} className={`${PRIMARY} ${className}`}>
    {children}
    {arrow && (
      <ArrowRight
        size={16}
        className="transition-transform duration-200 group-hover:translate-x-0.5"
      />
    )}
  </a>
);

export const SecondaryCta = ({
  children,
  href = "#sample",
  className = "",
}: {
  children: ReactNode;
  href?: string;
  className?: string;
}) => (
  <a href={href} className={`${SECONDARY} ${className}`}>
    {children}
  </a>
);
