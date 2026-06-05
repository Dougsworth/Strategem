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
  ["a", "o"], ["a", "d"], ["a", "e"], ["a", "g"], ["b", "d"], ["b", "h"],
  ["c", "e"], ["c", "o"], ["f", "t"], ["g", "q"], ["h", "n"],
  ["n", "m"], ["l", "1"], ["o", "0"], ["1", "7"], ["3", "8"], ["5", "6"],
  ["5", "8"], ["6", "8"], ["6", "0"], ["2", "7"], ["4", "9"],
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

// Piece letters that look alike in handwriting (K↔R is the classic — both are
// tall with a vertical stroke + angles). Used so an OCR'd "Kb4" can still match
// a legal "Rb4" with only a soft penalty.
const PIECE_CONFUSE = new Set(["K|R", "R|K", "B|R", "R|B", "Q|O", "O|Q"]);
function pieceConfusable(a: string, b: string): boolean {
  return a === b || PIECE_CONFUSE.has(`${a}|${b}`);
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
  // Annotations the writer added (high signal — players rarely write a stray #).
  // These are ANCHORS: the move we pick should deliver the check/mate they wrote.
  check: boolean;
  mate: boolean;
}

// `raw` keeps the original annotations (norm() strips them, so they must be read
// from the untouched token).
function parseToken(token: string, raw = token): ParsedToken {
  let dest = (token.match(/[a-h][1-8]/g) || []).pop() ?? null;
  if (!dest) {
    const loose = (token.match(/[a-z][1-8]/gi) || []).pop();
    if (loose) dest = loose.toLowerCase();
  }
  const mate = /#/.test(raw);
  return {
    token,
    dest,
    pieceLetter: /^[KQRBN]/.test(token) ? token[0] : null,
    isCapture: /x/i.test(token),
    promo: token.match(/=([QRBN])/i)?.[1]?.toUpperCase() ?? null,
    mate,
    check: !mate && /\+/.test(raw),
  };
}

// How well a legal move matches the scanned token (higher = better).
function scoreMove(mv: VerboseMove, p: ParsedToken): number {
  let score = 0;
  if (p.dest) score += 4 - destPenalty(mv.to, p.dest);
  if (p.pieceLetter) {
    const mvPiece = mv.piece.toUpperCase();
    if (mvPiece === p.pieceLetter) score += 2;
    else if (pieceConfusable(mvPiece, p.pieceLetter)) score += -0.5; // look-alike
    else score += -3;
  } else score += mv.piece === "p" ? 1.5 : -1.5;
  if (p.isCapture) score += mv.captured ? 1 : -1;
  if (p.promo) {
    score += mv.promotion?.toUpperCase() === p.promo ? 1.5 : -0.5;
  } else if (mv.promotion) {
    // Promotion with no piece written → players almost always mean a queen.
    score += mv.promotion.toUpperCase() === "Q" ? 0.5 : -0.3;
  }
  // Check / mate annotations are ANCHORS. A written '#' is near-certain, so a
  // move that actually mates is strongly preferred and one that doesn't is
  // heavily penalised. We never penalise a checking/mating move that simply
  // wasn't annotated — players omit '+'/'#' all the time.
  const sanMate = mv.san.includes("#");
  const sanCheck = mv.san.includes("+");
  if (p.mate) score += sanMate ? 3 : -4;
  if (p.check) score += sanCheck ? 1 : -2;
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

  const p = parseToken(token, rawToken);
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

interface Correction {
  from: string;
  to: string;
  /** Index in `sans` of the corrected move (for jump-to). */
  moveIndex: number;
}

interface BeamState {
  fen: string;
  sans: string[];
  corr: Correction[];
  ignored: string[]; // crossed-out / spurious tokens dropped mid-game
  tail: string[]; // tokens skipped since the last successful move
  inferred: number[]; // sans indexes of bridge moves the OCR dropped
  inserts: number; // consecutive bridge inserts (capped, anti-runaway)
  score: number;
}

export interface Reconstruction {
  sans: string[];
  corrections: Correction[];
  /** Crossed-out / struck-through / spurious tokens skipped between real moves. */
  ignored: string[];
  /** sans indexes of moves the OCR DROPPED that bridge search re-inserted to
   *  re-sync the stream (not written on the sheet — surface for review). */
  inferred: number[];
  /** The first token no legal interpretation could place (the game stops here). */
  failedToken: string | null;
}

// Cost of skipping a token. A confident move (esp. an exact legal match, +100)
// easily beats this, so we only skip when placing the token leads to a dead end
// — exactly what a crossed-out / spurious move causes.
const SKIP_PENALTY = 4;
// Cost of INSERTING a move the OCR missed (bridge search). Dearer than a skip so
// it's a genuine last resort — only taken when inserting a connective move makes
// the NEXT written move legal again (i.e. it demonstrably re-syncs the stream),
// never a blind guess. Capped per run of inserts to stop runaway invention.
const INSERT_PENALTY = 5;
const MAX_INSERT = 1;
// Only bridge when the token scores BELOW this directly — i.e. it genuinely can't
// be read as any legal move in this position (the dropped-move symptom). A normal
// correction scores well above this, so misreads stay corrections, not inserts.
const INSERT_GATE = 2;
// Only states within this score margin of the round's leader attempt inserts.
const INSERT_MARGIN = 6;
// A token matches "strongly" if it's an exact legal move (100) or a high-scoring
// snap — used to gate bridge inserts (only bridge toward a strong re-sync).
const STRONG = 6;

/**
 * Beam-search reconstruction of a whole game from OCR'd move tokens. Keeps the
 * top few legal interpretations alive at every move (so a locally-best-but-
 * globally-wrong correction gets pruned) AND can SKIP a token entirely — which
 * recovers from crossed-out / struck-through moves the OCR picked up, leading
 * prose, smudges, or doubled tokens.
 */
export function reconstructMoves(tokens: string[], beam = 24): Reconstruction {
  let states: BeamState[] = [
    { fen: new Chess().fen(), sans: [], corr: [], ignored: [], tail: [], inferred: [], inserts: 0, score: 0 },
  ];
  // Goal anchor: if the writer marked the last move as mate, the reconstruction
  // should END in mate. We use this to break ties at the finish line.
  const lastMove = [...tokens].reverse().find((t) => !/^\d+\.+$/.test(t) && !/^(1-0|0-1|1\/2-1\/2|\*)$/.test(t));
  const wantsMate = !!lastMove && /#/.test(lastMove);

  for (const raw of tokens) {
    if (/^\d+\.+$/.test(raw)) continue; // "12."
    if (/^(1-0|0-1|1\/2-1\/2|\*)$/.test(raw)) continue; // result

    const next: BeamState[] = [];
    // Bridge inserts are expensive (O(legal²) per state), so only the leading
    // states even attempt them — a branch already far behind can't win by
    // inserting a move the others didn't need.
    const topScore = states.reduce((mx, s) => Math.max(mx, s.score), -Infinity);
    for (const st of states) {
      const board = new Chess(st.fen);
      const cands = snapCandidates(board, raw, 4);
      // Placing confirms any pending skips as mid-game "ignored" tokens (only
      // once the game has actually started — leading skips are just preamble).
      const ignored =
        st.sans.length > 0 && st.tail.length > 0
          ? [...st.ignored, ...st.tail]
          : st.ignored;
      for (const cand of cands) {
        const c2 = new Chess(st.fen);
        let m;
        try {
          m = c2.move(cand.san);
        } catch {
          m = null;
        }
        if (!m) continue;
        const editPenalty = cand.corrected ? 1.5 : 0;
        next.push({
          fen: c2.fen(),
          sans: [...st.sans, m.san],
          corr: cand.corrected
            ? [...st.corr, { from: raw, to: m.san, moveIndex: st.sans.length }]
            : st.corr,
          ignored,
          tail: [],
          inferred: st.inferred,
          inserts: 0, // a real placement breaks the insert run
          score: st.score + cand.score - editPenalty,
        });
      }

      // BRIDGE / INSERT branch — only when the token DOESN'T already match well
      // (the beam is struggling) and we haven't already inserted here. We try
      // each legal connective move and keep it ONLY if the written token then
      // becomes a STRONG match — i.e. the inserted move demonstrably re-syncs the
      // OCR stream (a move the writer made but the scan dropped). Never a guess.
      // Gate hard: only when the token can't be placed DIRECTLY at all (a real
      // dropped-move symptom). A confusable misread still places as a correction
      // (score well above this floor), so it never triggers an insert.
      const bestDirect = cands[0]?.score ?? -Infinity;
      if (st.inserts < MAX_INSERT && bestDirect < INSERT_GATE && st.score >= topScore - INSERT_MARGIN) {
        for (const insSan of board.moves()) {
          const b2 = new Chess(st.fen);
          let ins;
          try { ins = b2.move(insSan); } catch { ins = null; }
          if (!ins) continue;
          const after = snapCandidates(b2, raw, 1)[0];
          if (!after || after.score < STRONG) continue; // must re-sync strongly
          const b3 = new Chess(b2.fen());
          let placed;
          try { placed = b3.move(after.san); } catch { placed = null; }
          if (!placed) continue;
          const insIdx = st.sans.length;
          const editPenalty = after.corrected ? 1.5 : 0;
          // CAP the re-sync reward at a normal placement (STRONG), never the +100
          // exact-match jackpot — otherwise "insert a move, claim the next token
          // exact" out-scores honest reading and the beam fabricates.
          const gain = Math.min(after.score, STRONG);
          next.push({
            fen: b3.fen(),
            sans: [...st.sans, ins.san, placed.san],
            corr: after.corrected
              ? [...st.corr, { from: raw, to: placed.san, moveIndex: insIdx + 1 }]
              : st.corr,
            ignored,
            tail: [],
            inferred: [...st.inferred, insIdx],
            inserts: st.inserts + 1,
            score: st.score + gain - editPenalty - INSERT_PENALTY,
          });
        }
      }

      // Skip branch — drop this token (crossed-out / spurious / preamble).
      next.push({
        fen: st.fen,
        sans: st.sans,
        corr: st.corr,
        ignored: st.ignored,
        tail: [...st.tail, raw],
        inferred: st.inferred,
        inserts: st.inserts,
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

  // If the sheet says the game ended in mate, prefer interpretations that
  // actually deliver it — the endpoint disambiguates an otherwise-tied finish.
  const finishers =
    wantsMate && states.some((s) => s.sans[s.sans.length - 1]?.includes("#"))
      ? states.filter((s) => s.sans[s.sans.length - 1]?.includes("#"))
      : states;
  const best = finishers.reduce(
    (a, b) => (b.score > a.score ? b : a),
    finishers[0] ??
      { fen: "", sans: [], corr: [], ignored: [], tail: [], inferred: [], inserts: 0, score: 0 },
  );
  // Tokens skipped AFTER the last real move = where the readable game ends.
  return {
    sans: best.sans,
    corrections: best.corr,
    ignored: best.ignored,
    inferred: best.inferred,
    failedToken: best.tail.length > 0 ? best.tail[0] : null,
  };
}
