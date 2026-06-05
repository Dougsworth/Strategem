import { useEffect, useMemo, useRef, useState } from "react";
import {
  RotateCcw,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Flag,
  Eye,
} from "lucide-react";

// The Maze — navigate to the exit, then beat the optimal path. Smooth animated
// runner, a breadcrumb trail of where you've been, a timer, difficulty levels,
// and a "reveal the shortest line" that overlays the optimal path.
const CELL = 38; // px (border-box, so walls don't shift alignment)
const LEVELS = { Easy: 6, Medium: 9, Hard: 12 } as const;
type Level = keyof typeof LEVELS;

// walls[i] = [top, right, bottom, left]
function generate(size: number, seed: number): boolean[][] {
  void seed;
  const walls = Array.from({ length: size * size }, () => [true, true, true, true]);
  const visited = new Set<number>([0]);
  const stack = [0];
  while (stack.length) {
    const cur = stack[stack.length - 1];
    const r = Math.floor(cur / size);
    const c = cur % size;
    const opts: [number, number][] = [];
    if (r > 0 && !visited.has(cur - size)) opts.push([0, cur - size]);
    if (c < size - 1 && !visited.has(cur + 1)) opts.push([1, cur + 1]);
    if (r < size - 1 && !visited.has(cur + size)) opts.push([2, cur + size]);
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

function solvePath(walls: boolean[][], size: number): number[] {
  const goal = size * size - 1;
  const prev: Record<number, number> = {};
  const dist: Record<number, number> = { 0: 0 };
  const q = [0];
  while (q.length) {
    const cur = q.shift()!;
    if (cur === goal) break;
    const steps: number[] = [];
    if (!walls[cur][0]) steps.push(cur - size);
    if (!walls[cur][1]) steps.push(cur + 1);
    if (!walls[cur][2]) steps.push(cur + size);
    if (!walls[cur][3]) steps.push(cur - 1);
    for (const n of steps) {
      if (dist[n] === undefined) {
        dist[n] = dist[cur] + 1;
        prev[n] = cur;
        q.push(n);
      }
    }
  }
  if (dist[goal] === undefined) return [];
  const path: number[] = [];
  let c: number | undefined = goal;
  while (c !== undefined) {
    path.push(c);
    if (c === 0) break;
    c = prev[c];
  }
  return path.reverse();
}

export const MazeRunner = () => {
  const [level, setLevel] = useState<Level>("Medium");
  const size = LEVELS[level];
  const [seed, setSeed] = useState(1);
  const walls = useMemo(() => generate(size, seed), [size, seed]);
  const path = useMemo(() => solvePath(walls, size), [walls, size]);
  const optimal = path.length - 1;

  const [pos, setPos] = useState(0);
  const [trail, setTrail] = useState<Set<number>>(new Set([0]));
  const [moves, setMoves] = useState(0);
  const [reveal, setReveal] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const goal = size * size - 1;
  const won = pos === goal;

  // Tick the timer while running.
  const raf = useRef<number | null>(null);
  useEffect(() => {
    if (startedAt === null || won) return;
    const tick = () => {
      setElapsed((Date.now() - startedAt) / 1000);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [startedAt, won]);

  function move(dir: number) {
    if (won || walls[pos][dir]) return;
    const next = pos + [-size, 1, size, -1][dir];
    if (startedAt === null) setStartedAt(Date.now());
    setPos(next);
    setTrail((t) => new Set(t).add(next));
    setMoves((m) => m + 1);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const map: Record<string, number> = {
        ArrowUp: 0, w: 0, ArrowRight: 1, d: 1,
        ArrowDown: 2, s: 2, ArrowLeft: 3, a: 3,
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

  function reset(newLevel?: Level) {
    if (newLevel) setLevel(newLevel);
    setSeed((s) => s + 1);
    setPos(0);
    setTrail(new Set([0]));
    setMoves(0);
    setReveal(false);
    setStartedAt(null);
    setElapsed(0);
  }

  const px = (i: number) => ({
    left: (i % size) * CELL,
    top: Math.floor(i / size) * CELL,
  });

  return (
    <div className="flex flex-col items-center">
      {/* Difficulty */}
      <div className="mb-5 inline-flex rounded-lg bg-ink-soft p-1">
        {(Object.keys(LEVELS) as Level[]).map((l) => (
          <button
            key={l}
            onClick={() => reset(l)}
            className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
              level === l ? "bg-ink text-paper" : "text-muted hover:text-ink"
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      {/* Board */}
      <div
        className="relative rounded-xl bg-gradient-to-br from-paper to-ink-soft/50 p-0 shadow-inner ring-1 ring-line"
        style={{ width: size * CELL, height: size * CELL }}
      >
        {/* wall cells */}
        {walls.map((w, i) => (
          <div
            key={i}
            className={`absolute box-border ${w[0] ? "border-t-2 border-ink/80" : ""} ${
              w[1] ? "border-r-2 border-ink/80" : ""
            } ${w[2] ? "border-b-2 border-ink/80" : ""} ${
              w[3] ? "border-l-2 border-ink/80" : ""
            }`}
            style={{ ...px(i), width: CELL, height: CELL }}
          />
        ))}

        {/* breadcrumb trail */}
        {[...trail].map(
          (i) =>
            i !== pos &&
            i !== goal && (
              <span
                key={`t${i}`}
                className="absolute rounded-full bg-accent/25"
                style={{ left: px(i).left + CELL / 2 - 3, top: px(i).top + CELL / 2 - 3, width: 6, height: 6 }}
              />
            ),
        )}

        {/* revealed optimal path */}
        {reveal &&
          path.map((i) => (
            <span
              key={`p${i}`}
              className="absolute rounded-full bg-positive/40"
              style={{ left: px(i).left + CELL / 2 - 4, top: px(i).top + CELL / 2 - 4, width: 8, height: 8 }}
            />
          ))}

        {/* goal */}
        <span
          className="absolute grid place-items-center"
          style={{ ...px(goal), width: CELL, height: CELL }}
        >
          <Flag size={16} className="animate-pulse text-positive" />
        </span>

        {/* player */}
        <span
          className="absolute rounded-full bg-accent shadow-[0_0_14px_rgba(192,81,43,0.6)] transition-all duration-150 ease-out"
          style={{ left: px(pos).left + CELL / 2 - 9, top: px(pos).top + CELL / 2 - 9, width: 18, height: 18 }}
        />
      </div>

      {/* Stats */}
      <div className="mt-4 flex items-center gap-5 font-mono text-sm text-muted">
        <span>{moves} moves</span>
        <span>{elapsed.toFixed(1)}s</span>
      </div>

      {/* D-pad */}
      <div className="mt-3 grid grid-cols-3 gap-1.5">
        <span />
        <PadBtn onClick={() => move(0)}><ArrowUp size={16} /></PadBtn>
        <span />
        <PadBtn onClick={() => move(3)}><ArrowLeft size={16} /></PadBtn>
        <PadBtn onClick={() => move(2)}><ArrowDown size={16} /></PadBtn>
        <PadBtn onClick={() => move(1)}><ArrowRight size={16} /></PadBtn>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <button
          onClick={() => reset()}
          className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm font-medium transition-colors hover:bg-ink-soft"
        >
          <RotateCcw size={14} />
          New maze
        </button>
        <button
          onClick={() => setReveal((r) => !r)}
          className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm font-medium transition-colors hover:bg-ink-soft"
        >
          <Eye size={14} />
          {reveal ? "Hide path" : "Reveal best path"}
        </button>
      </div>

      {won && (
        <div className="mt-4 text-center">
          <p className="font-display text-lg font-bold text-positive">
            Out in {moves} moves · {elapsed.toFixed(1)}s!
          </p>
          <p className="mt-1 text-sm text-muted">
            Shortest was <span className="font-semibold text-ink">{optimal}</span> —{" "}
            {moves === optimal
              ? "perfectly optimal. 🎯"
              : `${moves - optimal} over. Hit “Reveal best path” to see the tighter line.`}
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
      className="grid h-10 w-10 place-items-center rounded-lg border border-line transition-colors hover:bg-ink-soft active:scale-95"
    >
      {children}
    </button>
  );
}
