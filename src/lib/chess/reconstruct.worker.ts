import { parseGame, type ParsedGame } from "./parseGame";

// Runs scoresheet reconstruction (the beam search — heavy on long games) off the
// main thread so the viewer never freezes. parseGame is pure (chess.js + math, no
// DOM), so it's worker-safe.

interface InMsg {
  id: number;
  pgn: string;
}
type OutMsg =
  | { id: number; ok: true; parsed: ParsedGame }
  | { id: number; ok: false; error: string };

// Access worker globals without pulling the WebWorker TS lib into the app.
const ctx = self as unknown as {
  onmessage: ((e: MessageEvent<InMsg>) => void) | null;
  postMessage: (m: OutMsg) => void;
};

ctx.onmessage = (e) => {
  const { id, pgn } = e.data;
  try {
    ctx.postMessage({ id, ok: true, parsed: parseGame(pgn) });
  } catch (err) {
    ctx.postMessage({
      id,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
};
