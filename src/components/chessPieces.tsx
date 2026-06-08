import type { ReactElement } from "react";

// Original Strategem piece set for react-chessboard's `customPieces`. Each piece
// is a single continuous outline in a 45×45 viewBox — drawn from scratch, so we
// ship NO third-party piece artwork (react-chessboard's own default set is the
// Wikimedia/Cburnett pieces, which are CC-BY-SA/GPL — exactly what we're avoiding).
// A thin stroke with paint-order:stroke keeps the light pieces readable on light
// squares. react-chessboard still owns drag + animation; this only swaps visuals.

type Shape = "p" | "n" | "b" | "r" | "q" | "k";

const PATHS: Record<Shape, string> = {
  p: "M22.5 8C24.8 8 26.5 9.8 26.5 12 26.5 13.5 25.6 14.8 24.3 15.4 27 16.5 28.5 19.2 28 22L30.7 38 14.3 38 17 22C16.5 19.2 18 16.5 20.7 15.4 19.4 14.8 18.5 13.5 18.5 12 18.5 9.8 20.2 8 22.5 8Z",
  r: "M12.5 38 13.8 24 12 22 12 13 16 13 16 16 20.5 16 20.5 13 24.5 13 24.5 16 29 16 29 13 33 13 33 22 31.2 24 32.5 38Z",
  b: "M22.5 6C23.4 6 24.1 6.7 24.1 7.6 24.1 8.2 23.8 8.7 23.3 9 26 10.8 28 14 28 17.5 28 20 26.8 22 25 23L27.5 31 30 38 15 38 17.5 31 20 23C18.2 22 17 20 17 17.5 17 14 19 10.8 21.7 9 21.2 8.7 20.9 8.2 20.9 7.6 20.9 6.7 21.6 6 22.5 6Z",
  n: "M22 8C24 9 25.5 11.5 26.5 15 28 17 29.5 21 29.5 25 29.5 29 29.5 33 31 38L14 38C14 34 14 30 15.5 27 16.5 25.5 16.5 25 15.5 23.5L11.5 25 12.8 20.5C13.5 17 15.5 14 18.5 12L17.5 9.5 20 10.5 20.3 7Z",
  q: "M11.5 38 13.3 26 11 19 8.5 13 12 16 15 9 18.5 16 22.5 8 26.5 16 30 9 33 16 36.5 13 34 19 31.7 26 33.5 38Z",
  k: "M11.5 38 13.3 26 11 20C11 16 14 13 18 13L20.8 13 20.8 8 17 8 17 5 20.8 5 20.8 2 24 2 24 5 27.2 5 27.2 8 24 8 24 13C31 13 34 16 34 20L31.7 26 33.5 38Z",
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
  const fill = light ? "#f7f4ed" : "#2b2723";
  const stroke = light ? "#2a2622" : "#100e0c";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 45 45"
      style={{ display: "block" }}
      aria-hidden
    >
      <path
        d={PATHS[shape]}
        fill={fill}
        stroke={stroke}
        strokeWidth={1.3}
        strokeLinejoin="round"
        strokeLinecap="round"
        style={{ paintOrder: "stroke" }}
      />
    </svg>
  );
}

type PieceRenderer = (props: {
  squareWidth: number;
  isDragging?: boolean;
}) => ReactElement;

const make =
  (shape: Shape, light: boolean): PieceRenderer =>
  ({ squareWidth }) => (
    <PieceSvg shape={shape} light={light} size={squareWidth} />
  );

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
