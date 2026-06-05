import { useEffect, useMemo, useState } from "react";
import { ExternalLink } from "lucide-react";
import { Chess } from "chess.js";
import { InteractiveBoard } from "@/components/InteractiveBoard";
import { useBoardSize } from "@/components/useBoardSize";
import type { Evidence } from "@/lib/types";

// Single-move drills built from the student's own mistakes. For each position
// (taken from a real game, just before they went wrong), find the move the
// engine recommends — then play it on the board, or open it on Lichess to dig in.

function solutionSan(fen: string, uci: string): string {
  try {
    const c = new Chess(fen);
    const m = c.move({
      from: uci.slice(0, 2),
      to: uci.slice(2, 4),
      promotion: uci.slice(4) || undefined,
    });
    return m?.san ?? uci;
  } catch {
    return uci;
  }
}

function applyUci(fen: string, uci: string) {
  try {
    const c = new Chess(fen);
    const m = c.move({
      from: uci.slice(0, 2),
      to: uci.slice(2, 4),
      promotion: uci.slice(4) || undefined,
    });
    if (!m) return null;
    return { fen: c.fen(), from: m.from, to: m.to };
  } catch {
    return null;
  }
}

function lichessAnalysisUrl(fen: string): string {
  return `https://lichess.org/analysis/${fen.replace(/ /g, "_")}`;
}

export const MistakeTrainer = ({
  items,
  studentName,
  onClose,
}: {
  items: Evidence[];
  studentName: string;
  onClose: () => void;
}) => {
  const [idx, setIdx] = useState(0);
  const [solvedCount, setSolvedCount] = useState(0);
  const [state, setState] = useState<"solving" | "correct" | "revealed">("solving");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [boardFen, setBoardFen] = useState(items[0]?.fen ?? "");
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const boardSize = useBoardSize();

  const ev = items[idx];
  const answerSan = useMemo(
    () => (ev?.solutionUci ? solutionSan(ev.fen, ev.solutionUci) : ""),
    [ev],
  );

  // Reset the board to the new position when the index changes.
  useEffect(() => {
    setBoardFen(items[idx]?.fen ?? "");
    setLastMove(null);
  }, [idx, items]);

  if (!ev) return null;

  const interactive = state === "solving" || state === "revealed";

  function handleMove(from: string, to: string) {
    if (!ev.solutionUci || state === "correct") return;
    const ok =
      ev.solutionUci.slice(0, 2) === from && ev.solutionUci.slice(2, 4) === to;

    if (ok) {
      const applied = applyUci(ev.fen, ev.solutionUci);
      if (applied) {
        setBoardFen(applied.fen);
        setLastMove({ from: applied.from, to: applied.to });
      }
      if (state === "solving") setSolvedCount((n) => n + 1);
      setState("correct");
      setFeedback(null);
    } else if (state === "solving") {
      setLastMove({ from, to });
      setAttempts((a) => a + 1);
      setFeedback(
        attempts >= 1
          ? "Still not it — reveal the answer below, or keep looking."
          : "Not the strongest move here. Try again.",
      );
    }
  }

  function next() {
    setIdx((i) => i + 1);
    setState("solving");
    setFeedback(null);
    setAttempts(0);
  }

  function restart() {
    setIdx(0);
    setSolvedCount(0);
    setState("solving");
    setFeedback(null);
    setAttempts(0);
  }

  const moveNo = Math.floor(ev.ply / 2) + 1;
  const done = idx >= items.length - 1 && state !== "solving";

  return (
    <div className="fixed inset-0 z-[120] flex animate-fade-in flex-col bg-paper">
      <header className="flex items-center justify-between border-b border-line px-6 py-3">
        <div>
          <p className="eyebrow">Fix your mistakes · from real games</p>
          <h2 className="mt-0.5 font-display text-lg font-bold tracking-tight">
            Position {idx + 1} of {items.length}
          </h2>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-paper transition-opacity hover:opacity-90"
        >
          Close
        </button>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center gap-8 overflow-y-auto p-6 lg:flex-row lg:items-center lg:gap-12">
        <div className="shrink-0">
          <InteractiveBoard
            fen={boardFen}
            orientation={ev.turn}
            interactive={interactive}
            lastMove={lastMove}
            onMove={handleMove}
            size={boardSize}
          />
        </div>

        <div className="flex w-full max-w-md flex-col">
            <p className="font-mono text-xs text-muted">
              {ev.label} · {ev.turn === "w" ? "White" : "Black"} to move
            </p>

            <div className="mt-3 min-h-[84px]">
              {state === "correct" ? (
                <div>
                  <p className="font-display text-xl font-bold text-positive">
                    {answerSan} 🎯
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    That's the move the engine recommends here.
                  </p>
                </div>
              ) : state === "revealed" ? (
                <div>
                  <p className="font-display text-lg font-bold">
                    Best move: <span className="text-accent">{answerSan}</span>
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    Drag the piece to play it, or analyze it on Lichess.
                  </p>
                </div>
              ) : (
                <div>
                  <p className="font-display text-lg font-bold">Find the best move.</p>
                  <p className="mt-1 text-sm text-muted">
                    {studentName} reached this in a real game (move {moveNo}).
                    Drag a piece to make your move.
                  </p>
                  {feedback && (
                    <p className="mt-2 text-sm font-semibold text-accent">{feedback}</p>
                  )}
                </div>
              )}
            </div>

            <div className="mt-auto flex flex-wrap gap-2 pt-4">
              {state === "solving" && attempts >= 1 && (
                <button
                  onClick={() => setState("revealed")}
                  className="rounded-lg bg-ink-soft px-4 py-2 text-sm font-semibold text-ink ring-1 ring-line transition-colors hover:bg-ink/10"
                >
                  Reveal answer
                </button>
              )}
              <a
                href={lichessAnalysisUrl(ev.fen)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 rounded-lg border border-line px-4 py-2 text-sm font-medium transition-colors hover:bg-ink-soft"
              >
                <ExternalLink size={14} />
                Analyze on Lichess
              </a>
              {done ? (
                <button
                  onClick={restart}
                  className="rounded-lg bg-accent px-4 py-2 text-sm font-bold text-paper transition-opacity hover:opacity-90"
                >
                  Done — {solvedCount}/{items.length} · Restart
                </button>
              ) : (
                state !== "solving" && (
                  <button
                    onClick={next}
                    className="rounded-lg bg-accent px-4 py-2 text-sm font-bold text-paper transition-opacity hover:opacity-90"
                  >
                    Next position →
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      </div>
  );
};
