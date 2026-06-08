import type { Difficulty, Puzzle } from "../lib/puzzles";
import type { PoolEntry } from "./puzzlePool.data";

// Loader for the bundled CC0 puzzle pool (4,700+ puzzles from the Lichess
// public-domain database). The heavy data lives in puzzlePool.data.ts and is
// dynamically imported, so it only downloads when puzzles are actually played —
// it never bloats the main app bundle. This is what makes practice effectively
// unlimited: instant, offline, no rate limits.

let cache: Puzzle[] | null = null;
let loading: Promise<Puzzle[]> | null = null;

function toPuzzle(e: PoolEntry): Puzzle {
  return {
    id: e.id,
    rating: e.r,
    themes: e.t ? e.t.split(" ") : [],
    fen: e.f,
    solution: e.s.split(" "),
    playerColor: e.c,
    url: `https://lichess.org/training/${e.id}`,
  };
}

export async function loadPool(): Promise<Puzzle[]> {
  if (cache) return cache;
  if (!loading) {
    loading = import("./puzzlePool.data").then((m) => {
      cache = m.POOL.map(toPuzzle);
      return cache;
    });
  }
  return loading;
}

// Difficulty → rating window. Each is generous and overlaps so there's always a
// healthy pool at every level.
const BANDS: Record<Difficulty, [number, number]> = {
  easiest: [0, 950],
  easier: [800, 1350],
  normal: [1200, 1750],
  harder: [1650, 2150],
  hardest: [2000, 3000],
};

/**
 * A random puzzle from the pool, narrowed by theme then difficulty when those
 * yield enough candidates (otherwise it widens so it never dead-ends). Excludes
 * the just-shown puzzle. Returns null only if the pool can't be loaded at all.
 */
export async function randomFromPool(opts: {
  theme?: string;
  difficulty?: Difficulty;
  exclude?: string;
} = {}): Promise<Puzzle | null> {
  let pool: Puzzle[];
  try {
    pool = await loadPool();
  } catch {
    return null;
  }
  let list = pool;

  if (opts.theme && opts.theme !== "mix") {
    const themed = pool.filter((p) => p.themes.includes(opts.theme as string));
    if (themed.length >= 8) list = themed;
  }
  if (opts.difficulty) {
    const [lo, hi] = BANDS[opts.difficulty];
    const band = list.filter((p) => p.rating >= lo && p.rating <= hi);
    if (band.length >= 8) list = band;
  }

  const choices = list.filter((p) => p.id !== opts.exclude);
  if (!choices.length) return null;
  return choices[Math.floor(Math.random() * choices.length)];
}
