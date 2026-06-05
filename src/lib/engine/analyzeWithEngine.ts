import { Chess } from "chess.js";
import { evaluate, type PosEval } from "./stockfish";
import {
  winPercentFromCp,
  accuracyFromWinPercents,
  blendAccuracies,
} from "../analysis/accuracy";

// Full-game engine analysis: evaluate every position, then derive per-move
// accuracy + classification with Lichess's exact win%/accuracy model (the same
// `accuracy.ts` the student report uses — the engine just supplies the cp the
// Lichess analysis used to). Reuses the heuristic curve's shape but with a real
// evaluation instead of material.

export type MoveClass = "best" | "good" | "inaccuracy" | "mistake" | "blunder";

export interface EngineMove {
  ply: number; // 0-based
  san: string;
  side: "w" | "b";
  /** Win% for WHITE after this move (0–100) — drives the eval curve. */
  winWhite: number;
  /** Centipawns lost vs best (from the mover's view), capped. */
  cpLoss: number;
  classification: MoveClass;
}

export interface EngineAnalysis {
  /** Win% for WHITE at each position 0..N (the eval curve). */
  winWhite: number[];
  moves: EngineMove[];
  accuracyWhite: number;
  accuracyBlack: number;
  /** ms per position the engine was given. */
  movetime: number;
}

const MATE_CP = 10000;
const CP_CAP = 1000;

function toCpWhite(e: PosEval): number {
  if (e.mate !== null) return e.mate > 0 ? MATE_CP : -MATE_CP;
  return e.cp ?? 0;
}

// Classify by win% the mover gave up (Lichess-style thresholds).
function classify(drop: number, cpLoss: number): MoveClass {
  if (drop >= 30) return "blunder";
  if (drop >= 20) return "mistake";
  if (drop >= 10) return "inaccuracy";
  return cpLoss <= 20 ? "best" : "good";
}

const cache = new Map<string, EngineAnalysis>();

export interface AnalyzeOpts {
  movetime?: number;
  onProgress?: (done: number, total: number) => void;
  signal?: { aborted: boolean };
}

export async function analyzeWithEngine(
  sans: string[],
  opts: AnalyzeOpts = {},
): Promise<EngineAnalysis> {
  const movetime = opts.movetime ?? 80;
  const key = `${sans.join(" ")}|t${movetime}`;
  const hit = cache.get(key);
  if (hit) {
    opts.onProgress?.(hit.winWhite.length, hit.winWhite.length);
    return hit;
  }

  // Positions 0..N (initial + after each ply).
  const chess = new Chess();
  const fens: string[] = [chess.fen()];
  for (const s of sans) {
    chess.move(s);
    fens.push(chess.fen());
  }

  const cpWhite: number[] = [];
  for (let i = 0; i < fens.length; i++) {
    if (opts.signal?.aborted) throw new Error("aborted");
    // Terminal positions (mate / stalemate) have no legal moves — the engine
    // would stall on `go`, so resolve them directly and correctly.
    const pos = new Chess(fens[i]);
    if (pos.isCheckmate()) {
      cpWhite.push(pos.turn() === "w" ? -MATE_CP : MATE_CP);
    } else if (pos.isGameOver()) {
      cpWhite.push(0); // stalemate / draw
    } else {
      cpWhite.push(toCpWhite(await evaluate(fens[i], movetime)));
    }
    opts.onProgress?.(i + 1, fens.length);
  }

  const winWhite = cpWhite.map((cp) => winPercentFromCp(cp));
  const moves: EngineMove[] = [];
  const accW: number[] = [];
  const accB: number[] = [];

  for (let i = 0; i < sans.length; i++) {
    const side: "w" | "b" = i % 2 === 0 ? "w" : "b";
    const sign = side === "w" ? 1 : -1;
    const winBefore = winPercentFromCp(sign * cpWhite[i]);
    const winAfter = winPercentFromCp(sign * cpWhite[i + 1]);
    const acc = accuracyFromWinPercents(winBefore, winAfter);
    const cpLoss = Math.max(0, Math.min(CP_CAP, sign * (cpWhite[i] - cpWhite[i + 1])));
    const classification = classify(Math.max(0, winBefore - winAfter), cpLoss);
    moves.push({ ply: i, san: sans[i], side, winWhite: winWhite[i + 1], cpLoss, classification });
    (side === "w" ? accW : accB).push(acc);
  }

  const analysis: EngineAnalysis = {
    winWhite,
    moves,
    accuracyWhite: Math.round(blendAccuracies(accW) * 10) / 10,
    accuracyBlack: Math.round(blendAccuracies(accB) * 10) / 10,
    movetime,
  };
  cache.set(key, analysis);
  return analysis;
}
