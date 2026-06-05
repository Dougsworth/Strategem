import { Chess } from "chess.js";
import type { Puzzle } from "./puzzles";
import { dailyFromBank } from "../data/puzzleBank";

// The "puzzle of the day". Pulls Lichess's official free daily puzzle
// (https://lichess.org/api/puzzle/daily — CORS-enabled, no key), converts it to
// our Puzzle shape, and caches it in localStorage keyed by date so it's fetched
// at most once a day and is instant on revisit. If the feed is unreachable we
// fall back to a deterministic puzzle from our own verified bank, so a daily
// puzzle ALWAYS shows.

export interface DailyPuzzle extends Puzzle {
  source: "lichess" | "bank";
  /** YYYY-MM-DD the puzzle is for. */
  day: string;
}

const KEY = "strategem.dailypuzzle.v1";

function todayKey(): string {
  // Local date (so it rolls over at the user's midnight, like Lichess shows it).
  const d = new Date();
  const mm = `${d.getMonth() + 1}`.padStart(2, "0");
  const dd = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

// Whole days since the epoch — a stable per-day seed for the bank fallback.
function dayIndex(): number {
  return Math.floor(Date.now() / 86_400_000);
}

interface LichessDaily {
  game?: { pgn?: string };
  puzzle?: { id?: string; rating?: number; themes?: string[]; solution?: string[] };
}

// Replay the full game PGN → the position to solve; `solution` is used as-is
// (UCI, player to move first). Verified against the live API.
function fromLichess(data: LichessDaily, day: string): DailyPuzzle | null {
  const pgn = data.game?.pgn?.trim();
  const solution = data.puzzle?.solution;
  if (!pgn || !solution?.length) return null;
  const chess = new Chess();
  for (const m of pgn.split(/\s+/)) {
    try {
      chess.move(m);
    } catch {
      return null; // unexpected SAN — bail to the bank fallback
    }
  }
  return {
    id: data.puzzle?.id ?? "daily",
    rating: data.puzzle?.rating ?? 1500,
    themes: data.puzzle?.themes ?? [],
    fen: chess.fen(),
    solution,
    playerColor: chess.turn(),
    url: data.puzzle?.id ? `https://lichess.org/training/${data.puzzle.id}` : "https://lichess.org/training",
    source: "lichess",
    day,
  };
}

function fromBank(day: string): DailyPuzzle {
  return { ...dailyFromBank(dayIndex()), source: "bank", day };
}

function readCache(day: string): DailyPuzzle | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw) as DailyPuzzle;
    return cached?.day === day && cached.fen ? cached : null;
  } catch {
    return null;
  }
}

function writeCache(p: DailyPuzzle): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* storage full / disabled — fine, we just refetch next time */
  }
}

/** Today's puzzle: cache → Lichess → bank. Resolves fast and never throws. */
export async function getDailyPuzzle(): Promise<DailyPuzzle> {
  const day = todayKey();
  const cached = readCache(day);
  if (cached) return cached;

  try {
    const res = await fetch("https://lichess.org/api/puzzle/daily", {
      headers: { Accept: "application/json" },
    });
    if (res.ok) {
      const puzzle = fromLichess((await res.json()) as LichessDaily, day);
      if (puzzle) {
        writeCache(puzzle);
        return puzzle;
      }
    }
  } catch {
    /* offline / rate-limited — fall through to the bank */
  }

  const bank = fromBank(day);
  writeCache(bank); // cache the fallback too so the day stays stable
  return bank;
}
