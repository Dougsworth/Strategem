import { useStudent } from "@/lib/StudentContext";
import { PHASE_LABEL } from "@/lib/format";

export const PhaseStrengthCard = () => {
  const { report, reportLoading } = useStudent();

  if (reportLoading || !report) {
    return <div className="card h-full min-h-[220px] animate-pulse" />;
  }

  const scored = report.phases.filter((p) => p.moves > 0);
  const weakest = scored.reduce(
    (min, p) => (p.accuracy < min.accuracy ? p : min),
    scored[0],
  );

  return (
    <div className="card h-full min-h-[220px] p-6">
      <p className="eyebrow mb-4 flex items-center gap-2">
        <span className="h-1.5 w-1.5 bg-accent" />
        Parts of the Game
      </p>
      <div className="space-y-4">
        {report.phases.map((phase) => {
          const isWeak = weakest && phase.phase === weakest.phase;
          return (
            <div key={phase.phase}>
              <div className="mb-1.5 flex justify-between text-xs font-medium">
                <span className={isWeak ? "text-accent" : "text-ink"}>
                  {PHASE_LABEL[phase.phase]}
                </span>
                <span
                  className={`font-mono ${isWeak ? "text-accent" : "text-ink"}`}
                >
                  {phase.moves === 0 ? "—" : `${Math.round(phase.accuracy)}%`}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-soft">
                <div
                  className={`h-full rounded-full ${isWeak ? "bg-accent" : "bg-ink/70"}`}
                  style={{ width: `${Math.round(phase.accuracy)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-xs leading-snug text-muted/80">
        How well they play in the opening, the middle of the game, and the
        endgame. Longer bar = stronger.
      </p>
    </div>
  );
};
