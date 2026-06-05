import { RotateCw } from "lucide-react";
import { useStudent } from "@/lib/StudentContext";
import { timeAgo } from "@/lib/format";
import { TrendBadge } from "@/components/Badge";

export const PlayerOverview = () => {
  const {
    profile,
    report,
    reportLoading,
    reportError,
    selected,
    openReportCard,
    setPerf,
    refresh,
  } = useStudent();

  if (reportError) {
    return (
      <section className="border-b border-line pb-6">
        <p className="font-display text-2xl font-bold">Couldn’t load {selected}</p>
        <p className="mt-2 text-sm text-accent">{reportError}</p>
      </section>
    );
  }

  // Nothing resolved yet — full skeleton.
  if (!profile) {
    return (
      <section className="border-b border-line pb-6">
        <div className="h-3 w-40 animate-pulse rounded bg-ink-soft" />
        <div className="mt-3 h-9 w-72 animate-pulse rounded bg-ink-soft" />
        <div className="mt-3 h-4 w-full max-w-lg animate-pulse rounded bg-ink-soft" />
      </section>
    );
  }

  const perfLabel =
    profile.availablePerfs.find((p) => p.key === profile.perf)?.label ?? "Games";

  return (
    <section className="border-b border-line pb-6">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-start">
        <div>
          <div className="mb-2 flex items-center gap-3">
            <TrendBadge trend={profile.trend} variant="solid" />
            <span className="font-mono text-xs text-muted">
              {perfLabel} · {profile.rating ?? "—"} rating · last game{" "}
              {timeAgo(profile.lastGameAt)}
            </span>
            <button
              onClick={refresh}
              disabled={reportLoading}
              title="Re-pull their latest games"
              className="rounded-md p-1 text-muted transition-colors hover:bg-ink-soft hover:text-ink disabled:opacity-40"
            >
              <RotateCw size={13} className={reportLoading ? "animate-spin" : ""} />
            </button>
          </div>
          <h1 className="font-display text-4xl font-bold tracking-tight">
            {profile.displayName}
          </h1>

          {/* Headline + accuracy come from the full analysis — fill in when ready. */}
          {report ? (
            <>
              <p className="mt-2 max-w-lg leading-relaxed text-muted">
                {report.headline}
              </p>
              <p className="mt-2 font-mono text-xs uppercase tracking-wide text-muted/70">
                Plays a good move {Math.round(report.overallAccuracy)}% of the time ·{" "}
                {report.gamesAnalyzed} games checked
              </p>
            </>
          ) : (
            <>
              <div className="mt-3 h-4 w-full max-w-lg animate-pulse rounded bg-ink-soft" />
              <div className="mt-2 h-3 w-64 animate-pulse rounded bg-ink-soft" />
            </>
          )}
        </div>
        <div className="flex shrink-0 gap-2">
          <a
            href={`https://lichess.org/@/${profile.username}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-line px-4 py-2 text-sm font-medium transition-colors hover:bg-ink-soft"
          >
            View Games
          </a>
          <button
            onClick={openReportCard}
            disabled={!report}
            className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            Report Card
          </button>
        </div>
      </div>

      {/* Time-control selector — analyze bullet / blitz / rapid / classical separately. */}
      {profile.availablePerfs.length > 1 && (
        <div className="mt-5 flex flex-wrap gap-2">
          {profile.availablePerfs.map((p) => {
            const active = p.key === profile.perf;
            return (
              <button
                key={p.key}
                onClick={() => !active && setPerf(p.key)}
                className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                  active
                    ? "border-ink bg-ink text-paper"
                    : "border-line hover:bg-ink-soft"
                }`}
              >
                <span className="font-medium">{p.label}</span>
                <span
                  className={`font-mono text-xs ${active ? "text-paper/70" : "text-muted"}`}
                >
                  {p.rating ?? "—"}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
};
