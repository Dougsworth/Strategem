import type { Evidence, StudentReport } from "./types";

// Builds a practice deck from the student's OWN games: every position where a
// stronger move was available (their recurring mistakes + missed tactics),
// where we know the engine's best move. This is the core "learn from your own
// blunders" loop — no generic puzzle DB, just their real games.

export function mistakeDeck(report: StudentReport): Evidence[] {
  const all: Evidence[] = [
    ...report.recurringErrors.flatMap((e) => e.examples),
    ...report.tacticalMotifs.flatMap((m) => m.missed),
  ];

  const seen = new Set<string>();
  const deck: Evidence[] = [];
  for (const ev of all) {
    if (!ev.solutionUci) continue; // need a known correct move to drill
    const key = `${ev.gameId}:${ev.ply}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deck.push(ev);
  }
  // Hardest-feeling first is unnecessary; keep game order. Cap for a focused set.
  return deck.slice(0, 12);
}
