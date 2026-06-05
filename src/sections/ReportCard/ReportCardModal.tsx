import { useMemo } from "react";
import { Lock } from "lucide-react";
import { useStudent } from "@/lib/StudentContext";
import { useAuth } from "@/lib/AuthContext";
import { entitlements } from "@/lib/entitlements";
import { buildReportCard, type SkillLine } from "@/lib/reportCard";
import { Sparkline } from "@/components/Sparkline";
import { Badge, TrendBadge } from "@/components/Badge";
import type { Delta } from "@/lib/snapshots";

export const ReportCardModal = () => {
  const { report, reportCardOpen, closeReportCard, deltas } = useStudent();
  const { user, openMembership } = useAuth();
  const ent = entitlements(user?.plan);

  const card = useMemo(
    () => (report ? buildReportCard(report, deltas?.rating) : null),
    [report, deltas],
  );

  if (!reportCardOpen || !report || !card) return null;

  const accuracySeries = report.gamesTimeline.map((g) => g.accuracy);
  const ratingSeries = report.ratingHistory.map((r) => r.rating);
  const today = new Date().toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-start overflow-y-auto bg-ink/40 p-4 backdrop-blur-sm sm:p-8 print:bg-white print:p-0"
      onClick={closeReportCard}
    >
      <div
        className="report-card mx-auto w-full max-w-3xl animate-fade-in rounded-2xl bg-card p-8 shadow-2xl ring-1 ring-line print:shadow-none print:ring-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Studio branding (Academy / Club) */}
        {ent.branding && (user?.studioName || user?.logoUrl) && (
          <div className="mb-4 flex items-center gap-3 border-b border-line pb-4">
            {user.logoUrl && (
              <img
                src={user.logoUrl}
                alt=""
                className="h-9 w-auto object-contain"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            )}
            {user.studioName && (
              <span className="font-display text-lg font-bold tracking-tight">
                {user.studioName}
              </span>
            )}
          </div>
        )}

        {/* Header */}
        <div className="flex items-start justify-between border-b border-line pb-5">
          <div>
            <p className="eyebrow">Report Card · {today}</p>
            <h2 className="mt-1 font-display text-3xl font-bold tracking-tight">
              {report.displayName}
            </h2>
            <p className="mt-1 font-mono text-xs capitalize text-muted">
              {report.perf} · {report.rating ?? "—"} rating ·{" "}
              <TrendBadge trend={report.trend} variant="text" /> ·{" "}
              {report.gamesAnalyzed} games checked
            </p>
          </div>
          <div className="flex gap-2 print:hidden">
            {ent.reportCardExport ? (
              <button
                onClick={() => window.print()}
                className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium transition-colors hover:bg-ink-soft"
              >
                Print / PDF
              </button>
            ) : (
              <button
                onClick={openMembership}
                title="Exporting report-card PDFs is part of the Coach plan"
                className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:bg-ink-soft"
              >
                <Lock size={13} />
                Print / PDF
              </button>
            )}
            <button
              onClick={closeReportCard}
              className="rounded-lg bg-ink px-3 py-1.5 text-sm font-medium text-paper"
            >
              Close
            </button>
          </div>
        </div>

        {/* Narrative */}
        <div className="mt-5">
          <div className="mb-3 flex items-center gap-2">
            <p className="eyebrow">Coach Summary</p>
            <span title="Auto-generated from the analysis. Numbers are exact; prose is templated (Claude-upgradeable).">
              <Badge tone="meta">Auto</Badge>
            </span>
          </div>
          <p className="leading-relaxed text-ink">{card.narrative}</p>
        </div>

        {/* Since last review — growth tracking is a Coach-plan feature. */}
        {ent.growthHistory && deltas && (
          <div className="mt-5 flex flex-wrap gap-2">
            <DeltaChip delta={deltas.rating} unit="" />
            <DeltaChip delta={deltas.accuracy} unit="%" />
            {deltas.phases.map((d) => (
              <DeltaChip key={d.label} delta={d} unit="%" />
            ))}
          </div>
        )}

        {/* Strengths / priorities */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SkillColumn title="Strengths" lines={card.strengths} tone="positive" />
          <SkillColumn title="To Work On" lines={card.weaknesses} tone="accent" />
        </div>

        {/* Growth */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="card p-5">
            <p className="eyebrow mb-3">Accuracy · last {accuracySeries.length} games</p>
            <Sparkline
              values={accuracySeries}
              stroke="oklch(0.55 0.13 150)"
              height={72}
            />
          </div>
          <div className="card p-5">
            <p className="eyebrow mb-3">
              Rating ·{" "}
              <span className={report.ratingDrift >= 0 ? "text-positive" : "text-accent"}>
                {report.ratingDrift >= 0 ? "+" : ""}
                {report.ratingDrift}
              </span>
            </p>
            <Sparkline
              values={ratingSeries}
              stroke={report.ratingDrift >= 0 ? "oklch(0.55 0.13 150)" : "oklch(0.56 0.19 38)"}
              height={72}
            />
          </div>
        </div>

        {/* Recommended training */}
        <div className="mt-6">
          <p className="eyebrow mb-3">Practice Plan</p>
          <div className="space-y-2">
            {card.focus.map((rec) => (
              <a
                key={rec.key}
                href={rec.trainingUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between rounded-lg bg-ink-soft px-4 py-2.5 transition-colors hover:bg-ink/10 print:bg-transparent print:ring-1 print:ring-line"
              >
                <div>
                  <p className="text-sm font-semibold">{rec.label}</p>
                  <p className="text-xs text-muted">{rec.reason}</p>
                </div>
                <span className="font-mono text-[10px] uppercase tracking-wide text-accent print:hidden">
                  Practice →
                </span>
              </a>
            ))}
          </div>
        </div>

        <p className="mt-6 border-t border-line pt-4 font-mono text-[10px] uppercase tracking-wide text-muted/70">
          Made by Strategem from {report.gamesAnalyzed} of {report.username}’s recent games ·
          Tactics percentages are best-guess estimates
        </p>
      </div>
    </div>
  );
};

function SkillColumn({
  title,
  lines,
  tone,
}: {
  title: string;
  lines: SkillLine[];
  tone: "positive" | "accent";
}) {
  return (
    <div className="card p-5">
      <p className="eyebrow mb-3">{title}</p>
      <div className="space-y-3">
        {lines.map((l) => (
          <div key={l.label} className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">{l.label}</p>
              <p className="text-xs text-muted">{l.detail}</p>
            </div>
            <span
              className={`font-mono text-sm font-bold ${tone === "positive" ? "text-positive" : "text-accent"}`}
            >
              {Math.round(l.accuracy)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DeltaChip({ delta, unit }: { delta: Delta; unit: string }) {
  if (delta.change === null || Math.abs(delta.change) < 0.5) return null;
  const up = delta.change > 0;
  return (
    <span
      className={`rounded-full px-2.5 py-1 font-mono text-[11px] font-medium capitalize ${
        up ? "bg-positive/10 text-positive" : "bg-accent-soft text-accent"
      }`}
    >
      {delta.label} {up ? "▲" : "▼"} {Math.abs(delta.change)}
      {unit}
    </span>
  );
}
