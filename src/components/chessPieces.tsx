import type { ReactElement } from "react";

// Piece set for react-chessboard's `customPieces`. We render the Unicode chess
// figurines (font glyphs — no third-party piece artwork, so no licensing) styled
// like the original board: flat fill, no hard outline, just a soft highlight +
// shadow for depth. White pieces are the outline glyphs, black the filled ones,
// so the two sides read clearly even though both use the same ink colour.
// Drag/animation still come from react-chessboard — this only swaps the visual.

const GLYPH: Record<string, string> = {
  wK: "♔",
  wQ: "♕",
  wR: "♖",
  wB: "♗",
  wN: "♘",
  wP: "♙",
  bK: "♚",
  bQ: "♛",
  bR: "♜",
  bB: "♝",
  bN: "♞",
  bP: "♟",
};

type PieceRenderer = (props: {
  squareWidth: number;
  isDragging?: boolean;
}) => ReactElement;

const make =
  (glyph: string): PieceRenderer =>
  ({ squareWidth }) => (
    <div
      style={{
        width: squareWidth,
        height: squareWidth,
        display: "grid",
        placeItems: "center",
      }}
    >
      <span
        style={{
          fontSize: squareWidth * 0.84,
          lineHeight: 1,
          color: "#1c1b18",
          // soft depth, transparent outline (no stroke)
          textShadow:
            "0 1px 0 rgba(255,255,255,0.35), 0 2px 3px rgba(0,0,0,0.25)",
          userSelect: "none",
        }}
      >
        {glyph}
      </span>
    </div>
  );

export const CUSTOM_PIECES: Record<string, PieceRenderer> = Object.fromEntries(
  Object.entries(GLYPH).map(([key, glyph]) => [key, make(glyph)]),
);
