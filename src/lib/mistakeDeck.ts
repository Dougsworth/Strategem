import type { Evidence, StudentReport } from "./types";

// Builds a practice deck from the student's OWN games: every position where a
// stronger move was available (their recurring mistakes + missed tactics),
// where we know the engine's best move. This is the core "learn from your own
// blunders" loop — no generic puzzle DB, just their real games.

/** Stable id for a drillable position — also the SRS card key. */
export function evidenceId(ev: Evidence): string {
  return `${ev.gameId}:${ev.ply}`;
}

/**
 * Every drillable mistake from the student's games (deduped, uncapped). This is
 * the source the spaced-repetition library draws from — see srsStore.ts. Use
 * `mistakeDeck` instead when you want a single focused one-shot set.
 */
export function allMistakes(report: StudentReport): Evidence[] {
  const all: Evidence[] = [
    ...report.recurringErrors.flatMap((e) => e.examples),
    ...report.tacticalMotifs.flatMap((m) => m.missed),
  ];

  const seen = new Set<string>();
  const deck: Evidence[] = [];
  for (const ev of all) {
    if (!ev.solutionUci) continue; // need a known correct move to drill
    const key = evidenceId(ev);
    if (seen.has(key)) continue;
    seen.add(key);
    deck.push(ev);
  }
  return deck;
}

export function mistakeDeck(report: StudentReport): Evidence[] {
  // Hardest-feeling first is unnecessary; keep game order. Cap for a focused set.
  return allMistakes(report).slice(0, 12);
}
