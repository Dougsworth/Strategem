import { Chess, type Square, type Color, type PieceSymbol } from "chess.js";

// Best-effort tactical-motif detection.
//
// IMPORTANT: these are heuristics, not a tactics solver. We label a *move* with
// the motifs it exhibits (a knight landing on a square that hits two heavy
// pieces = a fork, a rook delivering mate on the back rank = a back-ranker,
// etc.). The report then asks, per motif: "when this kind of tactic was on the
// board, did the student play it?" — which yields an estimate, clearly flagged
// as such in the UI. It is good enough to surface a pattern, not to grade a GM.

export type Motif = "fork" | "pinskewer" | "backrank" | "discovered";

const VALUE: Record<PieceSymbol, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 100,
};

const FILES = "abcdefgh";

function fileRank(sq: Square): [number, number] {
  return [FILES.indexOf(sq[0]), Number(sq[1]) - 1];
}

function sq(file: number, rank: number): Square | null {
  if (file < 0 || file > 7 || rank < 0 || rank > 7) return null;
  return `${FILES[file]}${rank + 1}` as Square;
}

/** Squares strictly between two squares on a shared rank/file/diagonal. */
function between(a: Square, b: Square): Square[] {
  const [af, ar] = fileRank(a);
  const [bf, br] = fileRank(b);
  const df = Math.sign(bf - af);
  const dr = Math.sign(br - ar);
  const sameLine =
    af === bf || ar === br || Math.abs(bf - af) === Math.abs(br - ar);
  if (!sameLine) return [];
  const out: Square[] = [];
  let f = af + df;
  let r = ar + dr;
  while (f !== bf || r !== br) {
    const s = sq(f, r);
    if (!s) break;
    out.push(s);
    f += df;
    r += dr;
  }
  return out;
}

const ROOK_DIRS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];
const BISHOP_DIRS = [
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

function slideDirs(piece: PieceSymbol): number[][] {
  if (piece === "r") return ROOK_DIRS;
  if (piece === "b") return BISHOP_DIRS;
  if (piece === "q") return [...ROOK_DIRS, ...BISHOP_DIRS];
  return [];
}

interface Located {
  square: Square;
  type: PieceSymbol;
  color: Color;
}

function allPieces(game: Chess): Located[] {
  const out: Located[] = [];
  for (const row of game.board()) {
    for (const cell of row) {
      if (cell) out.push({ square: cell.square, type: cell.type, color: cell.color });
    }
  }
  return out;
}

/**
 * Pieces of `color` that are currently hanging: attacked by the enemy and
 * either undefended, or capturable by a cheaper piece (a winning trade for the
 * opponent). A lightweight static-exchange approximation.
 */
export function hangingPieces(game: Chess, color: Color): Located[] {
  const enemy: Color = color === "w" ? "b" : "w";
  const out: Located[] = [];
  for (const p of allPieces(game)) {
    if (p.color !== color || p.type === "k") continue;
    const attackers = game.attackers(p.square, enemy);
    if (attackers.length === 0) continue;
    const defenders = game.attackers(p.square, color);
    const cheapestAttacker = Math.min(
      ...attackers.map((a) => VALUE[game.get(a)!.type]),
    );
    // Undefended and attacked → hanging. Or a cheaper piece can take it.
    if (defenders.length === 0 || cheapestAttacker < VALUE[p.type]) {
      out.push(p);
    }
  }
  return out;
}

/** Is the piece on `square` (of `color`) hanging — capturable for a net gain? */
function isHanging(game: Chess, square: Square, color: Color): boolean {
  const enemy: Color = color === "w" ? "b" : "w";
  const piece = game.get(square);
  if (!piece) return false;
  const attackers = game.attackers(square, enemy);
  if (attackers.length === 0) return false;
  const defenders = game.attackers(square, color);
  const cheapestAttacker = Math.min(
    ...attackers.map((a) => VALUE[game.get(a)!.type]),
  );
  return defenders.length === 0 || cheapestAttacker < VALUE[piece.type];
}

/** Parse a UCI move string into a chess.js move object. */
function uciToMove(uci: string) {
  return {
    from: uci.slice(0, 2) as Square,
    to: uci.slice(2, 4) as Square,
    promotion: uci.length > 4 ? (uci[4] as PieceSymbol) : undefined,
  };
}

/**
 * Detect the tactical motifs a move exhibits. `fenBefore` is the position
 * before the move; `uci` is the move (e.g. "e5c6", "g7g8q").
 */
export function motifsOfMove(fenBefore: string, uci: string): Set<Motif> {
  const found = new Set<Motif>();
  const game = new Chess(fenBefore);
  let move;
  try {
    move = game.move(uciToMove(uci));
  } catch {
    return found; // illegal / mismatched move — skip silently
  }
  if (!move) return found;

  const mover: Color = move.color;
  const enemy: Color = mover === "w" ? "b" : "w";
  const to = move.to as Square;
  const from = move.from as Square;

  // Back-rank mate: checkmate with the mated king on its own first rank.
  if (game.isCheckmate()) {
    const matedKing = allPieces(game).find(
      (p) => p.type === "k" && p.color === enemy,
    );
    if (matedKing) {
      const backRank = enemy === "w" ? "1" : "8";
      if (matedKing.square[1] === backRank) found.add("backrank");
    }
  }

  // Fork / double attack: the moved piece now hits 2+ valuable enemy targets —
  // but only if the forking piece isn't simply hanging (which would mean the
  // "fork" just loses material). Tightening this cuts false positives.
  if (!isHanging(game, to, mover)) {
    const targets = allPieces(game).filter((p) => {
      if (p.color !== enemy) return false;
      if (!game.attackers(p.square, mover).includes(to)) return false;
      const movedValue = VALUE[move.piece];
      const defended = game.attackers(p.square, enemy).length > 0;
      return p.type === "k" || VALUE[p.type] >= movedValue || !defended;
    });
    if (targets.length >= 2) found.add("fork");
  }

  // Pin / skewer: a sliding move that lines up two enemy pieces.
  for (const [df, dr] of slideDirs(move.piece)) {
    const [tf, tr] = fileRank(to);
    let f = tf + df;
    let r = tr + dr;
    let first: Located | null = null;
    while (true) {
      const s = sq(f, r);
      if (!s) break;
      const occ = game.get(s);
      if (occ) {
        if (occ.color === mover) break; // own piece blocks the line
        if (!first) {
          first = { square: s, type: occ.type, color: occ.color };
        } else {
          // Two enemy pieces in a row → pin (king behind) or skewer.
          if (occ.type === "k" || VALUE[occ.type] > VALUE[first.type]) {
            found.add("pinskewer");
          }
          break;
        }
      }
      f += df;
      r += dr;
    }
  }

  // Discovered attack: vacating `from` unveils a friendly slider hitting an
  // enemy queen/rook/king it couldn't reach before.
  for (const target of allPieces(game)) {
    if (target.color !== enemy) continue;
    if (!["q", "r", "k"].includes(target.type)) continue;
    const attackers = game.attackers(target.square, mover);
    for (const a of attackers) {
      if (a === to) continue; // that's the moved piece itself
      if (between(a, target.square).includes(from)) {
        found.add("discovered");
      }
    }
  }

  return found;
}
