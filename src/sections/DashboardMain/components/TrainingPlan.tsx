import { useMemo } from "react";
import { Target, Sparkles, CalendarCheck } from "lucide-react";
import { useStudent } from "@/lib/StudentContext";
import { focusAreas, weeklyRoutine } from "@/lib/coachInsights";

// Curriculum tab — a prioritized, personalized training plan built from the
// student's real weaknesses, plus a concrete weekly routine.
export const TrainingPlan = () => {
  const { report, reportLoading } = useStudent();

  const areas = useMemo(() => (report ? focusAreas(report) : []), [report]);
  const routine = useMemo(() => (report ? weeklyRoutine(report) : []), [report]);

  if (reportLoading && !report) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-2xl bg-ink-soft" />
        ))}
      </div>
    );
  }
  if (!report) return null;

  const firstName = report.displayName.split(/\s+/)[0];

  return (
    <section className="space-y-5">
      <div>
        <p className="eyebrow">Curriculum</p>
        <h2 className="mt-0.5 font-display text-2xl font-bold tracking-tight">
          {firstName}’s training plan
        </h2>
        <p className="mt-1 text-sm text-muted">
          Built from {report.gamesAnalyzed} analyzed games — ordered by what will
          raise their rating fastest.
        </p>
      </div>

      <div className="space-y-4">
        {areas.map((a, i) => (
          <div key={a.tag} className="rounded-2xl border border-line bg-card p-6">
            <div className="flex flex-wrap items-center gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-ink font-display text-sm font-bold text-paper">
                {i + 1}
              </span>
              <div className="min-w-0">
                <p className="font-mono text-[10px] uppercase tracking-wide text-accent">
                  {a.tag}
                </p>
                <h3 className="font-display text-lg font-bold tracking-tight">
                  {a.title}
                </h3>
              </div>
              <span className="ml-auto rounded-lg bg-ink-soft px-2.5 py-1 font-mono text-xs font-semibold">
                {a.metric}
              </span>
            </div>

            <p className="mt-3 text-sm leading-relaxed text-muted">{a.why}</p>

            <ul className="mt-4 space-y-2">
              {a.drills.map((d) => (
                <li key={d} className="flex items-start gap-2 text-sm">
                  <Sparkles size={14} className="mt-0.5 shrink-0 text-accent" />
                  <span>{d}</span>
                </li>
              ))}
            </ul>

            {a.cta && (
              <p className="mt-3 font-mono text-[10px] uppercase tracking-wide text-muted/70">
                ↓ {a.cta === "mistakes" ? "Start in the mistake drills below" : "Practice in the puzzle sets below"}
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-line bg-card p-6">
        <div className="flex items-center gap-2">
          <CalendarCheck size={18} className="text-accent" />
          <h3 className="font-display text-lg font-bold tracking-tight">
            A week that works
          </h3>
        </div>
        <p className="mt-1 text-sm text-muted">
          Little and often beats cramming. A realistic weekly rhythm:
        </p>
        <ul className="mt-4 space-y-2.5">
          {routine.map((r) => (
            <li key={r} className="flex items-start gap-2.5 text-sm">
              <Target size={15} className="mt-0.5 shrink-0 text-accent" />
              <span>{r}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};
