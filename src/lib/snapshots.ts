import type { Phase, ReportSnapshot, StudentReport } from "./types";

// Longitudinal tracking: persist a small snapshot of each report so we can show
// "since last review" deltas across sessions/weeks. localStorage today; this is
// the seam where a real backend/DB slots in later.

const KEY = (username: string) => `strategem.snapshots.${username.toLowerCase()}`;
const MAX_SNAPSHOTS = 50;

export function snapshotFromReport(report: StudentReport): ReportSnapshot {
  const phaseAccuracy = {} as Record<Phase, number>;
  for (const p of report.phases) phaseAccuracy[p.phase] = p.accuracy;
  const motifAccuracy: Record<string, number | null> = {};
  for (const m of report.tacticalMotifs) motifAccuracy[m.key] = m.accuracy;
  return {
    takenAt: Date.now(),
    rating: report.rating,
    overallAccuracy: report.overallAccuracy,
    phaseAccuracy,
    motifAccuracy,
    gamesAnalyzed: report.gamesAnalyzed,
    lastGameAt: report.lastGameAt,
  };
}

export function getSnapshots(username: string): ReportSnapshot[] {
  try {
    const raw = localStorage.getItem(KEY(username));
    return raw ? (JSON.parse(raw) as ReportSnapshot[]) : [];
  } catch {
    return [];
  }
}

/**
 * Record a snapshot — but only if the underlying games changed since the last
 * one (otherwise re-opening a student would spam identical entries).
 * Returns the snapshot list after the operation.
 */
export function recordSnapshot(report: StudentReport): ReportSnapshot[] {
  const existing = getSnapshots(report.username);
  const last = existing[existing.length - 1];
  const next = snapshotFromReport(report);
  const unchanged =
    last &&
    last.lastGameAt === next.lastGameAt &&
    last.gamesAnalyzed === next.gamesAnalyzed;
  if (unchanged) return existing;

  const updated = [...existing, next].slice(-MAX_SNAPSHOTS);
  try {
    localStorage.setItem(KEY(report.username), JSON.stringify(updated));
  } catch {
    /* storage full / disabled — non-fatal */
  }
  return updated;
}

export interface Delta {
  label: string;
  current: number | null;
  previous: number | null;
  change: number | null; // current - previous
}

/** Compare the latest snapshot to the earliest one we have on file. */
export function computeDeltas(snapshots: ReportSnapshot[]): {
  since: number | null;
  rating: Delta;
  accuracy: Delta;
  phases: Delta[];
} | null {
  if (snapshots.length < 2) return null;
  const cur = snapshots[snapshots.length - 1];
  const prev = snapshots[0];

  const diff = (a: number | null, b: number | null): number | null =>
    a !== null && b !== null ? Math.round((a - b) * 10) / 10 : null;

  return {
    since: prev.takenAt,
    rating: {
      label: "Rating",
      current: cur.rating,
      previous: prev.rating,
      change: diff(cur.rating, prev.rating),
    },
    accuracy: {
      label: "Accuracy",
      current: cur.overallAccuracy,
      previous: prev.overallAccuracy,
      change: diff(cur.overallAccuracy, prev.overallAccuracy),
    },
    phases: (Object.keys(cur.phaseAccuracy) as Phase[]).map((ph) => ({
      label: ph,
      current: cur.phaseAccuracy[ph],
      previous: prev.phaseAccuracy[ph] ?? null,
      change: diff(cur.phaseAccuracy[ph], prev.phaseAccuracy[ph] ?? null),
    })),
  };
}
