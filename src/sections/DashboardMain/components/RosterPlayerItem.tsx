import type { RosterEntry } from "@/lib/types";
import { TrendBadge } from "@/components/Badge";

interface Props {
  entry: RosterEntry;
  selected: boolean;
  onSelect: () => void;
  onRemove: () => void;
}

export const RosterPlayerItem = ({
  entry,
  selected,
  onSelect,
  onRemove,
}: Props) => {
  return (
    <div
      className={`group flex w-full items-center justify-between rounded-xl p-3 transition-colors ${
        selected ? "bg-ink-soft ring-1 ring-line" : "hover:bg-ink-soft/60"
      }`}
    >
      <button
        type="button"
        onClick={onSelect}
        className="flex flex-1 items-center gap-3 text-left"
      >
        <div
          className={`grid h-10 w-10 place-items-center rounded-lg font-mono text-xs font-bold ${
            selected ? "bg-ink/15 text-ink" : "bg-ink-soft text-muted"
          }`}
        >
          {entry.initials}
        </div>
        <div>
          <p
            className={`text-sm ${selected ? "font-semibold text-ink" : "font-medium text-ink"}`}
          >
            {entry.displayName}
          </p>
          <p className="mt-1 font-mono text-xs uppercase text-muted">
            {entry.rating ?? "—"} rating ·{" "}
            <TrendBadge trend={entry.trend} variant="text" />
          </p>
        </div>
      </button>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${entry.displayName}`}
        className="ml-2 hidden h-6 w-6 shrink-0 place-items-center rounded-md font-mono text-muted transition-colors hover:bg-accent-soft hover:text-accent group-hover:grid"
      >
        ×
      </button>
    </div>
  );
};
