import { InteractiveBoard } from "@/components/InteractiveBoard";
import type { Evidence } from "@/lib/types";

// "Show me the proof" — lists the real positions behind a stat, each on a board
// with a deep link to that exact move on Lichess. Makes every number auditable.

export const EvidenceModal = ({
  title,
  subtitle,
  items,
  onClose,
}: {
  title: string;
  subtitle: string;
  items: Evidence[];
  onClose: () => void;
}) => {
  return (
    <div
      className="fixed inset-0 z-[120] grid place-items-start overflow-y-auto bg-ink/50 p-4 backdrop-blur-sm sm:p-8"
      onClick={onClose}
    >
      <div
        className="mx-auto w-full max-w-3xl animate-fade-in rounded-2xl bg-card p-6 shadow-2xl ring-1 ring-line"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 className="font-display text-xl font-bold tracking-tight">
              {title}
            </h2>
            <p className="mt-1 text-sm text-muted">{subtitle}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg bg-ink px-3 py-1.5 text-sm font-medium text-paper"
          >
            Close
          </button>
        </div>

        {items.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">
            No example positions captured for this one.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {items.map((ev, i) => (
              <a
                key={`${ev.gameId}-${ev.ply}-${i}`}
                href={ev.url}
                target="_blank"
                rel="noreferrer"
                className="group rounded-xl p-2 ring-1 ring-line transition-colors hover:bg-ink-soft"
              >
                <div className="pointer-events-none">
                  <InteractiveBoard
                    fen={ev.fen}
                    orientation={ev.turn}
                    interactive={false}
                    onMove={() => {}}
                    size={150}
                  />
                </div>
                <div className="mt-2 px-1">
                  <p className="font-mono text-xs font-semibold">{ev.san}</p>
                  <p className="truncate text-[11px] text-muted">{ev.label}</p>
                  <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wide text-accent opacity-0 transition-opacity group-hover:opacity-100">
                    View on Lichess →
                  </p>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
