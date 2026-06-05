import { useEffect, useState } from "react";
import { RotateCcw } from "lucide-react";

// 2048 — slide tiles, merge equal numbers, reach 2048. Pure look-ahead and
// board management: the same "don't paint yourself into a corner" thinking chess
// rewards.
const N = 4;

function emptyCells(g: number[]): number[] {
  return g.map((v, i) => (v === 0 ? i : -1)).filter((i) => i >= 0);
}

function spawn(g: number[]): number[] {
  const empty = emptyCells(g);
  if (empty.length === 0) return g;
  const next = [...g];
  next[empty[Math.floor(Math.random() * empty.length)]] =
    Math.random() < 0.9 ? 2 : 4;
  return next;
}

function lineIndices(dir: number, k: number): number[] {
  // dir: 0 up, 1 right, 2 down, 3 left — ordered toward the move direction.
  if (dir === 3) return [0, 1, 2, 3].map((c) => k * N + c);
  if (dir === 1) return [3, 2, 1, 0].map((c) => k * N + c);
  if (dir === 0) return [0, 1, 2, 3].map((r) => r * N + k);
  return [3, 2, 1, 0].map((r) => r * N + k);
}

function slide(line: number[]): { res: number[]; gained: number } {
  const nums = line.filter((x) => x);
  const res: number[] = [];
  let gained = 0;
  for (let i = 0; i < nums.length; i++) {
    if (nums[i] === nums[i + 1]) {
      res.push(nums[i] * 2);
      gained += nums[i] * 2;
      i++;
    } else res.push(nums[i]);
  }
  while (res.length < N) res.push(0);
  return { res, gained };
}

function applyMove(grid: number[], dir: number) {
  const g = [...grid];
  let moved = false;
  let gained = 0;
  for (let k = 0; k < N; k++) {
    const idxs = lineIndices(dir, k);
    const { res, gained: gg } = slide(idxs.map((i) => g[i]));
    gained += gg;
    idxs.forEach((i, j) => {
      if (g[i] !== res[j]) moved = true;
      g[i] = res[j];
    });
  }
  return { grid: g, moved, gained };
}

function anyMoves(g: number[]): boolean {
  if (emptyCells(g).length) return true;
  return [0, 1, 2, 3].some((d) => applyMove(g, d).moved);
}

const TILE: Record<number, string> = {
  2: "bg-ink-soft text-ink",
  4: "bg-accent-soft text-ink",
  8: "bg-accent/70 text-paper",
  16: "bg-accent text-paper",
  32: "bg-accent text-paper",
  64: "bg-ink/80 text-paper",
  128: "bg-ink text-paper",
  256: "bg-ink text-paper",
  512: "bg-positive/80 text-paper",
  1024: "bg-positive text-paper",
  2048: "bg-positive text-paper",
};

export const Game2048 = () => {
  const [grid, setGrid] = useState<number[]>(() => spawn(spawn(Array(N * N).fill(0))));
  const [score, setScore] = useState(0);
  const lost = !anyMoves(grid);
  const won = grid.includes(2048);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const map: Record<string, number> = {
        ArrowUp: 0, w: 0, ArrowRight: 1, d: 1,
        ArrowDown: 2, s: 2, ArrowLeft: 3, a: 3,
      };
      const dir = map[e.key];
      if (dir === undefined || lost) return;
      e.preventDefault();
      const { grid: ng, moved, gained } = applyMove(grid, dir);
      if (moved) {
        setGrid(spawn(ng));
        setScore((s) => s + gained);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function reset() {
    setGrid(spawn(spawn(Array(N * N).fill(0))));
    setScore(0);
  }

  return (
    <div className="flex flex-col items-center">
      <div className="mb-4 flex items-center gap-5">
        <span className="font-mono text-sm text-muted">
          Score <span className="font-bold text-ink">{score}</span>
        </span>
        <button
          onClick={reset}
          className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm font-medium transition-colors hover:bg-ink-soft"
        >
          <RotateCcw size={14} />
          New game
        </button>
      </div>

      <div className="grid grid-cols-4 gap-2 rounded-xl bg-ink-soft/50 p-2">
        {grid.map((v, i) => (
          <div
            key={i}
            className={`grid h-16 w-16 place-items-center rounded-lg font-display text-xl font-bold transition-all ${
              v === 0 ? "bg-card ring-1 ring-line" : TILE[v] ?? "bg-positive text-paper"
            }`}
          >
            {v || ""}
          </div>
        ))}
      </div>

      {won && (
        <p className="mt-4 font-display text-lg font-bold text-positive">
          You hit 2048! Keep going for a higher score. 🏆
        </p>
      )}
      {lost && !won && (
        <p className="mt-4 text-sm font-semibold text-accent">
          No moves left — final score {score}. New game?
        </p>
      )}
      <p className="mt-2 font-mono text-[10px] uppercase tracking-wide text-muted/50">
        Arrow keys / WASD to slide
      </p>
    </div>
  );
};
