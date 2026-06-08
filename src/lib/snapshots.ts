import type { Phase, ReportSnapshot, StudentReport } from "./types";
import { firebaseEnabled, getFirebase } from "./firebase";

// Longitudinal tracking: persist a small snapshot of each report so we can show
// "since last review" deltas across sessions/weeks. localStorage is the instant
// local cache; signed in, it mirrors to Firestore so progress history follows a
// coach across devices. Same seam as srsStore.ts.

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

// Cap the history while preserving the BASELINE: deltas compare the latest
// snapshot to the earliest, so when we trim we keep the very first entry plus
// the most recent ones rather than blindly dropping the oldest.
function cap(snapshots: ReportSnapshot[]): ReportSnapshot[] {
  if (snapshots.length <= MAX_SNAPSHOTS) return snapshots;
  return [snapshots[0], ...snapshots.slice(-(MAX_SNAPSHOTS - 1))];
}

function saveSnapshots(username: string, snapshots: ReportSnapshot[]): void {
  try {
    localStorage.setItem(KEY(username), JSON.stringify(cap(snapshots)));
  } catch {
    /* storage full / disabled — non-fatal */
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

  const updated = cap([...existing, next]);
  saveSnapshots(report.username, updated);
  return updated;
}

// ── Cross-device sync (Firestore) ─────────────────────────────────────────────
//
// Stored at `coaches/{uid}/snapshots/{username}` — the owner-only subcollection
// rule in firestore.rules already covers this path (same as srsStore.ts).

/**
 * Merge two snapshot lists by `takenAt` (the natural unique key — one snapshot
 * per analysis moment). Deduped, sorted oldest→newest, then capped keeping the
 * baseline so deltas still reach back to the start.
 */
export function mergeSnapshots(
  a: ReportSnapshot[],
  b: ReportSnapshot[],
): ReportSnapshot[] {
  const byTime = new Map<number, ReportSnapshot>();
  for (const s of [...a, ...b]) byTime.set(s.takenAt, s);
  const merged = [...byTime.values()].sort((x, y) => x.takenAt - y.takenAt);
  return cap(merged);
}

async function snapshotsDoc(uid: string, username: string) {
  const { db } = await getFirebase();
  const { doc } = await import("firebase/firestore");
  return doc(db, "coaches", uid, "snapshots", username.toLowerCase());
}

/**
 * Pull the remote history, merge it into the local one, persist the merge
 * locally, and return it. No-op (returns local) when Firebase is off / no uid.
 */
export async function pullSnapshots(
  uid: string | undefined,
  username: string,
): Promise<ReportSnapshot[]> {
  const local = getSnapshots(username);
  if (!firebaseEnabled || !uid) return local;
  try {
    const { getDoc } = await import("firebase/firestore");
    const snap = await getDoc(await snapshotsDoc(uid, username));
    const items = (snap.exists() ? snap.data()?.items : null) as
      | ReportSnapshot[]
      | undefined;
    if (!Array.isArray(items)) return local;
    const merged = mergeSnapshots(local, items);
    saveSnapshots(username, merged);
    return merged;
  } catch {
    return local; // offline / permission — local stays authoritative
  }
}

/** Push the local history to Firestore. Fire-and-forget; safe when Firebase off. */
export async function pushSnapshots(
  uid: string | undefined,
  username: string,
): Promise<void> {
  if (!firebaseEnabled || !uid) return;
  try {
    const { setDoc } = await import("firebase/firestore");
    const items = getSnapshots(username);
    await setDoc(await snapshotsDoc(uid, username), { items }, { merge: false });
  } catch {
    /* offline / disabled — local cache keeps the data until the next push */
  }
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
