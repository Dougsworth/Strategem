// Lazy singleton Stockfish (stockfish.js@10 — classical eval, fully self-
// contained ~0.5 MB WASM, no NNUE network, no SharedArrayBuffer, so it needs no
// COOP/COEP headers and runs anywhere). It lives in its own Web Worker, so
// evaluation never blocks the UI. Engine files are served from /engine (copied
// from node_modules into static/ — see static/engine/).

type Listener = (line: string) => void;

let worker: Worker | null = null;
let booting: Promise<void> | null = null;
const listeners = new Set<Listener>();
// One position at a time — Stockfish handles a single `go` at once.
let chain: Promise<unknown> = Promise.resolve();

function engineFile(file: string): string {
  return `${import.meta.env.BASE_URL}engine/${file}`;
}

function send(cmd: string) {
  worker?.postMessage(cmd);
}

function boot(): Promise<void> {
  if (booting) return booting;
  booting = new Promise<void>((resolve, reject) => {
    let w: Worker;
    try {
      const wasmOk =
        typeof WebAssembly === "object" &&
        WebAssembly.validate(Uint8Array.of(0, 0x61, 0x73, 0x6d, 1, 0, 0, 0));
      w = new Worker(engineFile(wasmOk ? "stockfish.wasm.js" : "stockfish.js"));
    } catch (e) {
      booting = null;
      reject(e instanceof Error ? e : new Error("Could not start the engine"));
      return;
    }
    worker = w;
    w.onmessage = (e: MessageEvent) => {
      const line = typeof e.data === "string" ? e.data : ((e.data && e.data.data) ?? "");
      for (const l of listeners) l(line);
    };
    w.onerror = () => {
      booting = null;
      reject(new Error("The engine failed to load"));
    };
    const handshake: Listener = (line) => {
      if (line.includes("uciok")) send("isready");
      else if (line.includes("readyok")) {
        listeners.delete(handshake);
        resolve();
      }
    };
    listeners.add(handshake);
    send("uci");
  });
  return booting;
}

export interface PosEval {
  /** Centipawns from WHITE's perspective (null if a mate score). */
  cp: number | null;
  /** Mate-in-N from WHITE's perspective (+ = white mates), null otherwise. */
  mate: number | null;
  /** The engine's best move (UCI) in this position, null if none. */
  best: string | null;
}

function evalOnce(fen: string, movetime: number): Promise<PosEval> {
  return new Promise<PosEval>((resolve) => {
    const sideSign = fen.split(" ")[1] === "b" ? -1 : 1; // engine reports for side-to-move
    let cp: number | null = null;
    let mate: number | null = null;
    let best: string | null = null;
    let done = false;
    const finish = (timedOut: boolean) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      listeners.delete(onLine);
      if (timedOut) send("stop"); // nudge the engine back to idle
      resolve({
        cp: cp === null ? null : cp * sideSign,
        mate: mate === null ? null : mate * sideSign,
        best,
      });
    };
    const onLine: Listener = (line) => {
      if (line.startsWith("info") && line.includes(" score ")) {
        const m = line.match(/score mate (-?\d+)/);
        const c = line.match(/score cp (-?\d+)/);
        if (m) {
          mate = parseInt(m[1], 10);
          cp = null;
        } else if (c) {
          cp = parseInt(c[1], 10);
          mate = null;
        }
      } else if (line.startsWith("bestmove")) {
        const bm = line.split(/\s+/)[1];
        best = bm && bm !== "(none)" ? bm : null;
        finish(false);
      }
    };
    // Safety net: `go movetime` self-stops, but a pathological position must not
    // hang the whole game analysis — bail with the best score seen so far.
    const timer = setTimeout(() => finish(true), movetime + 2000);
    listeners.add(onLine);
    send(`position fen ${fen}`);
    send(`go movetime ${movetime}`);
  });
}

/** Evaluate a position (WHITE's perspective), capped to `movetime` ms. Calls are
 *  serialized internally so the engine handles one position at a time. */
export async function evaluate(fen: string, movetime = 80): Promise<PosEval> {
  await boot();
  const run = () => evalOnce(fen, movetime);
  const p = chain.then(run, run);
  chain = p.catch(() => undefined);
  return p;
}

/** Whether the engine could be started (used to hide the feature gracefully). */
export function engineAvailable(): boolean {
  return typeof Worker !== "undefined" && typeof WebAssembly !== "undefined";
}

export function disposeEngine(): void {
  worker?.terminate();
  worker = null;
  booting = null;
  listeners.clear();
  chain = Promise.resolve();
}
