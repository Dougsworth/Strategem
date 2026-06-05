import { parseGame, type ParsedGame } from "./parseGame";

// Parse/reconstruct a game off the main thread, with a session cache so the same
// PGN is never re-beamed (re-opening a saved game, re-renders, perf toggles are
// instant). One warm worker is reused across calls. Falls back to synchronous
// parsing where Worker is unavailable (Node / SSR).

let worker: Worker | null = null;
let nextId = 0;
const pending = new Map<
  number,
  { resolve: (p: ParsedGame) => void; reject: (e: Error) => void }
>();

// Cache by exact PGN text. Bounded so a long session can't grow it without limit.
const cache = new Map<string, ParsedGame>();
const CACHE_CAP = 40;
function remember(pgn: string, parsed: ParsedGame): ParsedGame {
  if (cache.size >= CACHE_CAP) cache.delete(cache.keys().next().value as string);
  cache.set(pgn, parsed);
  return parsed;
}

interface Reply {
  id: number;
  ok: boolean;
  parsed?: ParsedGame;
  error?: string;
}

function getWorker(): Worker {
  if (worker) return worker;
  worker = new Worker(new URL("./reconstruct.worker.ts", import.meta.url), {
    type: "module",
  });
  worker.onmessage = (e: MessageEvent<Reply>) => {
    const { id, ok, parsed, error } = e.data;
    const entry = pending.get(id);
    if (!entry) return;
    pending.delete(id);
    if (ok && parsed) entry.resolve(parsed);
    else entry.reject(new Error(error ?? "Reconstruction failed"));
  };
  worker.onerror = () => {
    // A worker crash shouldn't hang the viewer — fail everything in flight and
    // drop the worker so the next call spins up a fresh one.
    for (const entry of pending.values()) entry.reject(new Error("Reconstruction worker error"));
    pending.clear();
    worker?.terminate();
    worker = null;
  };
  return worker;
}

/** Reconstruct in the worker (cached), or synchronously when Worker is absent. */
export function runParseInWorker(pgn: string): Promise<ParsedGame> {
  const hit = cache.get(pgn);
  if (hit) return Promise.resolve(hit);
  if (typeof Worker === "undefined") {
    return Promise.resolve().then(() => remember(pgn, parseGame(pgn)));
  }
  const id = nextId++;
  const w = getWorker();
  return new Promise<ParsedGame>((resolve, reject) => {
    pending.set(id, { resolve: (p) => resolve(remember(pgn, p)), reject });
    w.postMessage({ id, pgn });
  });
}
