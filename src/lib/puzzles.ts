import { Chess } from "chess.js";
import type { StudentReport } from "./types";
import { PHASE_LABEL } from "./format";
import { bankFor } from "../data/puzzleBank";
import { randomFromPool } from "../data/puzzlePool";

// Turn a student's analysed weaknesses into real, assignable Lichess puzzles.
// Lichess exposes ~60 puzzle "themes" that line up with what we detect, plus a
// no-auth endpoint that serves a puzzle of a given theme at a chosen difficulty.
// Docs: https://lichess.org/api#tag/Puzzles  &  /training/{theme} streams.

export type Difficulty =
  | "easiest"
  | "easier"
  | "normal"
  | "harder"
  | "hardest";

export interface PuzzleRec {
  key: string;
  theme: string; // Lichess theme key
  label: string;
  reason: string; // why this is assigned, from the analysis
  /** Weakness severity 0–100 (lower = weaker = higher priority). */
  weakness: number;
  trainingUrl: string; // endless themed stream at the student's level
}

export interface Puzzle {
  id: string;
  rating: number;
  themes: string[];
  /** Position to solve (after replaying the full game). */
  fen: string;
  /** UCI moves: even indices = player's moves, odd = opponent replies. */
  solution: string[];
  /** Side the student plays. */
  playerColor: "w" | "b";
  url: string;
}

const MOTIF_THEME: Record<string, string> = {
  fork: "fork",
  pinskewer: "pin",
  backrank: "backRankMate",
  discovered: "discoveredAttack",
};

const ERROR_THEME: Record<string, { theme: string; label: string }> = {
  hung: { theme: "hangingPiece", label: "Keeping pieces safe" },
  missedWin: { theme: "advantage", label: "Converting winning positions" },
  panic: { theme: "defensiveMove", label: "Defending calmly" },
  slip: { theme: "long", label: "Calculating deeper" },
};

const PHASE_THEME: Record<string, string> = {
  opening: "opening",
  middlegame: "middlegame",
  endgame: "endgame",
};

function trainingUrl(theme: string): string {
  return `https://lichess.org/training/${theme}`;
}

/**
 * Rank the themes this student most needs to drill, weakest first.
 * Pulls from tactical motifs, the weakest phase, and recurring errors.
 */
export function recommendPuzzles(report: StudentReport): PuzzleRec[] {
  const recs: PuzzleRec[] = [];

  // Weak tactical motifs (lower accuracy first).
  report.tacticalMotifs
    .filter((m) => m.accuracy !== null && m.sample >= 3)
    .forEach((m) => {
      const theme = MOTIF_THEME[m.key];
      if (!theme) return;
      recs.push({
        key: `motif-${m.key}`,
        theme,
        label: m.title,
        reason: `Found it only ${Math.round(m.accuracy as number)}% of the time (${m.sample} chances)`,
        weakness: m.accuracy as number,
        trainingUrl: trainingUrl(theme),
      });
    });

  // Weakest game phase.
  const phase = [...report.phases]
    .filter((p) => p.moves >= 3)
    .sort((a, b) => a.accuracy - b.accuracy)[0];
  if (phase) {
    const theme = PHASE_THEME[phase.phase];
    recs.push({
      key: `phase-${phase.phase}`,
      theme,
      label: `${PHASE_LABEL[phase.phase]} play`,
      reason: `Weakest part of the game — only ${Math.round(phase.accuracy)}% accurate here`,
      weakness: phase.accuracy,
      trainingUrl: trainingUrl(theme),
    });
  }

  // Top recurring error.
  const err = report.recurringErrors[0];
  if (err && ERROR_THEME[err.key]) {
    const { theme, label } = ERROR_THEME[err.key];
    recs.push({
      key: `error-${err.key}`,
      theme,
      label,
      reason: `Happened ${err.count} times in recent games`,
      weakness: 40, // recurring errors are always high priority
      trainingUrl: trainingUrl(theme),
    });
  }

  // De-dupe by theme, weakest first, cap the set.
  const seen = new Set<string>();
  return recs
    .sort((a, b) => a.weakness - b.weakness)
    .filter((r) => (seen.has(r.theme) ? false : seen.add(r.theme)))
    .slice(0, 4);
}

interface PuzzleNextResponse {
  game: { id: string; pgn: string };
  puzzle: {
    id: string;
    rating: number;
    themes: string[];
    solution: string[];
    initialPly: number;
  };
}

/** Map a student's rating band to a sensible puzzle difficulty bucket. */
export function difficultyFor(rating: number | null): Difficulty {
  if (rating === null) return "normal";
  if (rating < 1000) return "easier";
  if (rating > 2000) return "harder";
  return "normal";
}

/** Replay a puzzle's FULL game PGN — the result is the position to solve. */
function replayPgn(pgn: string): Chess {
  const chess = new Chess();
  const tokens = pgn
    .trim()
    .split(/\s+/)
    .filter((t) => t && !/^\d+\.+$/.test(t) && !/^(1-0|0-1|1\/2-1\/2|\*)$/.test(t));
  for (const t of tokens) {
    try {
      chess.move(t);
    } catch {
      break;
    }
  }
  return chess;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// A small localStorage-backed puzzle bank, grown from every puzzle we fetch.
// Lichess's puzzle endpoint is heavily rate-limited, so this lets the trainer
// keep working (offline, instantly) once a theme has been seen even once —
// effectively building our own puzzle stash over time.
const POOL_KEY = (theme: string) => `strategem.puzzlepool.${theme}`;
const POOL_CAP = 40;

function poolGet(theme: string): Puzzle[] {
  try {
    const raw = localStorage.getItem(POOL_KEY(theme));
    return raw ? (JSON.parse(raw) as Puzzle[]) : [];
  } catch {
    return [];
  }
}

function poolPut(theme: string, p: Puzzle): void {
  try {
    const cur = poolGet(theme).filter((x) => x.id !== p.id);
    localStorage.setItem(
      POOL_KEY(theme),
      JSON.stringify([p, ...cur].slice(0, POOL_CAP)),
    );
  } catch {
    /* storage disabled — non-fatal */
  }
}

function parsePuzzle(data: PuzzleNextResponse): Puzzle {
  const chess = replayPgn(data.game.pgn);
  return {
    id: data.puzzle.id,
    rating: data.puzzle.rating,
    themes: data.puzzle.themes,
    fen: chess.fen(),
    solution: data.puzzle.solution,
    playerColor: chess.turn(),
    url: `https://lichess.org/training/${data.puzzle.id}`,
  };
}

/**
 * Get one real, solvable puzzle for a theme. Primary source is the bundled CC0
 * pool (4,700+ puzzles) — instant, offline, no rate limits, so practice is
 * effectively unlimited and never repeats quickly. Lichess's live feed is a
 * supplement for extra freshness, and the cached/house bank a final safety net.
 * `exclude` avoids immediately repeating the puzzle just shown.
 */
export async function fetchPuzzle(
  theme: string,
  difficulty: Difficulty,
  opts: { exclude?: string; retries?: number; live?: boolean } = {},
): Promise<Puzzle | null> {
  const { exclude, retries = 1, live = false } = opts;

  // 1) Instant, unlimited, offline: the bundled CC0 pool.
  const fromPool = await randomFromPool({ theme, difficulty, exclude }).catch(
    () => null,
  );
  if (fromPool && !live) return fromPool;

  // 2) Lichess live feed (fresh puzzles beyond the pool). Used when the pool is
  //    unavailable, or opportunistically when `live` is requested.
  const url = `https://lichess.org/api/puzzle/next?angle=${encodeURIComponent(theme)}&difficulty=${difficulty}`;
  try {
    let res = await fetch(url);
    for (let i = 0; res.status === 429 && i < retries; i++) {
      await sleep(1000 * (i + 1));
      res = await fetch(url);
    }
    if (res.ok) {
      const puzzle = parsePuzzle((await res.json()) as PuzzleNextResponse);
      poolPut(theme, puzzle);
      if (puzzle.id !== exclude) return puzzle;
    }
  } catch {
    /* fall through */
  }

  // 3) Pool again (if we skipped it for `live`), then cached, then house bank.
  if (fromPool) return fromPool;
  const cached = poolGet(theme).filter((p) => p.id !== exclude);
  if (cached.length) return cached[Math.floor(Math.random() * cached.length)];
  const house = bankFor(theme).filter((p) => p.id !== exclude);
  if (house.length) return house[Math.floor(Math.random() * house.length)];
  return null;
}
