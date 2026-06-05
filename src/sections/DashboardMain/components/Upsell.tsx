import { Lock, Check } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

// Shown in place of a locked tab for free coaches — a teaser + upgrade CTA.
export const Upsell = ({
  title,
  blurb,
  bullets,
}: {
  title: string;
  blurb: string;
  bullets: string[];
}) => {
  const { openMembership } = useAuth();

  return (
    <div className="rounded-2xl border border-line bg-card p-8 text-center">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-ink-soft">
        <Lock size={22} className="text-accent" />
      </span>
      <p className="mt-4 font-mono text-[10px] uppercase tracking-wide text-accent">
        Coach plan
      </p>
      <h2 className="mt-1 font-display text-2xl font-bold tracking-tight">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">{blurb}</p>

      <ul className="mx-auto mt-5 max-w-sm space-y-2 text-left">
        {bullets.map((b) => (
          <li key={b} className="flex items-start gap-2 text-sm">
            <Check size={15} className="mt-0.5 shrink-0 text-positive" />
            <span>{b}</span>
          </li>
        ))}
      </ul>

      <button
        onClick={openMembership}
        className="mt-6 rounded-lg bg-accent px-5 py-2.5 text-sm font-bold text-paper transition-opacity hover:opacity-90"
      >
        Upgrade to Coach
      </button>
    </div>
  );
};
