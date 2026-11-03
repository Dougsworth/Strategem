import { useEffect, useRef, useState } from "react";
import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";
import { HERO_POSITIONS } from "./heroPositions";

// A LIVE board for the hero: it cycles through ~240 baked-in middlegame
// positions (static FENs — no engine/AI at runtime), self-playing a few legal
// moves from each before advancing to the next. Visitors can grab a piece and
// play their own — drags are validated by chess.js, so only legal moves land.
// Auto-play pauses for a few seconds after anyone touches it, then resumes.
// The analysis readout sits under the board so nothing covers the pieces.

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


      {/* the live board */}
      <div className="relative rounded-[18px] border border-line bg-card p-2 shadow-[0_8px_24px_rgba(0,0,0,0.06)] sm:rounded-[22px] sm:p-3">
        <div ref={wrapRef} className="w-full min-w-0">
          <Chessboard
            id="hero-board"
            position={fen}
            boardWidth={width}
            onPieceDrop={onDrop}
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

      {/* analysis readout, under the board so it never covers a piece */}
      <dl className="mt-4 grid grid-cols-3 gap-4 border-b border-line pb-4 text-sm">
        <div>
          <dt className="text-xs text-muted">Accuracy</dt>
          <dd className="mt-1 font-medium tabular-nums">
            79% <span className="text-xs text-positive">+4</span>
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Next focus</dt>
          <dd className="mt-1 font-medium">Rook endgames</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Blunder</dt>
          <dd className="mt-1 font-medium tabular-nums text-accent">Move 24</dd>
        </div>
      </dl>

      {/* drag-me hint */}
      <p className="mt-3 text-xs text-muted">
        Live board. Drag a piece to play
      </p>
    </div>
  );
};
