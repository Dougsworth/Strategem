import { firebaseEnabled, getFirebase } from "./firebase";
import { Chess } from "chess.js";
import { reconstructMoves } from "./chess/snapMove";

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

// Names + move count from the PGN. Uses the SAME beam reconstruction the viewer
// does, so the sidebar count matches what actually loads (the old strict parser
// truncated at the first OCR misread, badly under-counting messy scans).
export function summarize(pgn: string): {
  white: string;
  black: string;
  moveCount: number;
} {
  const headers: Record<string, string> = {};
  for (const m of pgn.matchAll(/\[(\w+)\s+"([^"]*)"\]/g)) headers[m[1]] = m[2];

  // Fast path: a clean PGN loads strictly.
  try {
    const c = new Chess();
    c.loadPgn(pgn);
    const moves = c.history();
    if (moves.length > 0) {
      const h = c.header() as Record<string, string>;
      return {
        white: h.White || headers.White || "White",
        black: h.Black || headers.Black || "Black",
        moveCount: moves.length,
      };
    }
  } catch {
    /* fall through to beam reconstruction */
  }

  const body = pgn
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/\{[^}]*\}/g, " ")
    .replace(/\$\d+/g, " ")
    .replace(/\b(1-0|0-1|1\/2-1\/2|\*)\b/g, " ")
    .replace(/\d+\.(\.\.)?/g, " ");
  const tokens = body.split(/\s+/).filter(Boolean);
  const { sans } = reconstructMoves(tokens);
  return {
    white: headers.White || "White",
    black: headers.Black || "Black",
    moveCount: sans.length,
  };
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
