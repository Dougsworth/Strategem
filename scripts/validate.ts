import { fetchLichessReport } from "../src/lib/analysis/computeReport";
import { fetchGames } from "../src/lib/providers/lichess";

async function main() {
  const username = process.argv[2] || "Zhigalko_Sergei";
  console.log(`\nBuilding report for: ${username}\n`);

  // Cross-check: pull raw games so we can compare our accuracy vs Lichess's own.
  const raw = await fetchGames(username, { max: 60, onlyAnalysed: true });
  const report = await fetchLichessReport(username, { max: 60 });

  console.log("== Player ==");
  console.log(`  ${report.displayName} (${report.username})  rating=${report.rating}  trend=${report.trend}`);
  console.log(`  games fetched=${report.gamesFetched} analyzed=${report.gamesAnalyzed} lastGame=${report.lastGameAt ? new Date(report.lastGameAt).toISOString() : "?"}`);
  console.log(`  overall accuracy=${report.overallAccuracy}  delta=${report.accuracyDelta}  ratingDrift=${report.ratingDrift}`);
  console.log(`  headline: ${report.headline}`);

  console.log("\n== Phase strength (our compute) ==");
  for (const p of report.phases) {
    console.log(`  ${p.phase.padEnd(11)} acc=${String(p.accuracy).padStart(5)}  acpl=${String(p.acpl).padStart(4)}  moves=${p.moves}`);
  }

  console.log("\n== Recurring errors (with evidence) ==");
  for (const e of report.recurringErrors) {
    console.log(`  (x${e.count}) ${e.title} — ${e.description}`);
    const ex = e.examples[0];
    if (ex) console.log(`        e.g. ${ex.san} (${ex.label}) ${ex.url}`);
    console.log(`        evidence captured: ${e.examples.length}`);
  }

  console.log("\n== Tactical motifs (estimates) ==");
  for (const m of report.tacticalMotifs) {
    console.log(`  ${m.badge} ${m.title.padEnd(20)} acc=${m.accuracy === null ? "n/a" : m.accuracy + "%"}  sample=${m.sample}  reliable=${m.reliable}  missed=${m.missed.length}`);
  }

  console.log("\n== Sanity: our overall accuracy vs Lichess per-game accuracy ==");
  const u = username.toLowerCase();
  const liAccs: number[] = [];
  for (const g of raw) {
    const white = g.players.white.user?.id?.toLowerCase() === u;
    const a = (white ? g.players.white : g.players.black).analysis?.accuracy;
    if (typeof a === "number") liAccs.push(a);
  }
  const liMean = liAccs.length ? liAccs.reduce((s, x) => s + x, 0) / liAccs.length : NaN;
  console.log(`  Lichess mean per-game accuracy: ${liMean.toFixed(1)}  (n=${liAccs.length})`);
  console.log(`  Our blended overall accuracy:   ${report.overallAccuracy}`);
  console.log(`  (these won't match exactly — Lichess blends per game; we blend per move — but should be in the same ballpark)\n`);

  console.log("== Notes ==");
  for (const n of report.notes) console.log(`  - ${n}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
