import { useEffect, useRef, useState } from "react";
import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";
import { Target, TrendingUp } from "lucide-react";
import { HERO_POSITIONS } from "./heroPositions";
import { CUSTOM_PIECES } from "@/components/chessPieces";

// A LIVE board for the hero: it cycles through ~240 baked-in middlegame
// positions (static FENs — no engine/AI at runtime), self-playing a few legal
// moves from each before advancing to the next. Visitors can grab a piece and
// play their own — drags are validated by chess.js, so only legal moves land.
// Auto-play pauses for a few seconds after anyone touches it, then resumes.
// Floating analysis cards are decoration.

// Fresh steel-blue board palette.
const LIGHT = "#e8edf1";
const DARK = "#6f8da9";

const PLAY_INTERVAL = 1600; // ms between self-play moves
const IDLE_AFTER_TOUCH = 6000; // pause self-play this long after a human move
const MOVES_PER_POSITION = 6; // self-play this many plies, then cycle to the next

function pickMove(game: Chess) {
  const moves = game.moves({ verbose: true });
  if (!moves.length) return null;
  // Lightly favour captures so the self-play feels purposeful, not aimless.
  const captures = moves.filter((m) => m.captured);
  const pool = captures.length && captures.length < moves.length ? captures : moves;
  return pool[Math.floor(Math.random() * pool.length)];
}

export const HeroBoard = () => {
  // Start each page load on a different position, then cycle forward from there.
  const idxRef = useRef((Math.random() * HERO_POSITIONS.length) | 0);
  const gameRef = useRef(new Chess(HERO_POSITIONS[idxRef.current]));
  const wrapRef = useRef<HTMLDivElement>(null);
  const lastTouch = useRef(0);
  const plies = useRef(0);

  const [fen, setFen] = useState(gameRef.current.fen());
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [width, setWidth] = useState(380);

  // Keep the board sized to its container (react-chessboard needs an explicit px).
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setWidth(Math.round(entry.contentRect.width));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Advance to the next baked-in position and play on from there.
  function loadNext() {
    idxRef.current = (idxRef.current + 1) % HERO_POSITIONS.length;
    gameRef.current = new Chess(HERO_POSITIONS[idxRef.current]);
    plies.current = 0;
    setFen(gameRef.current.fen());
    setLastMove(null);
  }

  // Self-play loop. Skips a beat right after a human move so theirs stays visible.
  useEffect(() => {
    const id = setInterval(() => {
      if (Date.now() - lastTouch.current < IDLE_AFTER_TOUCH) return;
      const game = gameRef.current;
      if (game.isGameOver() || plies.current >= MOVES_PER_POSITION) {
        loadNext();
        return;
      }
      const move = pickMove(game);
      if (!move) {
        loadNext();
        return;
      }
      game.move(move);
      plies.current += 1;
      setFen(game.fen());
      setLastMove({ from: move.from, to: move.to });
    }, PLAY_INTERVAL);
    return () => clearInterval(id);
  }, []);

  function onDrop(from: string, to: string) {
    try {
      const move = gameRef.current.move({ from, to, promotion: "q" });
      if (!move) return false;
      lastTouch.current = Date.now();
      plies.current += 1;
      setFen(gameRef.current.fen());
      setLastMove({ from: move.from, to: move.to });
      return true;
    } catch {
      return false; // illegal — snap the piece back
    }
  }

  const squareStyles: Record<string, React.CSSProperties> = {};
  if (lastMove) {
    const hl = { background: "oklch(0.56 0.19 38 / 0.28)" };
    squareStyles[lastMove.from] = hl;
    squareStyles[lastMove.to] = hl;
  }

  return (
    <div className="relative mx-auto w-full max-w-md">
      {/* ambient glows */}
      <div className="pointer-events-none absolute -right-10 -top-10 h-56 w-56 animate-glow-pulse rounded-full bg-accent/30 blur-[90px]" />
      <div
        className="pointer-events-none absolute -bottom-12 -left-10 h-56 w-56 animate-float rounded-full bg-positive/20 blur-[90px]"
        style={{ animationDelay: "1.2s" }}
      />

      {/* the live board */}
      <div className="relative rounded-[18px] border border-line bg-card p-2 shadow-[0_30px_70px_-28px_rgba(20,18,15,0.45)] sm:rounded-[22px] sm:p-3">
        <div ref={wrapRef} className="w-full">
          <Chessboard
            id="hero-board"
            position={fen}
            boardWidth={width}
            onPieceDrop={onDrop}
            customPieces={CUSTOM_PIECES}
            customSquareStyles={squareStyles}
            customBoardStyle={{ borderRadius: "10px" }}
            customDarkSquareStyle={{ backgroundColor: DARK }}
            customLightSquareStyle={{ backgroundColor: LIGHT }}
            arePremovesAllowed={false}
            animationDuration={300}
            showBoardNotation={false}
          />
        </div>
      </div>

      {/* drag-me hint */}
      <div className="mt-3 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-muted/70">
        Live board — drag a piece to play
      </div>

      {/* floating accuracy card */}
      <div
        className="absolute -right-4 top-8 hidden animate-float rounded-2xl border border-line bg-card/95 p-3 shadow-[0_18px_40px_-18px_rgba(20,18,15,0.4)] backdrop-blur sm:block md:-right-8"
        style={{ animationDelay: "0.6s" }}
      >
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
          Accuracy
        </p>
        <div className="mt-0.5 flex items-end gap-2">
          <span className="font-display text-2xl font-bold tracking-tight">79%</span>
          <span className="mb-0.5 flex items-center gap-0.5 text-[11px] font-semibold text-positive">
            <TrendingUp size={12} /> +4
          </span>
        </div>
      </div>

      {/* floating next-focus card */}
      <div
        className="absolute -left-4 bottom-14 hidden animate-float rounded-2xl border border-line bg-card/95 p-3 shadow-[0_18px_40px_-18px_rgba(20,18,15,0.4)] backdrop-blur sm:block md:-left-10"
        style={{ animationDelay: "1.6s" }}
      >
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
          Next focus
        </p>
        <div className="mt-1 flex items-center gap-1.5">
          <span className="grid h-6 w-6 place-items-center rounded-lg bg-accent-soft text-accent">
            <Target size={13} />
          </span>
          <span className="text-sm font-semibold">Rook endgames</span>
        </div>
      </div>

      {/* blunder pill */}
      <div
        className="absolute right-6 bottom-4 animate-float rounded-full bg-accent px-3 py-1 text-[11px] font-semibold text-paper shadow-[0_10px_24px_-8px_oklch(0.56_0.19_38_/_0.6)]"
        style={{ animationDelay: "0.9s" }}
      >
        Blunder · move 24
      </div>
    </div>
  );
};
