import { Chess } from "chess.js";
import { reconstructMoves } from "../src/lib/chess/snapMove";
import { parseGame } from "../src/lib/chess/parseGame";

// Regression suite for the scoresheet move reconstructor (src/lib/chess/snapMove).
// Each case feeds OCR-style tokens (with the handwriting misreads a real scan
// produces) and asserts the beam recovers a legal game — the right one, not a
// plausible fabrication. Run: `npm run verify:scan`.
//
// The headline case is a real 76-move tournament game (Cherian–Chambers, JCF
// 2026) scanned across two sheets, whose handwriting confuses a↔g, b↔h and R↔K
// and drops/crosses out moves. It must reconstruct to its true finish, `Qe8#`.

const tok = (s: string): string[] =>
  s.replace(/\d+\.(\.\.)?/g, " ").split(/\s+/).filter(Boolean);

const legalReplay = (sans: string[]): { legal: boolean; mate: boolean } => {
  const c = new Chess();
  let legal = true;
  for (const m of sans) {
    try {
      c.move(m);
    } catch {
      legal = false;
    }
  }
  return { legal, mate: c.isCheckmate() };
};

interface Case {
  id: string;
  run: () => string; // returns "OK ..." on pass, anything else = fail
}

// Cherian–Chambers, raw OCR WITH the sheet's misreads baked in:
//   11.Ba5 (g→a)  22.Rb4 (e→b)  32…Rg7 (K→R)  41.Rxg6 (a→g)  45…Rxb2 (h→b)
//   48.Kf4 / 50.Re5 (king-march squares the beam fixes via legality)
const CHERIAN_RAW =
  "e4 d5 exd5 Nf6 Nf3 Nxd5 d4 Nc6 Bb5 Bd7 c4 Nf6 Nc3 a6 Ba4 e6 Bf4 Bb4 O-O O-O " +
  "Ba5 Bxc3 bxc3 Qe7 Bxf6 Qxf6 d5 Nb8 Bxd7 Nxd7 dxe6 Qxe6 Re1 Qc6 Re7 Rad8 Qe2 Nb6 Ne5 Qd6 " +
  "Ng4 Nxc4 Rb4 Nb6 g3 f5 Re6 Qd3 Qxd3 Rxd3 Ne5 Rxc3 Re7 Nd5 Rd7 Nb6 Rd4 Re8 f4 g5 " +
  "Rad1 gxf4 gxf4 Rg7 Nd7 Rd8 Nxb6 Rxd4 Rxd4 cxb6 Rd7+ Kg6 Rxb7 Rc1+ Kg2 Rc2+ Kg3 b5 Rb6+ Kh5 " +
  "Rxg6 Rc3+ Kf2 Kg4 a4 bxa4 Rxa4 Rc2+ Ke3 Rxb2 Ra7 h5 Rg7+ Kh3 Kf4 Rg2 Rh7 h4 Re5 Kg4 " +
  "Rg7+ Kf3 Rh7 Kg4 Kf6 Kxf4 Rxh4 Rg4 Rh1 Ke4 Re1+ Kf4 Re5 Rg6+ Kxg6 Kxe5 Kg5 Ke4 Kh4 Ke3 " +
  "Kg3 f4 Kg2 Ke2 Kg1 f3 Kh2 f2 Kg3 f1=Q Kg4 Qf2 Kg5 Qf3 Kg6 Qf4 Kg7 Qf5 Kg8 Qe7 " +
  "Kh7 Kf3 Kg8 Kg4 Kh7 Kg5 Kg8 Qe7 Kh8 Kg6 Kg8 Qe8#";

const CASES: Case[] = [
  {
    id: "cherian-chambers-2sheet",
    run: () => {
      const r = reconstructMoves(CHERIAN_RAW.split(/\s+/));
      const { legal, mate } = legalReplay(r.sans);
      if (!legal) return "FAIL not a legal game";
      if (!mate) return "FAIL does not end in checkmate";
      if (r.sans.length !== 152) return `FAIL placed ${r.sans.length}/152 plies`;
      // True moves the confusions must resolve to (not the misread):
      const want: Record<number, string> = { 42: "Re4", 63: "Kg7", 80: "Rxa6", 89: "Rxh2" };
      for (const [i, san] of Object.entries(want))
        if (r.sans[+i] !== san) return `FAIL ply ${i} = ${r.sans[+i]}, want ${san}`;
      if (r.corrections.length > 12) return `FAIL ${r.corrections.length} corrections (fabricating?)`;
      return `OK 152 plies → Qe8#, ${r.corrections.length} corrections, ${r.inferred.length} bridged`;
    },
  },
  {
    id: "lock-in-corrections-is-lossless",
    run: () => {
      // "Lock in corrections" persists the reconstructed game as clean PGN. That
      // must be loss-free: re-parsing it has to yield the IDENTICAL moves with
      // zero further corrections (i.e. it now hits the instant fast-path loader).
      const r = reconstructMoves(CHERIAN_RAW.split(/\s+/));
      let pgn = "";
      for (let i = 0; i < r.sans.length; i++) {
        if (i % 2 === 0) pgn += `${i / 2 + 1}. `;
        pgn += `${r.sans[i]} `;
      }
      const re = parseGame(pgn.trim());
      if (re.moves.length !== r.sans.length)
        return `FAIL re-parse ${re.moves.length} vs ${r.sans.length} plies`;
      for (let i = 0; i < r.sans.length; i++)
        if (re.moves[i] !== r.sans[i]) return `FAIL ply ${i}: ${re.moves[i]} ≠ ${r.sans[i]}`;
      if (re.corrections.length !== 0)
        return `FAIL re-parse still needed ${re.corrections.length} corrections`;
      const { mate } = legalReplay(re.moves);
      if (!mate) return "FAIL locked-in game no longer ends in mate";
      return `OK reconstruct→PGN→re-parse identical (${r.sans.length} plies, fast-path, 0 edits)`;
    },
  },
  {
    id: "clean-game-no-edits",
    run: () => {
      const r = reconstructMoves(
        tok("1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6 8. c3 O-O"),
      );
      if (r.sans.length !== 16) return `FAIL placed ${r.sans.length}/16`;
      if (r.corrections.length !== 0) return `FAIL ${r.corrections.length} corrections on a clean game`;
      if (r.inferred.length !== 0) return `FAIL ${r.inferred.length} bridges on a clean game`;
      return "OK clean game, 0 edits";
    },
  },
  {
    id: "confusion-a-g",
    run: () => {
      // 11.Bg5 written "Ba5"; must NOT stay illegal and must reach the real move
      // (Bg5 or its convergent twin Be5 — both trade on f6 next).
      const r = reconstructMoves(tok("1. d4 Nf6 2. Bf4 g6 3. Ba5"));
      const last = r.sans[r.sans.length - 1];
      if (!["Bg5", "Be5", "Bd6", "Bg3", "Bc7"].includes(last)) return `FAIL Ba5 → ${last}`;
      return `OK a↔g recovered (Ba5 → ${last})`;
    },
  },
    // (R↔K confusion is exercised by the headline case: ply 63 "Rg7" → "Kg7".)
  {
    id: "crossed-out-ignored",
    run: () => {
      // A struck-through scribble mid-game must be dropped, not forced onto the
      // board, and the real moves around it stay intact.
      const r = reconstructMoves(tok("1. e4 e5 2. Nf3 Nc6 3. Bb5 zzz a6 4. Ba4 Nf6"));
      if (r.sans.length !== 8) return `FAIL placed ${r.sans.length}/8`;
      if (r.ignored.length !== 1) return `FAIL ignored ${r.ignored.length} tokens, want 1`;
      if (r.corrections.length !== 0) return `FAIL ${r.corrections.length} corrections`;
      return `OK crossed-out token ignored ("${r.ignored[0]}")`;
    },
  },
  {
    id: "mate-annotation-anchor",
    run: () => {
      // Illegal destination, but the "#" forces the only mating move.
      const r = reconstructMoves(tok("1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6 4. Qxf2#"));
      const last = r.sans[r.sans.length - 1];
      if (last !== "Qxf7#") return `FAIL Qxf2# → ${last}, want Qxf7#`;
      return "OK '#' anchor pulled the real mate";
    },
  },
  {
    id: "spurious-token-skipped",
    run: () => {
      const r = reconstructMoves(tok("1. e4 e5 2. Nf3 Qz9 Nc6 3. Bb5 a6"));
      if (r.corrections.length !== 0) return `FAIL ${r.corrections.length} corrections (should skip junk)`;
      if (r.sans.length !== 6) return `FAIL placed ${r.sans.length}/6`;
      return "OK junk token skipped, real moves intact";
    },
  },
  {
    id: "promotion-canonicalized",
    run: () => {
      // "h8Q" / "h8(Q)" / "h8=Q" should all read as the promotion-with-capture.
      for (const form of ["gxh8Q", "gxh8(Q)", "gxh8=Q"]) {
        const r = reconstructMoves(tok(`1. h4 a5 2. h5 a4 3. h6 a3 4. hxg7 axb2 5. ${form}`));
        const last = r.sans[r.sans.length - 1];
        if (!last?.includes("=Q")) return `FAIL "${form}" → ${last}`;
      }
      return "OK promotions canonicalized (gxh8Q / gxh8(Q) / gxh8=Q)";
    },
  },
];

let pass = 0;
for (const c of CASES) {
  let res: string;
  try {
    res = c.run();
  } catch (e) {
    res = `FAIL threw ${(e as Error).message}`;
  }
  const ok = res.startsWith("OK");
  if (ok) pass++;
  console.log(`${ok ? "✓" : "✗"} ${c.id}: ${res}`);
}
console.log(`\n${pass}/${CASES.length} reconstruction checks passed`);
if (pass !== CASES.length) process.exit(1);
