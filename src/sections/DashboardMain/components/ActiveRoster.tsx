import { useState } from "react";
import { RosterPlayerItem } from "@/sections/DashboardMain/components/RosterPlayerItem";
import { ScannedGamesList } from "@/sections/DashboardMain/components/ScannedGamesList";
import { useStudent, EXAMPLE_USERNAMES } from "@/lib/StudentContext";
import { useAuth } from "@/lib/AuthContext";
import { studentCapLabel } from "@/lib/entitlements";

export const ActiveRoster = () => {
  const { roster, rosterLoading, selected, select, addByInput, removeStudent } =
    useStudent();
  const { user } = useAuth();
  const capLabel = studentCapLabel(user?.plan);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function add(input: string) {
    if (!input.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await addByInput(input);
      setValue("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't add that student.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <aside className="col-span-12 md:col-span-3">
      <header className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-sm font-bold uppercase tracking-[1.4px] text-muted">
          Active Roster
        </h2>
        <span className="font-mono text-xs text-muted">
          {roster.length}
          {capLabel === "Unlimited" ? "" : ` / ${capLabel}`}
        </span>
      </header>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          add(value);
        }}
        className="mb-4"
      >
        <div className="flex gap-2">
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Paste Lichess URL or username"
            className="min-w-0 flex-1 rounded-lg border border-line bg-card px-3 py-2 text-sm outline-none ring-accent/30 placeholder:text-muted/60 focus:ring-2"
          />
          <button
            type="submit"
            disabled={busy}
            className="shrink-0 rounded-lg bg-ink px-3 py-2 text-sm font-medium text-paper disabled:opacity-50"
          >
            {busy ? "…" : "Add"}
          </button>
        </div>
        {error && <p className="mt-1.5 text-xs text-accent">{error}</p>}
        <p className="mt-1.5 font-mono text-[10px] text-muted/70">
          Profile, game URL, or username
        </p>
      </form>

      {rosterLoading ? (
        <div className="space-y-1">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-ink-soft" />
          ))}
        </div>
      ) : roster.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line p-4">
          <p className="text-xs text-muted">
            No students yet. Paste a Lichess profile or try an example:
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {EXAMPLE_USERNAMES.map((u) => (
              <button
                key={u}
                onClick={() => add(u)}
                disabled={busy}
                className="rounded-full bg-ink-soft px-2.5 py-1 font-mono text-xs text-ink transition-colors hover:bg-ink/10 disabled:opacity-50"
              >
                {u}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-1">
          {roster.map((entry) => (
            <RosterPlayerItem
              key={entry.username}
              entry={entry}
              selected={entry.username === selected}
              onSelect={() => select(entry.username)}
              onRemove={() => removeStudent(entry.username)}
            />
          ))}
        </div>
      )}

      <ScannedGamesList />
    </aside>
  );
};
