import { getFirebase } from "./firebase";
import type { StudentReport } from "./types";

// Claude-personalized report-card narrative. We send a COMPACT, exact summary of
// the analysis (never raw games) to the generateNarrative function, and cache the
// result per report version so we don't pay to regenerate the same report.

export interface NarrativeSummary {
  name: string;
  perf: string;
  rating: number | null;
  trend: string;
  ratingDrift: number;
  overallAccuracy: number;
  accuracyDelta: number;
  gamesAnalyzed: number;
  phases: { phase: string; accuracy: number }[];
  recurringMistakes: { title: string; count: number }[];
  weakestTactics: { title: string; accuracy: number | null }[];
  lastGame: {
    result: string;
    opponent: string;
    accuracy: number;
    mistakes: number;
  } | null;
}

export function buildNarrativeSummary(report: StudentReport): NarrativeSummary {
  return {
    name: report.displayName,
    perf: report.perf,
    rating: report.rating,
    trend: report.trend,
    ratingDrift: report.ratingDrift,
    overallAccuracy: Math.round(report.overallAccuracy),
    accuracyDelta: report.accuracyDelta,
    gamesAnalyzed: report.gamesAnalyzed,
    phases: report.phases.map((p) => ({
      phase: p.phase,
      accuracy: Math.round(p.accuracy),
    })),
    recurringMistakes: report.recurringErrors
      .slice(0, 3)
      .map((e) => ({ title: e.title, count: e.count })),
    weakestTactics: report.tacticalMotifs
      .filter((t) => t.reliable && t.accuracy != null)
      .sort((a, b) => (a.accuracy ?? 100) - (b.accuracy ?? 100))
      .slice(0, 2)
      .map((t) => ({ title: t.title, accuracy: t.accuracy })),
    lastGame: report.lastGame
      ? {
          result: report.lastGame.result,
          opponent: report.lastGame.opponent,
          accuracy: Math.round(report.lastGame.accuracy),
          mistakes: report.lastGame.mistakes.length,
        }
      : null,
  };
}

// A signature that changes only when the underlying analysis changes — so the
// cached narrative stays valid until the student plays/analyzes more games.
export function narrativeKey(report: StudentReport): string {
  return `strategem.narrative.${report.username.toLowerCase()}.${report.perf}.${report.gamesAnalyzed}.${Math.round(report.overallAccuracy)}`;
}

export async function fetchNarrative(report: StudentReport): Promise<string> {
  const key = narrativeKey(report);
  try {
    const cached = localStorage.getItem(key);
    if (cached) return cached;
  } catch {
    /* ignore */
  }

  await getFirebase();
  const { getApps } = await import("firebase/app");
  const { getFunctions, httpsCallable } = await import("firebase/functions");
  const fns = getFunctions(getApps()[0]);
  const call = httpsCallable<{ summary: NarrativeSummary }, { narrative: string }>(
    fns,
    "generateNarrative",
  );
  const res = await call({ summary: buildNarrativeSummary(report) });
  const narrative = res.data?.narrative?.trim() ?? "";
  if (narrative) {
    try {
      localStorage.setItem(key, narrative);
    } catch {
      /* ignore */
    }
  }
  return narrative;
}
