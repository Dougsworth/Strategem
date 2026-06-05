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

// Names + a FAST provisional move count from the PGN. Kept cheap (no beam) so it
// never blocks the main thread on save/edit — a clean PGN counts exactly via the
// strict loader, a raw OCR scan gets a quick move-token estimate. The exact count
// is refined off-thread afterwards (refineCount + the worker), and the viewer
// always shows the true reconstructed count.
export function summarize(pgn: string): {
  white: string;
  black: string;
  moveCount: number;
} {
  const headers: Record<string, string> = {};
  for (const m of pgn.matchAll(/\[(\w+)\s+"([^"]*)"\]/g)) headers[m[1]] = m[2];

  // Fast path: a clean PGN loads strictly (exact count).
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
    /* fall through to the cheap token estimate */
  }

  return {
    white: headers.White || "White",
    black: headers.Black || "Black",
    moveCount: countMoveTokens(pgn),
  };
}

// Cheap, legality-free count of move-looking tokens — a provisional figure for an
// OCR scan that won't load strictly. O(n) string work, no chess.js replay.
export function countMoveTokens(pgn: string): number {
  const body = pgn
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/\{[^}]*\}/g, " ")
    .replace(/\$\d+/g, " ")
    .replace(/\b(1-0|0-1|1\/2-1\/2|\*)\b/g, " ")
    .replace(/\d+\.(\.\.)?/g, " ");
  return body
    .split(/\s+/)
    .filter((t) => /^O-O(-O)?[+#]?$/.test(t) || /[a-h][1-8]/.test(t)).length;
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
