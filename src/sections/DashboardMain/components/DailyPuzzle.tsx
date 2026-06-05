import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, ExternalLink, Lightbulb, RotateCcw } from "lucide-react";
import { Chess } from "chess.js";
import { InteractiveBoard } from "@/components/InteractiveBoard";
import { useBoardSize } from "@/components/useBoardSize";
import { Loader } from "@/components/Loader";
import { getDailyPuzzle, type DailyPuzzle as Daily } from "@/lib/dailyPuzzle";

type Status = "loading" | "playing" | "opponent" | "solved" | "error";

const PIECE_NAME: Record<string, string> = {
  p: "pawn", n: "knight", b: "bishop", r: "rook", q: "queen", k: "king",
};

// Daily puzzle card — Lichess's free daily puzzle (cached per day), solvable
// inline, with our own bank as the offline fallback. New puzzle every day.
export const DailyPuzzle = () => {
  const [puzzle, setPuzzle] = useState<Daily | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [fen, setFen] = useState("");
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [wrong, setWrong] = useState(false);
  const [hint, setHint] = useState(false);
  const chessRef = useRef<Chess | null>(null);
  const solIdx = useRef(0);
  const size = useBoardSize(320);

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

  if (status === "loading") {
    return (
      <section className="rounded-2xl border border-line bg-card p-6">
        <Loader label="Loading today’s puzzle" />
      </section>
    );
  }
  if (status === "error" || !puzzle) return null; // bank fallback should prevent this

  const side = puzzle.playerColor === "w" ? "White" : "Black";
  const hintSq = puzzle.solution[solIdx.current]?.slice(0, 2);
  const hintPiece = hintSq ? chessRef.current?.get(hintSq as never) : null;

  return (
    <section className="rounded-2xl border border-line bg-card p-5 sm:p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Daily puzzle</p>
          <h3 className="mt-0.5 text-lg font-semibold text-ink">Find the best move</h3>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-muted">
          <span className="rounded-md bg-ink-soft px-2 py-0.5 font-mono">{puzzle.rating}</span>
          {puzzle.themes[0] && (
            <span className="rounded-md bg-ink-soft px-2 py-0.5">{puzzle.themes[0]}</span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-5 sm:flex-row">
        <div className="shrink-0">
          <InteractiveBoard
            fen={fen}
            orientation={puzzle.playerColor}
            interactive={status === "playing"}
            lastMove={lastMove}
            onMove={handleMove}
            size={size}
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col justify-center gap-3">
          {status === "solved" ? (
            <div className="flex items-center gap-2 text-positive">
              <CheckCircle2 size={20} />
              <p className="font-semibold">Solved — nice. New puzzle tomorrow.</p>
            </div>
          ) : status === "opponent" ? (
            <p className="text-muted">Good move — seeing the reply…</p>
          ) : wrong ? (
            <p className="font-medium text-accent">Not the one — try another move.</p>
          ) : (
            <p className="text-ink">
              <span className="font-semibold">{side} to play.</span> Find the strongest move
              {solIdx.current > 0 ? " — keep the line going." : "."}
            </p>
          )}

          {hint && hintPiece && status === "playing" && (
            <p className="text-sm text-muted">
              Try your <span className="font-medium text-ink">{PIECE_NAME[hintPiece.type]}</span> on{" "}
              <span className="font-mono text-ink">{hintSq}</span>.
            </p>
          )}

          <div className="mt-1 flex flex-wrap items-center gap-2">
            {status === "playing" && (
              <button
                onClick={() => setHint(true)}
                className="flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1 text-xs font-medium transition-colors hover:bg-ink-soft"
              >
                <Lightbulb size={13} />
                Hint
              </button>
            )}
            {(status === "solved" || solIdx.current > 0 || wrong) && (
              <button
                onClick={() => startWith(puzzle)}
                className="flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1 text-xs font-medium transition-colors hover:bg-ink-soft"
              >
                <RotateCcw size={13} />
                Retry
              </button>
            )}
            {puzzle.url && (
              <a
                href={puzzle.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1 text-xs font-medium transition-colors hover:bg-ink-soft"
              >
                <ExternalLink size={13} />
                Lichess
              </a>
            )}
          </div>

          <p className="mt-1 text-[11px] text-muted">
            {puzzle.source === "lichess" ? "Puzzle from Lichess · changes daily" : "From Strategem’s bank"}
          </p>
        </div>
      </div>
    </section>
  );
};
