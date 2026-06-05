import { useId } from "react";
import { Chessboard } from "react-chessboard";
import type { Color } from "chess.js";
import { useBoardTheme } from "@/lib/boardTheme";

// Professional board via react-chessboard (real SVG piece set, drag-and-drop).
// Same prop shape as before, so every consumer (trainers, evidence, viewer)
// upgrades automatically. The parent owns the position (fen) and validates
// moves — onPieceDrop reports the move and we let the fen prop drive the board.
export const InteractiveBoard = ({
  fen,
  orientation,
  interactive,
  lastMove,
  onMove,
  size = 360,
}: {
  fen: string;
  orientation: Color;
  interactive: boolean;
  lastMove?: { from: string; to: string } | null;
  onMove: (from: string, to: string, promotion?: string) => void;
  size?: number;
}) => {
  const id = useId();
  const theme = useBoardTheme();

  const squareStyles: Record<string, React.CSSProperties> = {};
  if (lastMove) {
    const hl = { background: "rgba(246, 217, 107, 0.55)" };
    squareStyles[lastMove.from] = hl;
    squareStyles[lastMove.to] = hl;
  }

  return (
    <Chessboard
      id={id}
      position={fen}
      boardWidth={size}
      boardOrientation={orientation === "w" ? "white" : "black"}
      arePiecesDraggable={interactive}
      onPieceDrop={(from, to) => {
        onMove(from, to);
        return false; // parent updates the fen if the move is accepted
      }}
      customSquareStyles={squareStyles}
      customBoardStyle={{
        borderRadius: "10px",
        boxShadow: "0 6px 20px rgba(0,0,0,0.14)",
      }}
      customDarkSquareStyle={{ backgroundColor: theme.dark }}
      customLightSquareStyle={{ backgroundColor: theme.light }}
      arePremovesAllowed={false}
      showBoardNotation
    />
  );
};
