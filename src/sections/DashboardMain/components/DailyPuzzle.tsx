import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, ExternalLink, Lightbulb, Puzzle, RotateCcw, X } from "lucide-react";
import { Chess } from "chess.js";
import { InteractiveBoard } from "@/components/InteractiveBoard";
import { useBoardSize } from "@/components/useBoardSize";
import { Loader } from "@/components/Loader";
import { getDailyPuzzle, type DailyPuzzle as Daily } from "@/lib/dailyPuzzle";

type Status = "loading" | "playing" | "opponent" | "solved" | "error";

const PIECE_NAME: Record<string, string> = {
  p: "pawn", n: "knight", b: "bishop", r: "rook", q: "queen", k: "king",
};

// A small floating button that opens the daily puzzle in a popup — Lichess's
// free daily puzzle (cached per day), solvable inline, with our own bank as the
// offline fallback. New puzzle every day.
export const DailyPuzzle = () => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Today’s puzzle"
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-ink px-3.5 py-2.5 text-sm font-medium text-paper shadow-lg ring-1 ring-black/5 transition-transform hover:scale-105 hover:shadow-xl active:scale-95"
      >
        <Puzzle size={16} className="shrink-0" />
        <span className="hidden sm:inline">Daily puzzle</span>
      </button>
      {open && <PuzzleModal onClose={() => setOpen(false)} />}
    </>
  );
};

function PuzzleModal({ onClose }: { onClose: () => void }) {
  const [puzzle, setPuzzle] = useState<Daily | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [fen, setFen] = useState("");
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [wrong, setWrong] = useState(false);
  const [hint, setHint] = useState(false);
  const chessRef = useRef<Chess | null>(null);
  const solIdx = useRef(0);
  const size = useBoardSize(360);

  const startWith = useCallback((p: Daily) => {
    chessRef.current = new Chess(p.fen);
    solIdx.current = 0;
    setPuzzle(p);
    setFen(p.fen);
    setLastMove(null);
    setWrong(false);
    setHint(false);
    setStatus("playing");
  }, []);

  useEffect(() => {
    let cancelled = false;
    getDailyPuzzle()
      .then((p) => !cancelled && startWith(p))
      .catch(() => !cancelled && setStatus("error"));
    return () => {
      cancelled = true;
    };
  }, [startWith]);

  // Close on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleMove = useCallback(
    (from: string, to: string) => {
      const chess = chessRef.current;
      if (!chess || !puzzle || status !== "playing") return;
      const expected = puzzle.solution[solIdx.current];
      if (expected.slice(0, 2) !== from || expected.slice(2, 4) !== to) {
        setWrong(true);
        return;
      }
      chess.move({ from, to, promotion: expected.slice(4) || undefined });
      solIdx.current += 1;
      setFen(chess.fen());
      setLastMove({ from, to });
      setWrong(false);
      setHint(false);
      if (solIdx.current >= puzzle.solution.length) {
        setStatus("solved");
        return;
      }
      setStatus("opponent");
      window.setTimeout(() => {
        const reply = puzzle.solution[solIdx.current];
        chess.move({ from: reply.slice(0, 2), to: reply.slice(2, 4), promotion: reply.slice(4) || undefined });
        solIdx.current += 1;
        setFen(chess.fen());
        setLastMove({ from: reply.slice(0, 2), to: reply.slice(2, 4) });
        setStatus(solIdx.current >= puzzle.solution.length ? "solved" : "playing");
      }, 600);
    },
    [puzzle, status],
  );

  const side = puzzle?.playerColor === "w" ? "White" : "Black";
  const hintSq = puzzle?.solution[solIdx.current]?.slice(0, 2);
  const hintPiece = hintSq ? chessRef.current?.get(hintSq as never) : null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[130] grid place-items-center bg-ink/50 p-4 backdrop-blur-sm animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-line bg-card p-5 shadow-2xl sm:p-6"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="eyebrow">Daily puzzle</p>
            <h3 className="mt-0.5 text-lg font-semibold text-ink">Find the best move</h3>
          </div>
          <div className="flex items-center gap-1.5">
            {puzzle && (
              <>
                <span className="rounded-md bg-ink-soft px-2 py-0.5 font-mono text-[11px] text-muted">
                  {puzzle.rating}
                </span>
                {puzzle.themes[0] && (
                  <span className="hidden rounded-md bg-ink-soft px-2 py-0.5 text-[11px] text-muted sm:inline">
                    {puzzle.themes[0]}
                  </span>
                )}
              </>
            )}
            <button
              onClick={onClose}
              aria-label="Close"
              className="grid h-7 w-7 place-items-center rounded-lg text-muted transition-colors hover:bg-ink-soft hover:text-ink"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {status === "loading" ? (
          <Loader label="Loading today’s puzzle" />
        ) : status === "error" || !puzzle ? (
          <p className="py-8 text-center text-sm text-muted">Couldn’t load the puzzle. Try again later.</p>
        ) : (
          <>
            <div className="grid place-items-center">
              <InteractiveBoard
                fen={fen}
                orientation={puzzle.playerColor}
                interactive={status === "playing"}
                lastMove={lastMove}
                onMove={handleMove}
                size={size}
              />
            </div>

            <div className="mt-4 min-h-[1.5rem] text-center text-sm">
              {status === "solved" ? (
                <span className="inline-flex items-center gap-1.5 font-semibold text-positive">
                  <CheckCircle2 size={18} /> Solved — new puzzle tomorrow.
                </span>
              ) : status === "opponent" ? (
                <span className="text-muted">Good move — seeing the reply…</span>
              ) : wrong ? (
                <span className="font-medium text-accent">Not the one — try another move.</span>
              ) : (
                <span className="text-ink">
                  <span className="font-semibold">{side} to play.</span> Find the strongest move.
                </span>
              )}
            </div>

            {hint && hintPiece && status === "playing" && (
              <p className="mt-1 text-center text-sm text-muted">
                Try your <span className="font-medium text-ink">{PIECE_NAME[hintPiece.type]}</span> on{" "}
                <span className="font-mono text-ink">{hintSq}</span>.
              </p>
            )}

            <div className="mt-4 flex items-center justify-center gap-2">
              {status === "playing" && (
                <button
                  onClick={() => setHint(true)}
                  className="flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1 text-xs font-medium transition-colors hover:bg-ink-soft"
                >
                  <Lightbulb size={13} /> Hint
                </button>
              )}
              {(status === "solved" || solIdx.current > 0 || wrong) && (
                <button
                  onClick={() => startWith(puzzle)}
                  className="flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1 text-xs font-medium transition-colors hover:bg-ink-soft"
                >
                  <RotateCcw size={13} /> Retry
                </button>
              )}
              {puzzle.url && (
                <a
                  href={puzzle.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1 text-xs font-medium transition-colors hover:bg-ink-soft"
                >
                  <ExternalLink size={13} /> Lichess
                </a>
              )}
            </div>

            <p className="mt-3 text-center text-[11px] text-muted">
              {puzzle.source === "lichess" ? "Puzzle from Lichess · changes daily" : "From Strategem’s bank"}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
