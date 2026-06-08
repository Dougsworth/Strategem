import type { ReactElement } from "react";

// Original Strategem piece set for react-chessboard's `customPieces`. Each piece
// is a single continuous outline in a 45×45 viewBox — drawn from scratch, so we
// ship NO third-party piece artwork (react-chessboard's own default set is the
// Wikimedia/Cburnett pieces, which are CC-BY-SA/GPL — exactly what we're avoiding).
// A thin stroke with paint-order:stroke keeps the light pieces readable on light
// squares. react-chessboard still owns drag + animation; this only swaps visuals.

type Shape = "p" | "n" | "b" | "r" | "q" | "k";

const PATHS: Record<Shape, string> = {
  p: "M22.5 8C25.5 8 27.8 10.3 27.8 13.2 27.8 15 26.9 16.6 25.4 17.6 28.6 18.9 30.4 22 29.5 25.3L31.6 39 13.4 39 15.5 25.3C14.6 22 16.4 18.9 19.6 17.6 18.1 16.6 17.2 15 17.2 13.2 17.2 10.3 19.5 8 22.5 8Z",
  r: "M12 39 13.6 24 12 22 12 14C12 13.2 12.6 12.5 13.5 12.5L16 12.5C16.9 12.5 17.5 13.2 17.5 14L17.5 15.5 20.5 15.5 20.5 14C20.5 13.2 21.1 12.5 22 12.5L23 12.5C23.9 12.5 24.5 13.2 24.5 14L24.5 15.5 27.5 15.5 27.5 14C27.5 13.2 28.1 12.5 29 12.5L31.5 12.5C32.4 12.5 33 13.2 33 14L33 22 31.4 24 33 39Z",
  b: "M22.5 5.5C23.7 5.5 24.6 6.4 24.6 7.6 24.6 8.4 24.1 9.1 23.4 9.5 26.6 11.6 28.6 15 28.6 18.6 28.6 21.1 27.3 23.2 25.2 24.2L28 32 30.6 39 14.4 39 17 32 19.8 24.2C17.7 23.2 16.4 21.1 16.4 18.6 16.4 15 18.4 11.6 21.6 9.5 20.9 9.1 20.4 8.4 20.4 7.6 20.4 6.4 21.3 5.5 22.5 5.5Z",
  n: "M22 8C24 9 25.5 11.5 26.5 15 28 17 29.5 21 29.5 25 29.5 29 29.5 33 31 38L14 38C14 34 14 30 15.5 27 16.5 25.5 16.5 25 15.5 23.5L11.5 25 12.8 20.5C13.5 17 15.5 14 18.5 12L17.5 9.5 20 10.5 20.3 7Z",
  q: "M11.5 39 13.4 25 11 17A2.1 2.1 0 1 1 15.2 17A2.1 2.1 0 1 1 19.4 17A2.1 2.1 0 1 1 23.6 17A2.1 2.1 0 1 1 27.8 17A2.1 2.1 0 1 1 32 17L34 17 33.6 25 31.5 39Z",
  k: "M11.5 39 13.4 25 11 19C11 15 14.2 12 18 12.5L18 9 21 9 21 5.5 24 5.5 24 9 27 9 27 12.5C30.8 12 34 15 34 19L31.6 25 33.5 39Z",
};

function PieceSvg({
  shape,
  light,
  size,
}: {
  shape: Shape;
  light: boolean;
  size: number | string;
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

// A single piece that fills its container (for static mini-boards etc.).
export function PieceArt({
  shape,
  light,
}: {
  shape: "p" | "n" | "b" | "r" | "q" | "k";
  light: boolean;
}): ReactElement {
  return <PieceSvg shape={shape} light={light} size="100%" />;
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
