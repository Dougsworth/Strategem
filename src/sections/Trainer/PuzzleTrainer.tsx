import { useCallback, useEffect, useRef, useState } from "react";
import { Chess } from "chess.js";
import { InteractiveBoard } from "@/components/InteractiveBoard";
import { fetchPuzzle, type Difficulty, type Puzzle } from "@/lib/puzzles";

type Status = "loading" | "playing" | "opponent" | "solved" | "error";
type Feedback = "right" | "wrong" | null;

const PIECE_NAME: Record<string, string> = {
  p: "pawn",
  n: "knight",
  b: "bishop",
  r: "rook",
  q: "queen",
  k: "king",
};

export const PuzzleTrainer = ({
  theme,
  difficulty,
  title,
  onClose,
}: {
  theme: string;
  difficulty: Difficulty;
  title: string;
  onClose: () => void;
}) => {
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [fen, setFen] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [showHint, setShowHint] = useState(false);

  const chessRef = useRef<Chess | null>(null);
  const solIdxRef = useRef(0);

  const start = useCallback((p: Puzzle) => {
    chessRef.current = new Chess(p.fen);
    solIdxRef.current = 0;
    setPuzzle(p);
    setFen(p.fen);
    setFeedback(null);
    setLastMove(null);
    setAttempts(0);
    setShowHint(false);
    setStatus("playing");
  }, []);

  const load = useCallback(async () => {
    setStatus("loading");
    const exclude = puzzle?.id;
    const p = await fetchPuzzle(theme, difficulty, { exclude }).catch(() => null);
    if (!p) {
      setStatus("error");
      return;
    }
    start(p);
  }, [theme, difficulty, start, puzzle]);

  // Load the first puzzle on open.
  useEffect(() => {
    void load();
    // Only on mount — avoid reloading when `load` identity changes mid-puzzle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleMove = useCallback(
    (from: string, to: string) => {
      const chess = chessRef.current;
      if (!chess || !puzzle || status !== "playing") return;
      const expected = puzzle.solution[solIdxRef.current];
      const matches = expected.slice(0, 2) === from && expected.slice(2, 4) === to;

      if (!matches) {
        setFeedback("wrong");
        setAttempts((a) => a + 1);
        return;
      }

      // Correct: play the move exactly as the solution specifies.
      chess.move({
        from: expected.slice(0, 2),
        to: expected.slice(2, 4),
        promotion: expected.slice(4) || undefined,
      });
      solIdxRef.current += 1;
      setFen(chess.fen());
      setLastMove({ from, to });
      setFeedback("right");
      setShowHint(false);

      if (solIdxRef.current >= puzzle.solution.length) {
        setStatus("solved");
        return;
      }

      // Opponent's automatic reply after a beat.
      setStatus("opponent");
      window.setTimeout(() => {
        const reply = puzzle.solution[solIdxRef.current];
        chess.move({
          from: reply.slice(0, 2),
          to: reply.slice(2, 4),
          promotion: reply.slice(4) || undefined,
        });
        solIdxRef.current += 1;
        setFen(chess.fen());
        setLastMove({ from: reply.slice(0, 2), to: reply.slice(2, 4) });
        setStatus(
          solIdxRef.current >= puzzle.solution.length ? "solved" : "playing",
        );
      }, 650);
    },
    [puzzle, status],
  );

  const hintText = (() => {
    if (!puzzle || !chessRef.current) return "";
    const sq = puzzle.solution[solIdxRef.current]?.slice(0, 2);
    const piece = sq ? chessRef.current.get(sq as never) : null;
    return piece ? `Move your ${PIECE_NAME[piece.type]} on ${sq}.` : "";
  })();

  return (
    <div
      className="fixed inset-0 z-[110] grid place-items-center bg-ink/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl animate-fade-in rounded-2xl bg-card p-6 shadow-2xl ring-1 ring-line"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <p className="eyebrow">Practice · {title}</p>
            <h2 className="mt-1 font-display text-2xl font-bold tracking-tight">
              Solve the puzzle
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg bg-ink px-3 py-1.5 text-sm font-medium text-paper"
          >
            Close
          </button>
        </div>

        <div className="flex flex-col gap-6 sm:flex-row">
          <div className="shrink-0">
            {status === "loading" ? (
              <div className="h-[360px] w-[360px] animate-pulse rounded-lg bg-ink-soft" />
            ) : status === "error" ? (
              <div className="grid h-[360px] w-[360px] place-items-center rounded-lg bg-ink-soft text-sm text-muted">
                Couldn’t load a puzzle. Try again.
              </div>
            ) : (
              puzzle && (
                <InteractiveBoard
                  fen={fen}
                  orientation={puzzle.playerColor}
                  interactive={status === "playing"}
                  lastMove={lastMove}
                  onMove={handleMove}
                />
              )
            )}
          </div>

          <div className="flex flex-1 flex-col">
            {puzzle && (
              <p className="font-mono text-xs text-muted">
                Puzzle level {puzzle.rating} ·{" "}
                {puzzle.playerColor === "w" ? "White" : "Black"} to play
              </p>
            )}

            <div className="mt-3 min-h-[64px]">
              {status === "solved" ? (
                <div>
                  <p className="font-display text-xl font-bold text-positive">
                    Solved! 🎉
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    Nice — you found the whole line.
                  </p>
                </div>
              ) : status === "opponent" ? (
                <p className="text-sm text-muted">Opponent is replying…</p>
              ) : feedback === "wrong" ? (
                <div>
                  <p className="font-display text-lg font-bold text-accent">
                    Not the one — try again.
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    Look for the strongest move in the position.
                  </p>
                </div>
              ) : feedback === "right" ? (
                <p className="font-display text-lg font-bold text-positive">
                  Yes! Keep going.
                </p>
              ) : (
                <div>
                  <p className="font-display text-lg font-bold">Your move.</p>
                  <p className="mt-1 text-sm text-muted">
                    Click a piece, then click where it should go.
                  </p>
                </div>
              )}
            </div>

            {showHint && status === "playing" && (
              <p className="mt-1 rounded-lg bg-ink-soft px-3 py-2 text-sm text-ink">
                💡 {hintText}
              </p>
            )}

            <div className="mt-auto flex flex-wrap gap-2 pt-4">
              {status === "playing" && attempts >= 1 && !showHint && (
                <button
                  onClick={() => setShowHint(true)}
                  className="rounded-lg border border-line px-4 py-2 text-sm font-medium transition-colors hover:bg-ink-soft"
                >
                  Show a hint
                </button>
              )}
              <button
                onClick={() => void load()}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-bold text-paper transition-opacity hover:opacity-90"
              >
                {status === "solved" ? "Next puzzle →" : "Skip / new puzzle"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
