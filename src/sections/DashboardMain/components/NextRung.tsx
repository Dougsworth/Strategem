import { useMemo } from "react";
import { ArrowRight, Target, TrendingDown, TrendingUp } from "lucide-react";
import { useStudent } from "@/lib/StudentContext";
import { useView } from "@/lib/ViewContext";
import { computeNextRung } from "@/lib/nextRung";
import { TREND_LABEL, trendColor } from "@/lib/format";

// "Your next rung" — the home centerpiece. Turns the report into a path: where
// you are, the single step up to work on next (from your real weaknesses), the
// skills behind it, and your trajectory. Never caps — clear it, the next appears.
export const NextRung = () => {
  const { report, profile } = useStudent();
  const { setView } = useView();
  const data = useMemo(() => (report ? computeNextRung(report) : null), [report]);
  if (!data) return null;

  const first = profile?.displayName?.split(/\s+/)[0] ?? "You";
  const { rung, skills, focusKey, rating, trend, accuracyDelta } = data;
  const sorted = [...skills].sort((a, b) => b.level - a.level);

  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-ink-soft/40 px-5 py-3 sm:px-6">
        <div>
          <p className="eyebrow">Your path</p>
          <h3 className="mt-0.5 text-lg font-semibold text-ink">{first}’s next rung</h3>
        </div>
        <div className="flex items-center gap-2 text-xs">
          {rating != null && (
            <span className="rounded-md bg-card px-2 py-1 font-mono font-semibold text-ink ring-1 ring-line">
              {rating}
            </span>
          )}
          <span className={`flex items-center gap-1 rounded-md bg-card px-2 py-1 font-medium ring-1 ring-line ${trendColor(trend)}`}>
            {trend === "declining" ? <TrendingDown size={13} /> : <TrendingUp size={13} />}
            {TREND_LABEL[trend]}
          </span>
        </div>
      </div>

      <div className="grid gap-6 p-5 sm:grid-cols-5 sm:p-6">
        {/* The rung — the one thing to work on next. */}
        <div className="sm:col-span-3">
          <div className="flex items-center gap-2 text-accent">
            <Target size={16} />
            <span className="text-xs font-semibold uppercase tracking-wide">Work on next</span>
          </div>
          <h4 className="mt-1.5 flex items-baseline gap-2 text-xl font-bold tracking-tight text-ink">
            {rung.title}
            {rung.metric && <span className="font-mono text-sm font-medium text-muted">{rung.metric}</span>}
          </h4>
          <p className="mt-1.5 text-sm leading-relaxed text-muted">{rung.why}</p>

          {rung.drills.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {rung.drills.slice(0, 3).map((d, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-ink">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                  {d}
                </li>
              ))}
            </ul>
          )}

          <button
            onClick={() => setView("curriculum")}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-paper transition hover:opacity-90"
          >
            Start training
            <ArrowRight size={15} />
          </button>
        </div>

        {/* The ladder — skill profile + trajectory. */}
        <div className="sm:col-span-2">
          <p className="mb-2 text-xs font-medium text-muted">Your skills</p>
          <div className="space-y-2">
            {sorted.map((s) => {
              const focus = s.key === focusKey;
              return (
                <div key={s.key} className="flex items-center gap-2">
                  <span className={`w-24 shrink-0 truncate text-xs ${focus ? "font-semibold text-ink" : "text-muted"}`}>
                    {s.name}
                  </span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-ink-soft">
                    <span
                      className={`block h-full rounded-full ${focus ? "bg-accent" : "bg-ink/70"}`}
                      style={{ width: `${s.level}%` }}
                    />
                  </span>
                  <span className="w-8 shrink-0 text-right font-mono text-[11px] text-muted">{s.level}</span>
                </div>
              );
            })}
          </div>

          <div className="mt-4 rounded-lg bg-ink-soft/50 px-3 py-2 text-xs text-muted">
            <span className={`font-mono font-semibold ${accuracyDelta >= 0 ? "text-positive" : "text-accent"}`}>
              {accuracyDelta >= 0 ? "+" : ""}
              {accuracyDelta}%
            </span>{" "}
            accuracy month-over-month · the climb never caps
          </div>
        </div>
      </div>
    </section>
  );
};
