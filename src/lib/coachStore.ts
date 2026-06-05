import { firebaseEnabled, getFirebase } from "./firebase";
import type { Platform } from "./types";

// Where a coach's roster lives. Signed in with Firebase → Firestore doc
// `coaches/{uid}` (syncs across devices). Otherwise → localStorage (the $0
// mock / logged-out path). Same shape either way, so StudentContext doesn't
// care which backend is active.

export interface StoredStudent {
  platform: Platform;
  username: string;
}

export interface CoachData {
  roster: StoredStudent[];
  selected: string | null;
}

const ROSTER_KEY = "strategem.roster.v1";
const SELECTED_KEY = "strategem.selected.v1";

function loadLocal(): CoachData {
  try {
    const roster = JSON.parse(
      localStorage.getItem(ROSTER_KEY) ?? "[]",
    ) as StoredStudent[];
    return { roster, selected: localStorage.getItem(SELECTED_KEY) };
  } catch {
    return { roster: [], selected: null };
  }
}

function saveLocal(data: CoachData): void {
  try {
    localStorage.setItem(ROSTER_KEY, JSON.stringify(data.roster));
    if (data.selected) localStorage.setItem(SELECTED_KEY, data.selected);
    else localStorage.removeItem(SELECTED_KEY);
  } catch {
    /* storage disabled — non-fatal */
  }
}

// The roster lives in the club doc when the coach is in a club (shared across
// the team), otherwise in their personal coaches/{uid} doc.
function refPath(uid?: string, clubId?: string): [string, string] | null {
  if (clubId) return ["clubs", clubId];
  if (uid) return ["coaches", uid];
  return null;
}

export async function loadCoachData(
  uid?: string,
  clubId?: string,
): Promise<CoachData> {
  const path = refPath(uid, clubId);
  if (firebaseEnabled && path) {
    try {
      const { db } = await getFirebase();
      const { doc, getDoc } = await import("firebase/firestore");
      const snap = await getDoc(doc(db, path[0], path[1]));
      const d = snap.exists() ? (snap.data() as Partial<CoachData>) : {};
      if (Array.isArray(d.roster)) {
        return { roster: d.roster, selected: d.selected ?? null };
      }
      // Club with no roster yet → start empty (don't pull in personal local).
      return clubId ? { roster: [], selected: null } : loadLocal();
    } catch {
      return clubId ? { roster: [], selected: null } : loadLocal();
    }
  }
  return loadLocal();
}

export async function saveCoachData(
  uid: string | undefined,
  clubId: string | undefined,
  data: CoachData,
): Promise<void> {
  const path = refPath(uid, clubId);
  if (firebaseEnabled && path) {
    try {
      const { db } = await getFirebase();
      const { doc, setDoc } = await import("firebase/firestore");
      await setDoc(
        doc(db, path[0], path[1]),
        { roster: data.roster, selected: data.selected ?? null },
        { merge: true },
      );
      return;
    } catch {
      /* fall back to a local backup so we don't lose the change */
    }
  }
  if (!clubId) saveLocal(data); // never cache club data to personal local storage
}
