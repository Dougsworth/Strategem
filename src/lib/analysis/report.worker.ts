import { buildReport, type BuildReportArgs } from "./computeReport";
import type { StudentReport } from "../types";

// Runs the heavy game analysis off the main thread so the UI never freezes.
// buildReport is pure (chess.js + math, no DOM), so it's worker-safe.

interface InMsg {
  id: number;
  args: BuildReportArgs;
}
type OutMsg =
  | { id: number; ok: true; report: StudentReport }
  | { id: number; ok: false; error: string };

// Access worker globals without pulling the WebWorker TS lib into the app.
const ctx = self as unknown as {
  onmessage: ((e: MessageEvent<InMsg>) => void) | null;
  postMessage: (m: OutMsg) => void;
};

ctx.onmessage = (e) => {
  const { id, args } = e.data;
  try {
    ctx.postMessage({ id, ok: true, report: buildReport(args) });
  } catch (err) {
    ctx.postMessage({
      id,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
};
