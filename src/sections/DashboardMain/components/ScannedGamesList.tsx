import { Trash2, FileText } from "lucide-react";
import { useScannedGames } from "@/lib/ScannedGamesContext";

// The coach's saved scanned games, listed in the sidebar for quick reference.
export const ScannedGamesList = () => {
  const { games, open, removeGame } = useScannedGames();
  if (games.length === 0) return null;

  return (
    <section className="mt-8">
      <header className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-sm font-bold uppercase tracking-[1.4px] text-muted">
          Scanned Games
        </h2>
        <span className="font-mono text-xs text-muted">{games.length}</span>
      </header>

      <div className="space-y-1">
        {games.map((g) => (
          <div
            key={g.id}
            className="group flex items-center gap-2 rounded-xl border border-line px-3 py-2 transition-colors hover:bg-ink-soft"
          >
            <button
              onClick={() => open(g)}
              className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
            >
              <FileText size={15} className="shrink-0 text-muted" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">
                  {g.white} – {g.black}
                </span>
                <span className="block font-mono text-[10px] uppercase tracking-wide text-muted/70">
                  {g.moveCount} {g.moveCount === 1 ? "move" : "moves"}
                </span>
              </span>
            </button>
            <button
              onClick={() => removeGame(g.id)}
              title="Remove"
              className="shrink-0 rounded-md p-1 text-muted opacity-0 transition-opacity hover:text-accent group-hover:opacity-100"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
};
