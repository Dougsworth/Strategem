import { Chess } from "chess.js";
import type { Puzzle } from "../lib/puzzles";

// Our own hand-built puzzle bank — every solution verified with chess.js
// (see scripts/verifybank.ts). This ships with the app so practice ALWAYS
// works: offline, instantly, and when Lichess's puzzle endpoint is rate-limited.
// It's a safety net under the live feed, not a replacement for it.

interface BankEntry {
  id: string;
  theme: string;
  rating: number;
  fen: string;
  solution: string[];
}

const ENTRIES: BankEntry[] = [
  {
    id: "hb-br1", theme: "backRankMate", rating: 900,
    fen: "6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1",
    solution: ["a1a8"],
  },
  {
    id: "hb-br2", theme: "backRankMate", rating: 1100,
    fen: "3r2k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1",
    solution: ["d1d8"],
  },
  {
    id: "hb-fk1", theme: "fork", rating: 1000,
    fen: "3q3k/6pp/8/6N1/8/8/8/6K1 w - - 0 1",
    solution: ["g5f7", "h8g8", "f7d8"],
  },
  {
    id: "hb-fk2", theme: "fork", rating: 1200,
    fen: "3r3k/6pp/8/6N1/8/8/8/6K1 w - - 0 1",
    solution: ["g5f7", "h8g8", "f7d8"],
  },
  {
    id: "hb-m1", theme: "mateIn1", rating: 800,
    fen: "6k1/R4ppp/8/8/8/8/5PPP/6K1 w - - 0 1",
    solution: ["a7a8"],
  },
  {
    id: "hb-end1", theme: "endgame", rating: 1000,
    fen: "6k1/8/6K1/8/8/8/8/1Q6 w - - 0 1",
    solution: ["b1b8"],
  },
];

function toPuzzle(e: BankEntry): Puzzle {
  return {
    id: e.id,
    rating: e.rating,
    themes: [e.theme],
    fen: e.fen,
    solution: e.solution,
    playerColor: new Chess(e.fen).turn(),
    url: "",
  };
}

const ALL = ENTRIES.map(toPuzzle);

/** Bank puzzles for a theme, or the whole bank if we have none for it. */
export function bankFor(theme: string): Puzzle[] {
  const matches = ALL.filter((p) => p.themes.includes(theme));
  return matches.length ? matches : ALL;
}

/** Deterministic "puzzle of the day" from the bank — the offline fallback when
 *  the live daily feed is unreachable. `seed` is a day index, so it's stable
 *  for a given day and rotates through the bank. */
export function dailyFromBank(seed: number): Puzzle {
  const i = ((seed % ALL.length) + ALL.length) % ALL.length;
  return ALL[i];
}
