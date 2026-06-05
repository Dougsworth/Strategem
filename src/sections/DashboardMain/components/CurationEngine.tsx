import { useEffect, useMemo, useState } from "react";
import { useStudent } from "@/lib/StudentContext";
import { PuzzleTrainer } from "@/sections/Trainer/PuzzleTrainer";
import {
  difficultyFor,
  recommendPuzzles,
  type PuzzleRec,
} from "@/lib/puzzles";

function monogram(label: string): string {
  const words = label.replace(/[^a-zA-Z ]/g, "").trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

export const CurationEngine = () => {
  const { report, reportLoading } = useStudent();
  const recs = useMemo(() => (report ? recommendPuzzles(report) : []), [report]);
  const [active, setActive] = useState<PuzzleRec | null>(null);

  const difficulty = report ? difficultyFor(report.rating) : "normal";

  // Deep link: ?practice=<rec key or theme> opens the trainer straight away.
  useEffect(() => {
    if (active || recs.length === 0) return;
    const want = new URLSearchParams(window.location.search).get("practice");
    if (!want) return;
    const match =
      recs.find((r) => r.key === want) ?? recs.find((r) => r.theme === want);
    if (match) setActive(match);
  }, [recs, active]);

  if (reportLoading || !report) {
    return <div className="min-h-[320px] animate-pulse rounded-2xl bg-ink-soft" />;
  }

  const firstName = report.displayName.split(/\s+/)[0];

  return (
    <section className="rounded-2xl bg-ink p-8 text-paper">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h3 className="font-display text-2xl font-bold tracking-tight">
            Practice Plan
          </h3>
          <p className="mt-1 max-w-md text-sm leading-relaxed text-paper/60">
            {recs.length} things {firstName} should work on. Tap one to practice
            it right here, with real puzzles picked for their level.
          </p>
        </div>
        {recs[0] && (
          <button
            onClick={() => setActive(recs[0])}
            className="rounded-lg bg-accent px-5 py-2.5 text-sm font-bold text-paper shadow-lg shadow-accent/20 transition-opacity hover:opacity-90"
          >
            Start practicing →
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {recs.map((rec, i) => (
          <button
            key={rec.key}
            onClick={() => setActive(rec)}
            className="group flex items-center gap-4 rounded-xl bg-white/[0.04] p-4 text-left ring-1 ring-white/10 transition-colors hover:bg-white/[0.08]"
          >
            <div
              className={`grid h-12 w-12 shrink-0 place-items-center rounded-lg font-display text-base font-bold ${
                i === 0 ? "bg-accent text-paper" : "bg-white/10 text-paper"
              }`}
            >
              {monogram(rec.label)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-display text-sm font-bold">{rec.label}</p>
              <p className="mt-0.5 text-xs leading-snug text-paper/55">
                {rec.reason}
              </p>
            </div>
            <span className="shrink-0 font-mono text-[10px] uppercase tracking-wide text-accent transition-colors group-hover:text-paper">
              Practice →
            </span>
          </button>
        ))}
      </div>

      {active && (
        <PuzzleTrainer
          theme={active.theme}
          difficulty={difficulty}
          title={active.label}
          onClose={() => setActive(null)}
        />
      )}
    </section>
  );
};
