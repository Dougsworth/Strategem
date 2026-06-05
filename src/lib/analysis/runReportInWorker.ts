import { buildReport, type BuildReportArgs } from "./computeReport";
import type { StudentReport } from "../types";

// Singleton worker + request-id map. One warm worker is reused across student/
// perf switches (avoids re-parsing the module + chess.js on every run). Callers
// already guard results with their own `cancelled` flag, so superseded requests
// simply resolve and are ignored.

let worker: Worker | null = null;
let nextId = 0;
const pending = new Map<
  number,
  { resolve: (r: StudentReport) => void; reject: (e: Error) => void }
>();

interface WorkerReply {
  id: number;
  ok: boolean;
  report?: StudentReport;
  error?: string;
}

function getWorker(): Worker {
  if (worker) return worker;
  worker = new Worker(new URL("./report.worker.ts", import.meta.url), {
    type: "module",
  });
  worker.onmessage = (e: MessageEvent<WorkerReply>) => {
    const { id, ok, report, error } = e.data;
    const entry = pending.get(id);
    if (!entry) return;
    pending.delete(id);
    if (ok && report) entry.resolve(report);
    else entry.reject(new Error(error ?? "Worker analysis failed"));
  };
  worker.onerror = () => {
    // A worker crash shouldn't hang the dashboard — fail everything in flight
    // and drop the worker so the next call spins up a fresh one.
    for (const entry of pending.values()) entry.reject(new Error("Analysis worker error"));
    pending.clear();
    worker?.terminate();
    worker = null;
  };
  return worker;
}

/** Analyze in the worker, or synchronously when Worker is unavailable (Node). */
export function runReportInWorker(args: BuildReportArgs): Promise<StudentReport> {
  if (typeof Worker === "undefined") {
    return Promise.resolve().then(() => buildReport(args));
  }
  const id = nextId++;
  const w = getWorker();
  return new Promise<StudentReport>((resolve, reject) => {
    pending.set(id, { resolve, reject });
    w.postMessage({ id, args });
  });
}
