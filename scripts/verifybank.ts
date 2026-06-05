import { Chess } from "chess.js";

// Candidate "house" puzzles. Verified below before they go in the shipped bank.
// Each: fen (position to solve), solution UCI (even = player, odd = reply),
// and an assertion type so we can prove correctness.
type Kind = "mate" | "winQueen" | "winPiece";
interface Cand {
  id: string;
  theme: string;
  rating: number;
  fen: string;
  solution: string[];
  kind: Kind;
}

const CANDS: Cand[] = [
  // Back-rank mates ---------------------------------------------------------
  {
    id: "hb-br1", theme: "backRankMate", rating: 900,
    fen: "6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1",
    solution: ["a1a8"], kind: "mate",
  },
  {
    id: "hb-br2", theme: "backRankMate", rating: 1100,
    fen: "3r2k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1",
    solution: ["d1d8"], kind: "mate",
  },
  // Knight royal forks winning the queen -----------------------------------
  {
    id: "hb-fk1", theme: "fork", rating: 1000,
    fen: "3q3k/6pp/8/6N1/8/8/8/6K1 w - - 0 1",
    solution: ["g5f7", "h8g8", "f7d8"], kind: "winQueen",
  },
  {
    id: "hb-fk2", theme: "fork", rating: 1200,
    fen: "3r3k/6pp/8/6N1/8/8/8/6K1 w - - 0 1",
    solution: ["g5f7", "h8g8", "f7d8"], kind: "winPiece",
  },
  // Simple mates in 1/2 -----------------------------------------------------
  {
    id: "hb-m1", theme: "mateIn1", rating: 800,
    fen: "6k1/R4ppp/8/8/8/8/5PPP/6K1 w - - 0 1",
    solution: ["a7a8"], kind: "mate",
  },
  {
    id: "hb-end1", theme: "endgame", rating: 1000,
    fen: "6k1/8/6K1/8/8/8/8/1Q6 w - - 0 1",
    solution: ["b1b8"], kind: "mate",
  },
];

function verify(c: Cand): string {
  const game = new Chess(c.fen);
  const player = game.turn();
  for (let i = 0; i < c.solution.length; i++) {
    const uci = c.solution[i];
    let m;
    try {
      m = game.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.slice(4) || undefined });
    } catch {
      return `FAIL illegal move ${uci} at idx ${i}`;
    }
    if (!m) return `FAIL null move ${uci}`;
    const lastPlayerMove = i === c.solution.length - 1 && i % 2 === 0;
    if (lastPlayerMove) {
      if (c.kind === "mate" && !game.isCheckmate()) return `FAIL not mate after ${uci}`;
      if (c.kind === "winQueen" && m.captured !== "q") return `FAIL didn't capture queen (${m.captured})`;
      if (c.kind === "winPiece" && !m.captured) return `FAIL didn't capture (${m.san})`;
    }
  }
  // player's first move must be by the side to move
  if (c.solution.length % 2 === 0 && c.kind !== "mate")
    return "WARN even solution length (ends on opponent move)";
  return `OK ${player} to play, ${c.solution.length} plies`;
}

let pass = 0;
for (const c of CANDS) {
  const r = verify(c);
  if (r.startsWith("OK")) pass++;
  console.log(`${r.startsWith("OK") ? "✓" : "✗"} ${c.id} (${c.theme}): ${r}`);
}
console.log(`\n${pass}/${CANDS.length} verified`);
