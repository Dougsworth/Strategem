import { useState } from "react";
import { TacticalDiagnosticItem } from "@/sections/DashboardMain/components/TacticalDiagnosticItem";
import { useStudent } from "@/lib/StudentContext";
import { Badge } from "@/components/Badge";
import { EvidenceModal } from "@/components/EvidenceModal";
import type { TacticalMotif } from "@/lib/types";

export const TacticalDiagnostic = () => {
  const { report, reportLoading } = useStudent();
  const [open, setOpen] = useState<TacticalMotif | null>(null);

  return (
    <section>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-display text-xl font-bold tracking-tight">
            Tactics: What They Spot
          </h3>
          <span title="A best-guess estimate from their games, not an exact score.">
            <Badge tone="meta">Estimate</Badge>
          </span>
        </div>
        <span className="font-mono text-xs text-muted">
          {report ? `From ${report.gamesAnalyzed} recent games` : "Loading…"}
        </span>
      </div>

      {reportLoading || !report ? (
        <div className="min-h-[180px] animate-pulse rounded-2xl bg-ink-soft" />
      ) : (
        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl bg-line ring-1 ring-line md:grid-cols-2">
          {report.tacticalMotifs.map((motif) => (
            <TacticalDiagnosticItem
              key={motif.key}
              motif={motif}
              onShowMissed={() => setOpen(motif)}
            />
          ))}
        </div>
      )}

      {open && (
        <EvidenceModal
          title={`${open.title} — chances missed`}
          subtitle={`Positions where a ${open.title.toLowerCase().replace(/s$/, "")} was available and ${report?.displayName.split(/\s+/)[0]} played something else. The move shown is the one the engine recommends.`}
          items={open.missed}
          onClose={() => setOpen(null)}
        />
      )}
    </section>
  );
};
