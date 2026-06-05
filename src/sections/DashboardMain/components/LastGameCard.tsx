import { useState } from "react";
import { ExternalLink, ChevronRight } from "lucide-react";
import { useStudent } from "@/lib/StudentContext";
import { timeAgo } from "@/lib/format";
import { EvidenceModal } from "@/components/EvidenceModal";

const RESULT_STYLE: Record<string, { label: string; cls: string }> = {
  win: { label: "Win", cls: "bg-positive/15 text-positive" },
  loss: { label: "Loss", cls: "bg-accent/15 text-accent" },
  draw: { label: "Draw", cls: "bg-ink-soft text-muted" },
};

// "Their last game, decoded" — reuses the games already fetched for the report,
// so it adds zero API calls. Shows the result, accuracy, and the mistakes they
// made in that single game, each openable on a board.
export const LastGameCard = () => {
  const { report, reportLoading } = useStudent();
  const [open, setOpen] = useState(false);

  if (reportLoading && !report) {
    return <div className="h-40 animate-pulse rounded-2xl bg-ink-soft" />;
  }
  const g = report?.lastGame;
  if (!g) return null;

  const r = RESULT_STYLE[g.result] ?? RESULT_STYLE.draw;
  const firstName = report?.displayName.split(/\s+/)[0] ?? "They";

  return (
    <section className="rounded-2xl border border-line bg-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] uppercase tracking-wide text-accent">
            Last game
          </span>
          <span className={`rounded-md px-2 py-0.5 text-xs font-bold ${r.cls}`}>
            {r.label}
          </span>
        </div>
        <a
          href={g.url}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1 text-xs font-medium transition-colors hover:bg-ink-soft"
        >
          <ExternalLink size={13} />
          Open game
        </a>
      </div>

      <h3 className="mt-3 font-display text-xl font-bold tracking-tight">
        vs {g.opponent}
      </h3>
      <p className="mt-1 font-mono text-xs uppercase tracking-wide text-muted/80">
        {Math.round(g.accuracy)}% accuracy · played {timeAgo(g.date)} ·{" "}
        {g.color === "w" ? "White" : "Black"}
      </p>

      {g.mistakes.length > 0 ? (
        <>
          <p className="mt-4 text-sm text-muted">
            {firstName} made{" "}
            <span className="font-semibold text-ink">
              {g.mistakes.length} {g.mistakes.length === 1 ? "mistake" : "mistakes"}
            </span>{" "}
            in this game. Review the exact moments:
          </p>
          <button
            onClick={() => setOpen(true)}
            className="mt-3 flex w-full items-center justify-between rounded-xl bg-ink-soft/60 px-4 py-3 text-left transition-colors hover:bg-ink-soft"
          >
            <span className="text-sm font-semibold">
              Walk through {g.mistakes.length === 1 ? "the moment" : "the moments"}
            </span>
            <ChevronRight size={16} className="text-muted" />
          </button>
        </>
      ) : (
        <p className="mt-4 text-sm text-muted">
          Clean game — no flagged mistakes. 🎯
        </p>
      )}

      {open && (
        <EvidenceModal
          title={`Last game vs ${g.opponent}`}
          subtitle={`${g.mistakes.length} moment${g.mistakes.length === 1 ? "" : "s"} where a stronger move was on the board.`}
          items={g.mistakes}
          onClose={() => setOpen(false)}
        />
      )}
    </section>
  );
};
