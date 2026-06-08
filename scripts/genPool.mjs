import { readFileSync, writeFileSync } from "node:fs";
import { Chess } from "chess.js";

const lines = readFileSync("/tmp/puz.csv", "utf8").split("\n");
lines.shift(); // header

// Bucket by rating/100 for an even difficulty spread; keep the most-played,
// well-liked puzzles; convert to "solve" position (apply opponent's first move).
const PER_BUCKET = 260;
const buckets = new Map(); // bucket -> array

for (const line of lines) {
  if (!line) continue;
  const col = line.split(",");
  if (col.length < 8) continue;
  const [id, fen, moves, ratingS, , popS, playsS, themes] = col;
  const rating = +ratingS, pop = +popS, plays = +playsS;
  if (!Number.isFinite(rating) || rating < 600 || rating > 2400) continue;
  if (pop < 82 || plays < 280) continue;
  const mv = moves.trim().split(" ");
  if (mv.length < 2 || mv.length > 12) continue;
  const b = Math.floor(rating / 100);
  const arr = buckets.get(b) ?? [];
  if (arr.length >= PER_BUCKET * 3) continue; // cap raw collection per bucket
  arr.push({ id, fen, mv, rating, pop, themes: themes.trim() });
  buckets.set(b, arr);
}

const out = [];
for (const [, arr] of [...buckets.entries()].sort((a, b) => a[0] - b[0])) {
  arr.sort((a, b) => b.pop - a.pop); // best first
  let kept = 0;
  for (const p of arr) {
    if (kept >= PER_BUCKET) break;
    try {
      const c = new Chess(p.fen);
      const first = c.move({ from: p.mv[0].slice(0, 2), to: p.mv[0].slice(2, 4), promotion: p.mv[0][4] });
      if (!first) continue;
      const solveFen = c.fen();
      const solution = p.mv.slice(1);
      if (!solution.length) continue;
      out.push({ id: p.id, r: p.rating, f: solveFen, s: solution.join(" "), c: c.turn(), t: p.themes });
      kept++;
    } catch { /* skip bad row */ }
  }
}

const body = `// AUTO-GENERATED from the Lichess CC0 puzzle database (database.lichess.org).
// ${out.length} puzzles spread evenly across rating bands. CC0 / public domain.
// Lazy-loaded (own chunk) so it never bloats the main app bundle.
export interface PoolEntry { id: string; r: number; f: string; s: string; c: "w" | "b"; t: string }
export const POOL: PoolEntry[] = ${JSON.stringify(out)};
`;
writeFileSync("src/data/puzzlePool.data.ts", body);
console.log("wrote", out.length, "puzzles;", (body.length / 1024 / 1024).toFixed(2), "MB raw");
