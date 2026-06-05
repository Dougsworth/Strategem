import { Chess } from "chess.js";
import type { Phase } from "../types";
import { classifyPhase } from "../chess/phase";
import { motifsOfMove, hangingPieces, type Motif } from "./motifs";

// Single-game analysis from the reconstructed legal moves — NO engine required
// (that's the future stockfish.wasm upgrade). It reuses the same heuristics the
// student report runs on Lichess games: phase classification, tactical-motif
// detection, hanging-piece (loose material) detection, plus a material balance
// curve. Pure + serializable, so it runs in the reconstruction worker.

const VAL: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const PIECE_NAME: Record<string, string> = {
  p: "pawn", n: "knight", b: "bishop", r: "rook", q: "queen", k: "king",
};
const MOTIF_LABEL: Record<Motif, string> = {
  fork: "Fork",
  pinskewer: "Pin / skewer",
  backrank: "Back-rank threat",
  discovered: "Discovered attack",
};

export interface KeyMoment {
  ply: number; // 0-based index into the move list
  san: string;
  side: "w" | "b";
  kind: "tactic" | "loose" | "mate";
  label: string;
}

export interface GameInsights {
  /** Material balance (white − black, in pawns) after each ply — the curve. */
  material: number[];
  phases: Record<Phase, number>;
  captures: number;
  checks: number;
  keyMoments: KeyMoment[];
  result: "1-0" | "0-1" | "1/2-1/2" | "*";
}

function materialBalance(game: Chess): number {
  let bal = 0;
  for (const row of game.board()) {
    for (const cell of row) {
      if (cell) bal += (cell.color === "w" ? 1 : -1) * VAL[cell.type];
    }
  }
  return bal;
}

export function analyzeGame(sans: string[]): GameInsights {
  const chess = new Chess();
  const material: number[] = [];
  const phases: Record<Phase, number> = { opening: 0, middlegame: 0, endgame: 0 };
  const keyMoments: KeyMoment[] = [];
  let captures = 0;
  let checks = 0;

  for (let i = 0; i < sans.length; i++) {
    const fenBefore = chess.fen();
    const phase = classifyPhase(chess, chess.moveNumber());
    let move;
    try {
      move = chess.move(sans[i]);
    } catch {
      break; // shouldn't happen on reconstructed moves, but stay defensive
    }
    if (!move) break;

    const side = move.color as "w" | "b";
    phases[phase] += 1;
    if (move.captured) captures += 1;
    const mate = move.san.includes("#");
    if (move.san.includes("+") || mate) checks += 1;
    material.push(materialBalance(chess));

    // Tactical motifs the move created (fork / pin / back-rank / discovered).
    const motifs = [...motifsOfMove(fenBefore, move.lan)];

    // Did the move leave a FREE minor+ piece (undefended & attacked)? A cheap,
    // engine-free "loose material" flag — advisory, not a verdict. We skip the
    // piece that just made an even-or-better capture: its recapture is an
    // expected trade, not a hung piece.
    let loose: { type: string; square: string } | null = null;
    const isExpectedTrade =
      !!move.captured && VAL[move.captured] >= VAL[move.piece] - 1;
    for (const p of hangingPieces(chess, side)) {
      if (VAL[p.type] < 3) continue;
      if (chess.attackers(p.square, side).length > 0) continue; // defended
      if (p.square === move.to && isExpectedTrade) continue; // just traded, not hung
      if (!loose || VAL[p.type] > VAL[loose.type]) loose = { type: p.type, square: p.square };
    }

    if (mate) {
      keyMoments.push({ ply: i, san: move.san, side, kind: "mate", label: "Checkmate" });
    } else if (motifs.length) {
      keyMoments.push({ ply: i, san: move.san, side, kind: "tactic", label: MOTIF_LABEL[motifs[0]] });
    }
    if (loose) {
      keyMoments.push({
        ply: i,
        san: move.san,
        side,
        kind: "loose",
        label: `${PIECE_NAME[loose.type]} on ${loose.square} left hanging`,
      });
    }
  }

  const result: GameInsights["result"] = chess.isCheckmate()
    ? chess.turn() === "w"
      ? "0-1"
      : "1-0"
    : chess.isGameOver()
      ? "1/2-1/2"
      : "*";

  return { material, phases, captures, checks, keyMoments, result };
}
