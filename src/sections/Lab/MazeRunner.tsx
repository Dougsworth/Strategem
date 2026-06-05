import { useEffect, useMemo, useState } from "react";
import { RotateCcw, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Flag } from "lucide-react";

// The Maze — find the exit, then see your moves vs. the optimal path. The point
// isn't just escaping; it's the efficiency gap, which is exactly how you teach
// "find the shortest plan, not just a working one."
const SIZE = 8;
// walls[i] = [top, right, bottom, left] — true = wall present.

function generate(seed: number): boolean[][] {
  void seed; // seed just forces regeneration; randomness is fine here
  const walls = Array.from({ length: SIZE * SIZE }, () => [true, true, true, true]);
  const visited = new Set<number>([0]);
  const stack = [0];
  while (stack.length) {
    const cur = stack[stack.length - 1];
    const r = Math.floor(cur / SIZE);
    const c = cur % SIZE;
    const opts: [number, number][] = [];
    if (r > 0 && !visited.has(cur - SIZE)) opts.push([0, cur - SIZE]);
    if (c < SIZE - 1 && !visited.has(cur + 1)) opts.push([1, cur + 1]);
    if (r < SIZE - 1 && !visited.has(cur + SIZE)) opts.push([2, cur + SIZE]);
    if (c > 0 && !visited.has(cur - 1)) opts.push([3, cur - 1]);
    if (opts.length === 0) {
      stack.pop();
      continue;
    }
    const [dir, ni] = opts[Math.floor(Math.random() * opts.length)];
    walls[cur][dir] = false;
    walls[ni][(dir + 2) % 4] = false;
    visited.add(ni);
    stack.push(ni);
  }
  return walls;
}

function shortest(walls: boolean[][]): number {
  const goal = SIZE * SIZE - 1;
  const dist: Record<number, number> = { 0: 0 };
  const q = [0];
  while (q.length) {
    const cur = q.shift()!;
    if (cur === goal) return dist[cur];
    const steps: number[] = [];
    if (!walls[cur][0]) steps.push(cur - SIZE);
    if (!walls[cur][1]) steps.push(cur + 1);
    if (!walls[cur][2]) steps.push(cur + SIZE);
    if (!walls[cur][3]) steps.push(cur - 1);
    for (const n of steps) {
      if (dist[n] === undefined) {
        dist[n] = dist[cur] + 1;
        q.push(n);
      }
    }
  }
  return -1;
}

export const MazeRunner = () => {
  const [seed, setSeed] = useState(1);
  const walls = useMemo(() => generate(seed), [seed]);
  const optimal = useMemo(() => shortest(walls), [walls]);
  const [pos, setPos] = useState(0);
  const [moves, setMoves] = useState(0);
  const goal = SIZE * SIZE - 1;
  const won = pos === goal;

  function move(dir: number) {
    if (won) return;
    if (walls[pos][dir]) return; // blocked
    const delta = [-SIZE, 1, SIZE, -1][dir];
    setPos(pos + delta);
    setMoves((m) => m + 1);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const map: Record<string, number> = {
        ArrowUp: 0, w: 0,
        ArrowRight: 1, d: 1,
        ArrowDown: 2, s: 2,
        ArrowLeft: 3, a: 3,
      };
      const dir = map[e.key];
      if (dir !== undefined) {
        e.preventDefault();
        move(dir);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function reset() {
    setSeed((s) => s + 1);
    setPos(0);
    setMoves(0);
  }

  return (
    <div className="flex flex-col items-center">
      <div
        className="grid bg-card"
        style={{ gridTemplateColumns: `repeat(${SIZE}, 2.25rem)` }}
      >
        {walls.map((w, i) => {
          const isPos = i === pos;
          const isGoal = i === goal;
          return (
            <div
              key={i}
              className={`relative h-9 w-9 ${
                w[0] ? "border-t-2 border-ink" : ""
              } ${w[1] ? "border-r-2 border-ink" : ""} ${
                w[2] ? "border-b-2 border-ink" : ""
              } ${w[3] ? "border-l-2 border-ink" : ""}`}
            >
              {isGoal && (
                <Flag
                  size={16}
                  className="absolute inset-0 m-auto text-positive"
                />
              )}
              {isPos && (
                <span className="absolute inset-0 m-auto h-4 w-4 rounded-full bg-accent shadow-[0_0_10px_rgba(192,81,43,0.5)]" />
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-4 font-mono text-sm text-muted">{moves} moves</p>

      {/* On-screen pad (keyboard / WASD also work) */}
      <div className="mt-3 grid grid-cols-3 gap-1.5">
        <span />
        <PadBtn onClick={() => move(0)}><ArrowUp size={16} /></PadBtn>
        <span />
        <PadBtn onClick={() => move(3)}><ArrowLeft size={16} /></PadBtn>
        <PadBtn onClick={() => move(2)}><ArrowDown size={16} /></PadBtn>
        <PadBtn onClick={() => move(1)}><ArrowRight size={16} /></PadBtn>
      </div>

      <button
        onClick={reset}
        className="mt-4 flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm font-medium transition-colors hover:bg-ink-soft"
      >
        <RotateCcw size={14} />
        New maze
      </button>

      {won && (
        <div className="mt-4 text-center">
          <p className="font-display text-lg font-bold text-positive">
            Out in {moves} moves!
          </p>
          <p className="mt-1 text-sm text-muted">
            Shortest possible was <span className="font-semibold text-ink">{optimal}</span> —{" "}
            {moves === optimal
              ? "you nailed the optimal path. 🎯"
              : `${moves - optimal} more than optimal. Can you find the tighter line?`}
          </p>
        </div>
      )}
      <p className="mt-2 font-mono text-[10px] uppercase tracking-wide text-muted/50">
        Arrow keys / WASD · or tap the pad
      </p>
    </div>
  );
};

function PadBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="grid h-10 w-10 place-items-center rounded-lg border border-line transition-colors hover:bg-ink-soft"
    >
      {children}
    </button>
  );
}
