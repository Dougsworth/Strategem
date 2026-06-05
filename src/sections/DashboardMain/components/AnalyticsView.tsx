import { useMemo } from "react";
import { Brain, Activity, TrendingUp } from "lucide-react";
import { useStudent } from "@/lib/StudentContext";
import { consistency, mindsetSignals } from "@/lib/coachInsights";
import type { GamePoint } from "@/lib/types";

const PHASE_LABEL: Record<string, string> = {
  opening: "Opening",
  middlegame: "Middlegame",
  endgame: "Endgame",
};

// A minimal inline sparkline for the per-game accuracy curve.
function Sparkline({ points }: { points: GamePoint[] }) {
  const data = points.map((p) => p.accuracy).filter((n) => n > 0);
  if (data.length < 2) {
    return <p className="text-sm text-muted">Not enough analyzed games yet.</p>;
  }
  const w = 520;
  const h = 120;
  const min = Math.min(...data) - 3;
  const max = Math.max(...data) + 3;
  const span = Math.max(1, max - min);
  const step = w / (data.length - 1);
  const coords = data.map((v, i) => [i * step, h - ((v - min) / span) * h] as const);
  const line = coords.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `0,${h} ${line} ${w},${h}`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-32 w-full" preserveAspectRatio="none">
      <polygon points={area} fill="rgba(126,154,100,0.14)" />
      <polyline
        points={line}
        fill="none"
        stroke="#5f7d4f"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

// Analytics tab — the deep dive: growth curve, consistency (a focus/tilt proxy),
// mindset signals from recurring mistakes, and phase strengths.
export const AnalyticsView = () => {
  const { report, reportLoading } = useStudent();

  const signals = useMemo(() => (report ? mindsetSignals(report) : []), [report]);
  const cons = useMemo(() => (report ? consistency(report) : null), [report]);

  if (reportLoading && !report) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-48 animate-pulse rounded-2xl bg-ink-soft" />
        ))}
      </div>
    );
  }
  if (!report) return null;

  const firstName = report.displayName.split(/\s+/)[0];
  const delta = report.accuracyDelta;
  const sortedPhases = [...report.phases].filter((p) => p.moves >= 5);

  // Map "Streaky/Fairly steady/Rock-steady" to a 0–100 steadiness bar.
  const steadiness = cons
    ? Math.max(8, Math.min(100, Math.round(100 - cons.stdev * 4)))
    : 0;

  return (
    <section className="space-y-5">
      <div>
        <p className="eyebrow">Analytics</p>
        <h2 className="mt-0.5 font-display text-2xl font-bold tracking-tight">
          {firstName} — deep dive
        </h2>
        <p className="mt-1 text-sm text-muted">
          The signals coaches care about: how they’re trending, how steady they
          are, and the mindset behind their mistakes.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Growth curve */}
        <div className="rounded-2xl border border-line bg-card p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp size={18} className="text-accent" />
              <h3 className="font-display text-lg font-bold tracking-tight">
                Accuracy, game by game
              </h3>
            </div>
            <span
              className={`font-mono text-sm font-semibold ${
                delta >= 0 ? "text-positive" : "text-accent"
              }`}
            >
              {delta >= 0 ? "+" : ""}
              {delta.toFixed(1)}
            </span>
          </div>
          <p className="mb-3 mt-1 text-sm text-muted">
            Their real growth curve over {report.gamesAnalyzed} games — the trend
            matters more than any single game.
          </p>
          <Sparkline points={report.gamesTimeline} />
        </div>

        {/* Consistency */}
        <div className="rounded-2xl border border-line bg-card p-6">
          <div className="flex items-center gap-2">
            <Activity size={18} className="text-accent" />
            <h3 className="font-display text-lg font-bold tracking-tight">
              Consistency
            </h3>
          </div>
          {cons ? (
            <>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="font-display text-2xl font-bold tracking-tight">
                  {cons.label}
                </span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-ink-soft">
                <div
                  className="h-full rounded-full bg-accent"
                  style={{ width: `${steadiness}%` }}
                />
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted">{cons.blurb}</p>
            </>
          ) : (
            <p className="mt-3 text-sm text-muted">
              Need a few more analyzed games to read their consistency.
            </p>
          )}
        </div>
      </div>

      {/* Mindset signals */}
      {signals.length > 0 && (
        <div className="rounded-2xl border border-line bg-card p-6">
          <div className="flex items-center gap-2">
            <Brain size={18} className="text-accent" />
            <h3 className="font-display text-lg font-bold tracking-tight">
              Mindset signals
            </h3>
          </div>
          <p className="mt-1 text-sm text-muted">
            The same mistakes, read as the mental pattern behind them — and the
            habit that fixes each.
          </p>
          <div className="mt-4 space-y-3">
            {signals.map((s) => (
              <div key={s.signal} className="rounded-xl bg-ink-soft/60 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold">{s.signal}</p>
                  <span className="shrink-0 font-mono text-xs text-muted">
                    {s.count}×
                  </span>
                </div>
                <p className="mt-1 text-sm leading-relaxed text-muted">{s.meaning}</p>
                <p className="mt-2 text-sm leading-relaxed">
                  <span className="font-semibold text-accent">Habit:</span> {s.habit}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Phase strengths */}
      {sortedPhases.length > 0 && (
        <div className="rounded-2xl border border-line bg-card p-6">
          <h3 className="font-display text-lg font-bold tracking-tight">
            Strength by phase
          </h3>
          <div className="mt-4 space-y-3">
            {sortedPhases.map((p) => (
              <div key={p.phase}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span>{PHASE_LABEL[p.phase]}</span>
                  <span className="font-mono text-xs text-muted">
                    {Math.round(p.accuracy)}% · {Math.round(p.acpl)} acpl
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-ink-soft">
                  <div
                    className="h-full rounded-full bg-ink"
                    style={{ width: `${Math.round(p.accuracy)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};
