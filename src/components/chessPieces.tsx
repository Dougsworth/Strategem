import type { ReactElement } from "react";

// Original Strategem chess piece set. Each piece is a single continuous outline
// in a 45×45 viewBox — drawn from scratch, so we ship NO third-party piece
// artwork (sidesteps the licensing on bundled/default sets). paint-order:stroke
// keeps the outline crisp behind the fill, which is what makes the light pieces
// readable on light squares.

type Shape = "p" | "n" | "b" | "r" | "q" | "k";

const PATHS: Record<Shape, string> = {
  // pawn — head, neck, flared body, foot (traced right side down, base, up left)
  p: "M22.5 7C25.5 7 27.6 9.4 27 12.2 26.6 14 25.4 15.4 24 16.2 26.6 17.3 28.2 20 27.6 23L30.5 33 33.5 39 11.5 39 14.5 33 17.4 23C16.8 20 18.4 17.3 21 16.2 19.6 15.4 18.4 14 18 12.2 17.4 9.4 19.5 7 22.5 7Z",
  // rook — crenellated top, tapered body, foot
  r: "M11.5 39 13.5 33 13 19 11 16 11 10 15 10 15 13 19 13 19 10 26 10 26 13 30 13 30 10 34 10 34 16 32 19 31.5 33 33.5 39Z",
  // bishop — finial ball, mitre, body, foot
  b: "M22.5 6C23.6 6 24.5 6.9 24.5 8 24.5 8.8 24 9.5 23.3 9.8 26.5 11.7 29 15.2 29 19.2 29 21.8 27.6 23.9 25.4 25.1L28 33 31 39 14 39 17 33 19.6 25.1C17.4 23.9 16 21.8 16 19.2 16 15.2 18.5 11.7 21.7 9.8 21 9.5 20.5 8.8 20.5 8 20.5 6.9 21.4 6 22.5 6Z",
  // knight — stylized horse head facing left
  n: "M31.5 39 31 33C31 28.5 31.5 24 29.5 20.5 31 18.8 30.4 16 28.3 14.2L29.2 11C27.3 9.2 24.5 8.6 23 6.5L21.4 9.2C18.3 10.2 15.6 12.2 14 15.2 12.4 18.2 12 21.8 13.2 24.4L16.4 22.2 14.8 25.2C13.8 28.2 13.9 31.2 14.4 33L13.4 39Z",
  // queen — pointed crown over body and foot
  q: "M11.5 39 13.5 33 11.3 19 8.5 14.5 11.8 13.2 14.6 18.5 15.6 9.5 19.2 17.2 22.5 8 25.8 17.2 29.4 9.5 30.4 18.5 33.2 13.2 36.5 14.5 33.7 19 31.5 33 33.5 39Z",
  // king — cross finial, crown, body, foot
  k: "M20.7 6 24.3 6 24.3 9 27.3 9 27.3 12.4 24.3 12.4 24.3 16.2C28.2 17.4 31 20.9 31 25.2 31 28.2 29.5 30.8 27.1 32.3L30 33 31.5 39 13.5 39 15 33 17.9 32.3C15.5 30.8 14 28.2 14 25.2 14 20.9 16.8 17.4 20.7 16.2L20.7 12.4 17.7 12.4 17.7 9 20.7 9Z",
};

function PieceSvg({
  shape,
  light,
  size,
}: {
  shape: Shape;
  light: boolean;
  size: number;
}): ReactElement {
  const fill = light ? "#f3eee3" : "#27231e";
  const stroke = light ? "#2a2622" : "#0c0b09";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 45 45"
      style={{ display: "block" }}
      aria-hidden
    >
      <g
        fill={fill}
        stroke={stroke}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        style={{ paintOrder: "stroke" }}
      >
        <path d={PATHS[shape]} />
        {shape === "n" && (
          <circle cx="19.4" cy="13.6" r="1.15" fill={stroke} stroke="none" />
        )}
      </g>
    </svg>
  );
}

type PieceRenderer = (props: {
  squareWidth: number;
  isDragging?: boolean;
}) => ReactElement;

const make = (shape: Shape, light: boolean): PieceRenderer => {
  const fn: PieceRenderer = ({ squareWidth }) => (
    <PieceSvg shape={shape} light={light} size={squareWidth} />
  );
  return fn;
};

// Map of all 12 pieces in the shape react-chessboard's `customPieces` expects.
export const CUSTOM_PIECES: Record<string, PieceRenderer> = {
  wP: make("p", true),
  wN: make("n", true),
  wB: make("b", true),
  wR: make("r", true),
  wQ: make("q", true),
  wK: make("k", true),
  bP: make("p", false),
  bN: make("n", false),
  bB: make("b", false),
  bR: make("r", false),
  bQ: make("q", false),
  bK: make("k", false),
};
