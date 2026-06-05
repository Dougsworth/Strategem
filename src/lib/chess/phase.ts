import type { Chess } from "chess.js";
import type { Phase } from "../types";

// Game-phase classification from a board position.
//
// We use a material + development heuristic that any coach would recognise:
//   - Opening:     first ~10 full moves and pieces still on home squares.
//   - Endgame:     queens traded and/or very little non-pawn material left.
//   - Middlegame:  everything in between.
//
// This is intentionally explainable rather than ML-fancy — a coach can sanity
// check it, and it's stable across the bullet/blitz/rapid games students play.

const PIECE_VALUE: Record<string, number> = { q: 9, r: 5, b: 3, n: 3 };

/** Total non-pawn, non-king material still on the board (both sides). */
export function nonPawnMaterial(game: Chess): number {
  let total = 0;
  for (const row of game.board()) {
    for (const sq of row) {
      if (sq && PIECE_VALUE[sq.type]) total += PIECE_VALUE[sq.type];
    }
  }
  return total;
}

/** Whether either side still has a queen. */
function queensOn(game: Chess): boolean {
  for (const row of game.board()) {
    for (const sq of row) {
      if (sq && sq.type === "q") return true;
    }
  }
  return false;
}

/**
 * Classify the phase for the position `game` is currently in.
 * `fullMoveNumber` is taken from the FEN so we don't recompute it.
 */
export function classifyPhase(game: Chess, fullMoveNumber: number): Phase {
  const material = nonPawnMaterial(game);

  // Endgame: little material left, or queens gone with modest material.
  if (material <= 16) return "endgame";
  if (!queensOn(game) && material <= 26) return "endgame";

  // Opening: still early and the board is near-full.
  if (fullMoveNumber <= 10 && material >= 56) return "opening";
  if (fullMoveNumber <= 8) return "opening";

  return "middlegame";
}
