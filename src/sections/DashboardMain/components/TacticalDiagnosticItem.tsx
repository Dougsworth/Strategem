import type { TacticalMotif } from "@/lib/types";
import { pct } from "@/lib/format";

/** A motif is "weak" when a reliable estimate is materially below par. */
const WEAK_THRESHOLD = 60;

export const TacticalDiagnosticItem = ({
  motif,
  onShowMissed,
}: {
  motif: TacticalMotif;
  onShowMissed: () => void;
}) => {
  const reliable = motif.accuracy !== null && motif.reliable;
  const weak = reliable && (motif.accuracy as number) < WEAK_THRESHOLD;
  const canAudit = motif.missed.length > 0;

  const Inner = (
    <div className="flex w-full items-center justify-between bg-card p-6 text-left">
      <div className="flex items-center gap-4">
        <div
          className={`grid h-8 w-8 place-items-center rounded-md font-mono text-xs font-bold ${
            weak ? "bg-accent-soft text-accent" : "bg-ink-soft text-ink"
          }`}
        >
          {motif.badge}
        </div>
        <div>
          <p className="text-sm font-semibold">{motif.title}</p>
          <p className="text-xs text-muted">{motif.description}</p>
        </div>
      </div>
      <div className="shrink-0 pl-3 text-right">
        {reliable ? (
          <>
            <p className={`font-mono text-sm font-bold ${weak ? "text-accent" : "text-ink"}`}>
              {pct(motif.accuracy)}
            </p>
            <p className="text-[10px] uppercase tracking-tight text-muted">
              {canAudit ? `${motif.missed.length} missed →` : `${motif.sample} seen`}
            </p>
          </>
        ) : (
          <>
            <p className="font-mono text-sm font-bold text-muted/60">—</p>
            <p className="text-[10px] uppercase tracking-tight text-muted/60">
              {motif.sample > 0 ? `only ${motif.sample} seen` : "no data"}
            </p>
          </>
        )}
      </div>
    </div>
  );

  // Clickable only when there are missed positions to show.
  return canAudit ? (
    <button
      onClick={onShowMissed}
      className="transition-colors hover:bg-ink-soft/50"
    >
      {Inner}
    </button>
  ) : (
    Inner
  );
};
