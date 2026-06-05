import { Chess } from "chess.js";
import { reconstructMoves } from "./snapMove";

// A game parsed from (possibly OCR'd) PGN text into a legal, steppable move list,
// plus everything the viewer needs to flag what was auto-corrected. Pure + fully
// serializable, so it can be produced inside a Web Worker (see reconstruct.worker).
export interface ParsedGame {
  moves: string[];
  headers: Record<string, string>;
  ok: boolean;
  /** Set when even the smart matcher couldn't place a move — we keep the legal prefix. */
  truncated: { atMoveNo: number; token: string } | null;
  /** Misreads we auto-corrected to a legal move, e.g. "c4" → "e4". */
  corrections: { from: string; to: string; moveIndex: number }[];
  /** Crossed-out / struck-through tokens we skipped. */
  ignored: string[];
  /** Moves the OCR DROPPED that bridge search re-inserted to keep the game legal.
   *  These aren't read from the sheet — flag them for review. */
  inferred: number[];
}

export const EMPTY_PARSED: ParsedGame = {
  moves: [],
  headers: {},
  ok: false,
  truncated: null,
  corrections: [],
  ignored: [],
  inferred: [],
};

// Lenient PGN reader. Handwriting OCR is never perfect, so we replay token-by-
// token and SNAP each one to the most plausible legal move (snapMove) — pawns
// when there's no piece letter, nearest legal move otherwise — instead of
// rejecting the game on the first imperfect token. The token-by-token beam is
// heavy on long games, so callers run this off the main thread (runParseInWorker).
export function parseGame(pgn: string): ParsedGame {
  const headers: Record<string, string> = {};
  for (const m of pgn.matchAll(/\[(\w+)\s+"([^"]*)"\]/g)) headers[m[1]] = m[2];

  // Fast path: a fully-legal game loads cleanly (no corrections needed).
  try {
    const c = new Chess();
    c.loadPgn(pgn);
    const moves = c.history();
    if (moves.length > 0) {
      return {
        moves,
        headers: { ...c.header(), ...headers },
        ok: true,
        truncated: null,
        corrections: [],
        ignored: [],
        inferred: [],
      };
    }
  } catch {
    /* fall through to the smart token-by-token replay */
  }

  const body = pgn
    .replace(/\[[^\]]*\]/g, " ") // headers
    .replace(/\{[^}]*\}/g, " ") // comments
    .replace(/\$\d+/g, " ") // NAGs
    .replace(/\b(1-0|0-1|1\/2-1\/2|\*)\b/g, " ") // results
    .replace(/\d+\.(\.\.)?/g, " "); // move numbers "12." / "12..."
  const tokens = body.split(/\s+/).filter(Boolean);

  // Beam-search reconstruction — keeps multiple legal interpretations alive so a
  // single misread doesn't derail the whole game.
  const { sans, corrections, ignored, inferred, failedToken } = reconstructMoves(tokens);
  const truncated = failedToken
    ? { atMoveNo: Math.floor(sans.length / 2) + 1, token: failedToken }
    : null;
  return { moves: sans, headers, ok: sans.length > 0, truncated, corrections, ignored, inferred };
}
