import { Chess } from "chess.js";

// Smart move reconstruction for OCR'd scoresheets. Instead of demanding a
// perfect token, we ask chess.js for the LEGAL moves in the position and snap
// the scanned text to the most plausible one. The chess rules ARE the engine:
//   • no leading piece letter  → it's a pawn move (e4, exd5, e8=Q)
//   • a leading K/Q/R/B/N      → that piece
//   • the destination square is the strongest signal
//   • capture 'x' and promotion are matched too
// Handwriting/OCR look-alikes (c↔e, b↔d, 1↔7, a↔o …) are forgiven, so "c4"
// snaps to a legal "e4", "Bb5" to "Bd5", "o6" to "a6".
//
// We match what the player WROTE (closest legal move to the text), never the
// engine's "best" move — a scoresheet records the actual game, blunders and all.

export interface SnapResult {
  san: string;
  /** True when we had to correct the token to a legal move. */
  corrected: boolean;
}

// Symmetric look-alike pairs across letters (files / pieces) and digits (ranks).
const PAIRS: [string, string][] = [
  ["a", "o"], ["a", "d"], ["a", "e"], ["b", "d"], ["b", "h"], ["c", "e"],
  ["c", "o"], ["f", "t"], ["g", "q"], ["h", "n"], ["n", "m"], ["l", "1"],
  ["o", "0"], ["1", "7"], ["3", "8"], ["5", "6"], ["5", "8"], ["6", "8"],
  ["6", "0"], ["2", "7"], ["4", "9"],
];
const CSET = new Set<string>();
for (const [a, b] of PAIRS) {
  CSET.add(`${a}|${b}`);
  CSET.add(`${b}|${a}`);
}
function confusable(a: string, b: string): boolean {
  const x = a.toLowerCase();
  const y = b.toLowerCase();
  return x === y || CSET.has(`${x}|${y}`);
}

function norm(s: string): string {
  return s
    .replace(/0/g, "O") // zero → letter O (castling)
    .replace(/e\.?p\.?/gi, "")
    .replace(/[+#!?]+/g, "")
    .trim();
}

function subCost(a: string, b: string): number {
  if (a === b) return 0;
  if (a.toLowerCase() === b.toLowerCase()) return 0.2;
  if (confusable(a, b)) return 0.4;
  return 1;
}

function weightedLev(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + subCost(a[i - 1], b[j - 1]),
      );
    }
  }
  return dp[m][n];
}

// How far a candidate destination is from the scanned one — 0 = same, small for
// a single look-alike slip, large for a genuinely different square.
function destPenalty(cand: string, scanned: string): number {
  let d = 0;
  for (const k of [0, 1]) {
    if (cand[k] === scanned[k]) continue;
    d += confusable(cand[k], scanned[k]) ? 0.5 : 2;
  }
  return d;
}

/**
 * Apply the best legal move matching `rawToken` to `chess` (mutates it on a
 * successful match). Returns the SAN + whether it was corrected, or null when
 * even the best candidate is too unlike the token (caller should flag it).
 */
export function snapMove(chess: Chess, rawToken: string): SnapResult | null {
  const token = norm(rawToken);
  if (!token) return null;

  // Exact legal move? (handles the clean case, incl. pawn moves with no letter)
  try {
    const m = chess.move(token);
    if (m) return { san: m.san, corrected: false };
  } catch {
    /* not legal as-written — fall through to fuzzy snap */
  }

  const legal = chess.moves({ verbose: true }) as unknown as {
    san: string;
    to: string;
    piece: string;
    captured?: string;
    promotion?: string;
  }[];
  if (legal.length === 0) return null;

  // Destination: prefer a real square; else a look-alike file (e.g. "o6") so a
  // garbled file letter still gives us a target (destPenalty forgives it).
  let dest = (token.match(/[a-h][1-8]/g) || []).pop() ?? null;
  if (!dest) {
    const loose = (token.match(/[a-z][1-8]/gi) || []).pop();
    if (loose) dest = loose.toLowerCase();
  }
  const pieceLetter = /^[KQRBN]/.test(token) ? token[0] : null;
  const isCapture = /x/i.test(token);
  const promo = token.match(/=([QRBN])/i)?.[1]?.toUpperCase() ?? null;

  let best: { san: string } | null = null;
  let bestScore = -Infinity;

  for (const mv of legal) {
    let score = 0;

    // Destination square — the dominant signal (confusion-aware).
    if (dest) score += 4 - destPenalty(mv.to, dest);

    // Piece: explicit letter must match; no letter → it's a pawn.
    if (pieceLetter) score += mv.piece.toUpperCase() === pieceLetter ? 2 : -3;
    else score += mv.piece === "p" ? 1.5 : -1.5;

    // Capture + promotion agreement.
    if (isCapture) score += mv.captured ? 1 : -1;
    if (promo) score += mv.promotion?.toUpperCase() === promo ? 1.5 : -0.5;

    // Tie-break on overall text similarity (confusion-aware).
    score += -0.5 * weightedLev(token, norm(mv.san));

    if (score > bestScore) {
      bestScore = score;
      best = { san: mv.san };
    }
  }

  // Only auto-correct when we're reasonably confident; else let the caller flag.
  if (best && bestScore >= 4) {
    const m = chess.move(best.san);
    if (m) return { san: m.san, corrected: true };
  }
  return null;
}
