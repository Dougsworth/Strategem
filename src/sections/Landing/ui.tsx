import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";

// Shared landing primitives, on-brand with the app's design tokens.

/** Section eyebrow: a quiet sentence-case label. */
export const Eyebrow = ({ label }: { label: string }) => (
  <p className="text-sm text-muted">{label}</p>
);

const PRIMARY =
  "group inline-flex h-12 items-center gap-2 rounded-lg bg-accent px-6 text-sm font-semibold text-paper " +
  "transition-[opacity,transform] duration-150 hover:opacity-90 active:scale-[0.98]";

const SECONDARY =
  "inline-flex h-12 items-center gap-2 rounded-lg border border-line bg-card px-6 text-sm font-semibold text-ink " +
  "transition-[background-color,transform] duration-150 hover:bg-ink-soft active:scale-[0.98]";

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
