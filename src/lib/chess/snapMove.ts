import { Chess } from "chess.js";

// Smart move reconstruction for OCR'd scoresheets. The chess RULES are the
// engine: we never trust a token blindly — we score it against the LEGAL moves
// in the position and keep the most plausible reading.
//
//   • no leading piece letter  → it's a pawn move (e4, exd5, e8=Q)
//   • a leading K/Q/R/B/N      → that piece
//   • the destination square is the strongest signal
//   • capture 'x' and promotion are matched too
//   • handwriting look-alikes (c↔e, b↔d, 1↔7, a↔o …) are forgiven
//
// Crucially we DON'T decide each move in isolation (a wrong early "fix" would
// cascade and make later legal moves look illegal). `reconstructMoves` runs a
// BEAM SEARCH: it keeps several whole-game interpretations alive and lets global
// legality prune the wrong ones — so the reading that stays legal the longest
// wins. We always match what the player WROTE (closest legal move to the text),
// never the engine's "best" move — a scoresheet records the real game, blunders
// and all.

export interface SnapResult {
  san: string;
  corrected: boolean;
}

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
    .replace(/0/g, "O")
    .replace(/e\.?p\.?/gi, "")
    .replace(/[+#!?]+/g, "")
    // Canonicalize promotions: f1Q, f1(Q), f1/Q, f1 =Q → f1=Q (rank 1 or 8).
    .replace(/([a-h][18])\s*[=/(]?\s*([QRBN])\)?/i, (_m, sq, pc) => `${sq}=${pc.toUpperCase()}`)
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

function destPenalty(cand: string, scanned: string): number {
  let d = 0;
  for (const k of [0, 1]) {
    if (cand[k] === scanned[k]) continue;
    d += confusable(cand[k], scanned[k]) ? 0.5 : 2;
  }
  return d;
}

interface VerboseMove {
  san: string;
  to: string;
  piece: string;
  captured?: string;
  promotion?: string;
}

interface ParsedToken {
  token: string;
  dest: string | null;
  pieceLetter: string | null;
  isCapture: boolean;
  promo: string | null;
}

function parseToken(token: string): ParsedToken {
  let dest = (token.match(/[a-h][1-8]/g) || []).pop() ?? null;
  if (!dest) {
    const loose = (token.match(/[a-z][1-8]/gi) || []).pop();
    if (loose) dest = loose.toLowerCase();
  }
  return {
    token,
    dest,
    pieceLetter: /^[KQRBN]/.test(token) ? token[0] : null,
    isCapture: /x/i.test(token),
    promo: token.match(/=([QRBN])/i)?.[1]?.toUpperCase() ?? null,
  };
}

// How well a legal move matches the scanned token (higher = better).
function scoreMove(mv: VerboseMove, p: ParsedToken): number {
  let score = 0;
  if (p.dest) score += 4 - destPenalty(mv.to, p.dest);
  if (p.pieceLetter) score += mv.piece.toUpperCase() === p.pieceLetter ? 2 : -3;
  else score += mv.piece === "p" ? 1.5 : -1.5;
  if (p.isCapture) score += mv.captured ? 1 : -1;
  if (p.promo) {
    score += mv.promotion?.toUpperCase() === p.promo ? 1.5 : -0.5;
  } else if (mv.promotion) {
    // Promotion with no piece written → players almost always mean a queen.
    score += mv.promotion.toUpperCase() === "Q" ? 0.5 : -0.3;
  }
  score += -0.5 * weightedLev(p.token, norm(mv.san));
  return score;
}

interface Candidate {
  san: string;
  corrected: boolean;
  score: number;
}

// Ranked legal readings of a token in the given position (does NOT mutate).
// The exact legal move (if any) is included with a dominant score.
function snapCandidates(chess: Chess, rawToken: string, limit = 4): Candidate[] {
  const token = norm(rawToken);
  if (!token) return [];
  const legal = chess.moves({ verbose: true }) as unknown as VerboseMove[];
  if (legal.length === 0) return [];

  const out: Candidate[] = [];

  // Exact legal move (tried on a clone so we don't mutate the caller's board).
  try {
    const clone = new Chess(chess.fen());
    const m = clone.move(token);
    if (m) out.push({ san: m.san, corrected: false, score: 100 });
  } catch {
    /* not legal as written */
  }

  const p = parseToken(token);
  const scored = legal
    .map((mv) => ({ san: mv.san, corrected: true, score: scoreMove(mv, p) }))
    .sort((a, b) => b.score - a.score);

  for (const c of scored) {
    if (out.length >= limit) break;
    if (out.some((o) => o.san === c.san)) continue;
    if (c.score < 1.5) break; // floor — keep options, not garbage
    out.push(c);
  }
  return out.slice(0, limit);
}

/**
 * Apply the single best legal reading of `rawToken` to `chess` (mutates on a
 * match). Kept for callers that want one move; reconstructMoves is preferred.
 */
export function snapMove(chess: Chess, rawToken: string): SnapResult | null {
  const cands = snapCandidates(chess, rawToken, 1);
  const best = cands[0];
  if (!best || best.score < 4) return null;
  const m = chess.move(best.san);
  if (!m) return null;
  return { san: m.san, corrected: best.corrected };
}

interface BeamState {
  fen: string;
  sans: string[];
  corr: { from: string; to: string }[];
  ignored: string[]; // crossed-out / spurious tokens dropped mid-game
  tail: string[]; // tokens skipped since the last successful move
  score: number;
}

export interface Reconstruction {
  sans: string[];
  corrections: { from: string; to: string }[];
  /** Crossed-out / struck-through / spurious tokens skipped between real moves. */
  ignored: string[];
  /** The first token no legal interpretation could place (the game stops here). */
  failedToken: string | null;
}

// Cost of skipping a token. A confident move (esp. an exact legal match, +100)
// easily beats this, so we only skip when placing the token leads to a dead end
// — exactly what a crossed-out / spurious move causes.
const SKIP_PENALTY = 4;

/**
 * Beam-search reconstruction of a whole game from OCR'd move tokens. Keeps the
 * top few legal interpretations alive at every move (so a locally-best-but-
 * globally-wrong correction gets pruned) AND can SKIP a token entirely — which
 * recovers from crossed-out / struck-through moves the OCR picked up, leading
 * prose, smudges, or doubled tokens.
 */
export function reconstructMoves(tokens: string[], beam = 16): Reconstruction {
  let states: BeamState[] = [
    { fen: new Chess().fen(), sans: [], corr: [], ignored: [], tail: [], score: 0 },
  ];

  for (const raw of tokens) {
    if (/^\d+\.+$/.test(raw)) continue; // "12."
    if (/^(1-0|0-1|1\/2-1\/2|\*)$/.test(raw)) continue; // result

    const next: BeamState[] = [];
    for (const st of states) {
      const board = new Chess(st.fen);
      for (const cand of snapCandidates(board, raw, 4)) {
        const c2 = new Chess(st.fen);
        let m;
        try {
          m = c2.move(cand.san);
        } catch {
          m = null;
        }
        if (!m) continue;
        const editPenalty = cand.corrected ? 1.5 : 0;
        // Placing confirms any pending skips as mid-game "ignored" tokens (only
        // once the game has actually started — leading skips are just preamble).
        const ignored =
          st.sans.length > 0 && st.tail.length > 0
            ? [...st.ignored, ...st.tail]
            : st.ignored;
        next.push({
          fen: c2.fen(),
          sans: [...st.sans, m.san],
          corr: cand.corrected ? [...st.corr, { from: raw, to: m.san }] : st.corr,
          ignored,
          tail: [],
          score: st.score + cand.score - editPenalty,
        });
      }
      // Skip branch — drop this token (crossed-out / spurious / preamble).
      next.push({
        fen: st.fen,
        sans: st.sans,
        corr: st.corr,
        ignored: st.ignored,
        tail: [...st.tail, raw],
        score: st.score - SKIP_PENALTY,
      });
    }

    next.sort((a, b) => b.score - a.score);
    // De-dupe by (position + #skips-pending) so the beam stays diverse.
    const seen = new Set<string>();
    states = [];
    for (const s of next) {
      const key = `${s.fen}|${s.tail.length}`;
      if (seen.has(key)) continue;
      seen.add(key);
      states.push(s);
      if (states.length >= beam) break;
    }
  }

  const best = states.reduce(
    (a, b) => (b.score > a.score ? b : a),
    states[0] ?? { fen: "", sans: [], corr: [], ignored: [], tail: [], score: 0 },
  );
  // Tokens skipped AFTER the last real move = where the readable game ends.
  return {
    sans: best.sans,
    corrections: best.corr,
    ignored: best.ignored,
    failedToken: best.tail.length > 0 ? best.tail[0] : null,
  };
}
