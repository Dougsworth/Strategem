import { useState } from "react";
import { RotateCcw } from "lucide-react";

// Lights Out — clicking a cell flips it and its 4 neighbours. Turn them all off.
// Quietly teaches parity and "every move has side effects" planning.
const N = 5;

function toggle(grid: boolean[], i: number): boolean[] {
  const r = Math.floor(i / N);
  const c = i % N;
  const next = [...grid];
  for (const [dr, dc] of [
    [0, 0],
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ]) {
    const nr = r + dr;
    const nc = c + dc;
    if (nr >= 0 && nr < N && nc >= 0 && nc < N) {
      next[nr * N + nc] = !next[nr * N + nc];
    }
  }
  return next;
}

function seed(): boolean[] {
  // Start solved, then apply random valid clicks → guaranteed solvable.
  let g = Array<boolean>(N * N).fill(false);
  const clicks = 6 + Math.floor(Math.random() * 6);
  for (let k = 0; k < clicks; k++) g = toggle(g, Math.floor(Math.random() * N * N));
  return g.some((x) => x) ? g : toggle(g, 12); // never hand back a solved board
}

export const LightsOut = () => {
  const [grid, setGrid] = useState<boolean[]>(seed);
  const [moves, setMoves] = useState(0);
  const solved = grid.every((x) => !x);

  function click(i: number) {
    if (solved) return;
    setGrid((g) => toggle(g, i));
    setMoves((m) => m + 1);
  }

  function reset() {
    setGrid(seed());
    setMoves(0);
  }

  return (
    <div className="flex flex-col items-center">
      <div className="grid grid-cols-5 gap-2">
        {grid.map((on, i) => (
          <button
            key={i}
            onClick={() => click(i)}
            className={`h-14 w-14 rounded-lg transition-all ${
              on
                ? "bg-accent shadow-[0_0_18px_rgba(192,81,43,0.45)]"
                : "bg-ink-soft ring-1 ring-line hover:bg-ink/10"
            }`}
          />
        ))}
      </div>

      <div className="mt-5 flex items-center gap-4">
        <span className="font-mono text-sm text-muted">{moves} moves</span>
        <button
          onClick={reset}
          className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm font-medium transition-colors hover:bg-ink-soft"
        >
          <RotateCcw size={14} />
          New board
        </button>
      </div>

      {solved && (
        <p className="mt-4 font-display text-lg font-bold text-positive">
          Lights out in {moves} moves 🎉
        </p>
      )}
    </div>
  );
};
