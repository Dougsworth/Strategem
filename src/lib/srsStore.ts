import type { Evidence, StudentReport } from "./types";
import { allMistakes, evidenceId } from "./mistakeDeck";
import { firebaseEnabled, getFirebase } from "./firebase";
import {
  schedule,
  scheduleNew,
  intervalDays,
  type Grade,
  type Memory,
} from "./fsrs";

// Per-student spaced-repetition library of the positions they got wrong.
//
// The library GROWS and PERSISTS independently of the rolling analysis window:
// each card stores its own drillable position, so a mistake from a game that
// later scrolls out of the fetched set is still scheduled and reviewable. This
// is the whole point of SRS — resurfacing old blunders right before they'd be
// forgotten. localStorage today; same seam as snapshots.ts for a real DB later.

export interface SrsCard {
  id: string; // `${gameId}:${ply}`
  ev: Evidence; // the drillable position
  mem: Memory | null; // null until first reviewed (a "new" card)
  due: number; // epoch ms the card is next due (0 for new cards)
  lastReview: number; // epoch ms of the last review (0 if never)
  reps: number;
  lapses: number;
  addedAt: number; // epoch ms the card entered the library
}

export type Library = Record<string, SrsCard>;

const DAY = 86_400_000;
const KEY = (username: string) => `strategem.srs.${username.toLowerCase()}`;
const MAX_CARDS = 400; // generous bank cap (each card is a few short strings)

/** New cards introduced per review session, so a fresh student isn't buried. */
export const NEW_PER_SESSION = 12;
/** Hard cap on a single session's queue length. */
export const SESSION_CAP = 20;

export function loadLibrary(username: string): Library {
  try {
    const raw = localStorage.getItem(KEY(username));
    return raw ? (JSON.parse(raw) as Library) : {};
  } catch {
    return {};
  }
}

function saveLibrary(username: string, lib: Library): void {
  try {
    // If we ever exceed the cap, drop the oldest *unreviewed* cards first.
    let cards = Object.values(lib);
    if (cards.length > MAX_CARDS) {
      cards = cards
        .sort((a, b) => {
          const aNew = a.mem ? 1 : 0;
          const bNew = b.mem ? 1 : 0;
          return aNew - bNew || a.addedAt - b.addedAt;
        })
        .slice(-MAX_CARDS);
      lib = Object.fromEntries(cards.map((c) => [c.id, c]));
    }
    localStorage.setItem(KEY(username), JSON.stringify(lib));
  } catch {
    /* storage full / disabled — non-fatal */
  }
}

/**
 * Fold the report's current mistakes into the stored library: add any not seen
 * before as new cards, and refresh the stored position for cards we already
 * track (later analysis may carry a cleaner FEN/label). Returns the saved library.
 */
export function syncMistakes(
  report: StudentReport,
  now = Date.now(),
): Library {
  const lib = loadLibrary(report.username);
  for (const ev of allMistakes(report)) {
    const id = evidenceId(ev);
    const existing = lib[id];
    if (existing) {
      existing.ev = ev; // refresh position/caption
    } else {
      lib[id] = {
        id,
        ev,
        mem: null,
        due: 0,
        lastReview: 0,
        reps: 0,
        lapses: 0,
        addedAt: now,
      };
    }
  }
  saveLibrary(report.username, lib);
  return lib;
}

export interface Queue {
  due: SrsCard[]; // reviewed before and due now, most overdue first
  fresh: SrsCard[]; // never reviewed (capped per session)
  /** due + capped fresh, in study order, capped to SESSION_CAP. */
  session: SrsCard[];
}

export function buildQueue(lib: Library, now = Date.now()): Queue {
  const cards = Object.values(lib);
  const due = cards
    .filter((c) => c.mem && c.due <= now)
    .sort((a, b) => a.due - b.due);
  const fresh = cards
    .filter((c) => !c.mem)
    .sort((a, b) => a.addedAt - b.addedAt);

  const session = [...due, ...fresh.slice(0, NEW_PER_SESSION)].slice(
    0,
    SESSION_CAP,
  );
  return { due, fresh, session };
}

/** Epoch ms the next not-yet-due card becomes due, or null if none scheduled. */
export function nextDueAt(lib: Library, now = Date.now()): number | null {
  const upcoming = Object.values(lib)
    .filter((c) => c.mem && c.due > now)
    .map((c) => c.due);
  return upcoming.length ? Math.min(...upcoming) : null;
}

// ── Cross-device sync (Firestore) ─────────────────────────────────────────────
//
// localStorage is always the instant local cache. When signed in with Firebase,
// the library is mirrored to `coaches/{uid}/srs/{username}` so a coach's review
// schedule follows them across devices. The owner-only subcollection rule in
// firestore.rules already covers this path. Same seam as coachStore.ts.

/**
 * Merge two libraries by card id. For a card both sides know, the more recently
 * reviewed copy wins (so the device that last studied it owns the schedule);
 * cards unique to either side are kept. addedAt takes the earlier timestamp.
 */
export function mergeLibraries(a: Library, b: Library): Library {
  const out: Library = { ...a };
  for (const card of Object.values(b)) {
    const mine = out[card.id];
    if (!mine) {
      out[card.id] = card;
      continue;
    }
    const winner = card.lastReview >= mine.lastReview ? card : mine;
    out[card.id] = {
      ...winner,
      addedAt: Math.min(mine.addedAt, card.addedAt),
      ev: winner.ev ?? mine.ev ?? card.ev,
    };
  }
  return out;
}

async function srsDoc(uid: string, username: string) {
  const { db } = await getFirebase();
  const { doc } = await import("firebase/firestore");
  return doc(db, "coaches", uid, "srs", username.toLowerCase());
}

/**
 * Pull the remote library, merge it into the local one, persist the merge
 * locally, and return it. No-op (returns local) when Firebase is off / no uid.
 */
export async function pullLibrary(
  uid: string | undefined,
  username: string,
): Promise<Library> {
  const local = loadLibrary(username);
  if (!firebaseEnabled || !uid) return local;
  try {
    const { getDoc } = await import("firebase/firestore");
    const snap = await getDoc(await srsDoc(uid, username));
    const cards = (snap.exists() ? snap.data()?.cards : null) as
      | SrsCard[]
      | undefined;
    if (!Array.isArray(cards)) return local;
    const remote: Library = Object.fromEntries(cards.map((c) => [c.id, c]));
    const merged = mergeLibraries(local, remote);
    saveLibrary(username, merged);
    return merged;
  } catch {
    return local; // offline / permission — local stays authoritative
  }
}

/** Push the local library to Firestore. Fire-and-forget; safe when Firebase off. */
export async function pushLibrary(
  uid: string | undefined,
  username: string,
): Promise<void> {
  if (!firebaseEnabled || !uid) return;
  try {
    const { setDoc } = await import("firebase/firestore");
    const cards = Object.values(loadLibrary(username));
    await setDoc(await srsDoc(uid, username), { cards }, { merge: false });
  } catch {
    /* offline / disabled — local cache keeps the data until the next push */
  }
}

/** Apply one review grade to a card, persist, and return the updated card. */
export function recordReview(
  username: string,
  id: string,
  grade: Grade,
  now = Date.now(),
): SrsCard | null {
  const lib = loadLibrary(username);
  const card = lib[id];
  if (!card) return null;

  const elapsedDays = card.lastReview ? (now - card.lastReview) / DAY : 0;
  const mem = card.mem
    ? schedule(card.mem, grade, elapsedDays)
    : scheduleNew(grade);

  card.mem = mem;
  card.lastReview = now;
  card.due = now + intervalDays(mem.stability) * DAY;
  card.reps += 1;
  if (grade === 1) card.lapses += 1;

  saveLibrary(username, lib);
  return card;
}
