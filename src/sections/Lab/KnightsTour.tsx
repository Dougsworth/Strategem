import { useMemo, useState } from "react";
import { RotateCcw } from "lucide-react";

// Knight's Tour — land the knight on every square exactly once. Pure planning +
// knight-vision; directly sharpens the calculation chess players need.
const N = 5;
const JUMPS = [
  [1, 2],
  [2, 1],
  [-1, 2],
  [-2, 1],
  [1, -2],
  [2, -1],
  [-1, -2],
  [-2, -1],
];

function reachableFrom(i: number, visited: Set<number>): number[] {
  const r = Math.floor(i / N);
  const c = i % N;
  const out: number[] = [];
  for (const [dr, dc] of JUMPS) {
    const nr = r + dr;
    const nc = c + dc;
    if (nr >= 0 && nr < N && nc >= 0 && nc < N) {
      const idx = nr * N + nc;
      if (!visited.has(idx)) out.push(idx);
    }
  }
  return out;
}

export const KnightsTour = () => {
  const [pos, setPos] = useState<number | null>(null);
  const [order, setOrder] = useState<number[]>([]); // visit order, for the trail
  const visited = useMemo(() => new Set(order), [order]);

  const reachable =
    pos === null
      ? null // first click: anywhere
      : new Set(reachableFrom(pos, visited));

  const won = order.length === N * N;
  const stuck = pos !== null && !won && reachable!.size === 0;

  function click(i: number) {
    if (won) return;
    if (pos === null) {
      setPos(i);
      setOrder([i]);
      return;
    }
    if (reachable!.has(i)) {
      setOrder((o) => [...o, i]);
      setPos(i);
    }
  }

  function reset() {
    setPos(null);
    setOrder([]);
  }

  return (
    <div className="flex flex-col items-center">
      <div className="grid grid-cols-5 gap-2">
        {Array.from({ length: N * N }).map((_, i) => {
          const isPos = i === pos;
          const visitIdx = order.indexOf(i);
          const isVisited = visitIdx !== -1;
          const isOption = reachable === null || reachable.has(i);
          const dark = (Math.floor(i / N) + i) % 2 === 0;
          return (
            <button
              key={i}
              onClick={() => click(i)}
              disabled={won}
              className={`grid h-14 w-14 place-items-center rounded-lg font-mono text-sm font-bold transition-all ${
                isPos
                  ? "bg-accent text-paper ring-2 ring-accent"
                  : isVisited
                    ? "bg-ink text-paper"
                    : isOption && !won
                      ? "bg-accent-soft text-ink ring-1 ring-accent/40 hover:bg-accent/20"
                      : dark
                        ? "bg-ink-soft text-muted"
                        : "bg-card text-muted ring-1 ring-line"
              }`}
            >
              {isPos ? "♞" : isVisited ? visitIdx + 1 : ""}
            </button>
          );
        })}
      </div>

      <div className="mt-5 flex items-center gap-4">
        <span className="font-mono text-sm text-muted">
          {order.length} / {N * N} squares
        </span>
        <button
          onClick={reset}
          className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm font-medium transition-colors hover:bg-ink-soft"
        >
          <RotateCcw size={14} />
          Restart
        </button>
      </div>

      {pos === null && (
        <p className="mt-3 text-sm text-muted">Click any square to drop the knight.</p>
      )}
      {won && (
        <p className="mt-4 font-display text-lg font-bold text-positive">
          Full tour — every square, once. 🐴
        </p>
      )}
      {stuck && (
        <p className="mt-4 text-sm font-semibold text-accent">
          No legal jumps left — restart and try a different path.
        </p>
      )}
    </div>
  );
};
