import { firebaseEnabled, getFirebase } from "./firebase";
import { Chess } from "chess.js";

// Scanned games a coach has captured (photo → PGN). Saved the same way as the
// roster: Firestore `coaches/{uid}.scannedGames` when signed in (syncs across
// devices), else localStorage. Capped so the coach doc stays small.

export interface ScannedGame {
  id: string;
  pgn: string;
  white: string;
  black: string;
  moveCount: number;
  savedAt: number;
}

const KEY = "strategem.scannedgames.v1";
const CAP = 40;

// Pull names + move count from the PGN (lenient — OCR'd games may be partial).
export function summarize(pgn: string): {
  white: string;
  black: string;
  moveCount: number;
} {
  try {
    const c = new Chess();
    c.loadPgn(pgn);
    const h = c.header() as Record<string, string>;
    return {
      white: h.White || "White",
      black: h.Black || "Black",
      moveCount: c.history().length,
    };
  } catch {
    const c = new Chess();
    const toks = pgn
      .replace(/\[[^\]]*\]/g, " ")
      .replace(/\d+\.(\.\.)?/g, " ")
      .split(/\s+/)
      .filter(Boolean);
    let n = 0;
    for (const t of toks) {
      try {
        if (c.move(t.replace(/[+#!?]+$/, ""))) n++;
        else break;
      } catch {
        break;
      }
    }
    return { white: "White", black: "Black", moveCount: n };
  }
}

export function makeGame(pgn: string, savedAt: number): ScannedGame {
  const s = summarize(pgn);
  const id = `g${savedAt.toString(36)}${pgn.length.toString(36)}`;
  return { id, pgn: pgn.trim(), ...s, savedAt };
}

function loadLocal(): ScannedGame[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as ScannedGame[];
  } catch {
    return [];
  }
}

function saveLocal(games: ScannedGame[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(games));
  } catch {
    /* storage disabled — non-fatal */
  }
}

export async function loadScannedGames(uid?: string): Promise<ScannedGame[]> {
  if (firebaseEnabled && uid) {
    try {
      const { db } = await getFirebase();
      const { doc, getDoc } = await import("firebase/firestore");
      const snap = await getDoc(doc(db, "coaches", uid));
      const d = snap.exists()
        ? (snap.data() as { scannedGames?: ScannedGame[] })
        : {};
      if (Array.isArray(d.scannedGames)) return d.scannedGames;
      return loadLocal();
    } catch {
      return loadLocal();
    }
  }
  return loadLocal();
}

export async function persistScannedGames(
  uid: string | undefined,
  games: ScannedGame[],
): Promise<void> {
  const capped = games.slice(0, CAP);
  if (firebaseEnabled && uid) {
    try {
      const { db } = await getFirebase();
      const { doc, setDoc } = await import("firebase/firestore");
      await setDoc(doc(db, "coaches", uid), { scannedGames: capped }, { merge: true });
      return;
    } catch {
      /* fall back to local so the capture isn't lost */
    }
  }
  saveLocal(capped);
}

export { CAP as SCANNED_GAMES_CAP };
