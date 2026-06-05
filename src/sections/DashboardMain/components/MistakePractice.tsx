import { useMemo, useState } from "react";
import { Target } from "lucide-react";
import { useStudent } from "@/lib/StudentContext";
import { mistakeDeck } from "@/lib/mistakeDeck";
import { MistakeTrainer } from "@/sections/Trainer/MistakeTrainer";

export const MistakePractice = () => {
  const { report, reportLoading } = useStudent();
  const [open, setOpen] = useState(false);

  const deck = useMemo(() => (report ? mistakeDeck(report) : []), [report]);

  if (reportLoading || !report || deck.length === 0) return null;

  const firstName = report.displayName.split(/\s+/)[0];

  return (
    <section className="overflow-hidden rounded-2xl bg-accent text-paper">
      <div className="flex flex-col items-start justify-between gap-5 p-7 sm:flex-row sm:items-center">
        <div className="flex items-start gap-4">
          <span className="mt-0.5 grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-paper/15">
            <Target size={20} />
          </span>
          <div>
            <h3 className="font-display text-xl font-bold tracking-tight">
              Fix {firstName}’s actual mistakes
            </h3>
            <p className="mt-1 max-w-md text-sm leading-relaxed text-paper/85">
              {deck.length} positions from {firstName}’s real games where a
              stronger move was on the board. Re-solve the exact moments they got
              wrong — the most effective way to improve.
            </p>
          </div>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="shrink-0 rounded-lg bg-paper px-5 py-2.5 text-sm font-bold text-ink transition-transform hover:-translate-y-px active:scale-[0.99]"
        >
          Start fixing →
        </button>
      </div>

      {open && (
        <MistakeTrainer
          items={deck}
          studentName={firstName}
          onClose={() => setOpen(false)}
        />
      )}
    </section>
  );
};
