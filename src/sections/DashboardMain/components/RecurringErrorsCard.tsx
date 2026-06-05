import { useState } from "react";
import { useStudent } from "@/lib/StudentContext";
import { EvidenceModal } from "@/components/EvidenceModal";
import type { RecurringError } from "@/lib/types";

export const RecurringErrorsCard = () => {
  const { report, reportLoading } = useStudent();
  const [open, setOpen] = useState<RecurringError | null>(null);

  if (reportLoading || !report) {
    return <div className="card h-full min-h-[220px] animate-pulse" />;
  }

  const errors = report.recurringErrors;
  const firstName = report.displayName.split(/\s+/)[0];

  return (
    <div className="card h-full min-h-[220px] p-6">
      <p className="eyebrow mb-4">Mistakes They Repeat</p>
      {errors.length === 0 ? (
        <p className="text-sm text-muted">
          No clear repeated mistake stood out in these games.
        </p>
      ) : (
        <div className="space-y-3">
          {errors.map((err, i) => {
            const canAudit = err.examples.length > 0;
            const Row = (
              <div className="flex w-full items-start gap-3 text-left">
                <div
                  className={`pt-0.5 font-mono text-xs font-bold ${
                    i === 0 ? "text-accent" : "text-muted/60"
                  }`}
                >
                  (x{err.count})
                </div>
                <div>
                  <p className="text-sm font-semibold">{err.title}</p>
                  <p className="text-xs leading-snug text-muted">
                    {err.description}
                    {canAudit && (
                      <span className="font-mono text-accent">
                        {" "}
                        See {err.examples.length} →
                      </span>
                    )}
                  </p>
                </div>
              </div>
            );
            return canAudit ? (
              <button
                key={err.key}
                onClick={() => setOpen(err)}
                className="-mx-2 w-[calc(100%+1rem)] rounded-lg px-2 py-1 transition-colors hover:bg-ink-soft/60"
              >
                {Row}
              </button>
            ) : (
              <div key={err.key}>{Row}</div>
            );
          })}
        </div>
      )}

      {open && (
        <EvidenceModal
          title={open.title}
          subtitle={`${firstName} — ${open.description.toLowerCase()} Tap a board to see the moment on Lichess.`}
          items={open.examples}
          onClose={() => setOpen(null)}
        />
      )}
    </div>
  );
};
