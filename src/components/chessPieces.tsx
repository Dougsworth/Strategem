import type { ReactElement } from "react";

// Original Strategem piece set for react-chessboard's `customPieces`. Each piece
// is a single continuous outline in a 45×45 viewBox — drawn from scratch, so we
// ship NO third-party piece artwork (react-chessboard's own default set is the
// Wikimedia/Cburnett pieces, which are CC-BY-SA/GPL — exactly what we're avoiding).
// A thin stroke with paint-order:stroke keeps the light pieces readable on light
// squares. react-chessboard still owns drag + animation; this only swaps visuals.

type Shape = "p" | "n" | "b" | "r" | "q" | "k";

// Detailed Staunton silhouettes — each is a segmented body (base disc + body +
// crown/head) so it reads like a real piece, plus a small detail overlay
// (knight eye, bishop slit, rook collar) drawn in the stroke colour for the
// light pieces. paint-order:stroke keeps light pieces readable on light squares.
const PATHS: Record<Shape, string> = {
  p: "M22.5 9.2C24.7 9.2 26.4 10.9 26.4 13 26.4 14.4 25.7 15.6 24.6 16.3 26.4 17.2 27.5 19.1 27 21.2 26.8 22 26.3 22.7 25.7 23.2L28.4 33 14.6 33 17.3 23.2C16.7 22.7 16.2 22 16 21.2 15.5 19.1 16.6 17.2 18.4 16.3 17.3 15.6 16.6 14.4 16.6 13 16.6 10.9 18.3 9.2 22.5 9.2 18.3 9.2Z M13.5 33 31.5 33 33 39 12 39Z",
  r: "M11.5 13 11.5 9 15 9 15 11 18.5 11 18.5 9 22 9 22 11 26.5 11 26.5 9 30 9 30 13 27.5 16 27.5 30 30 33 15 33 17.5 30 17.5 16ZM12 33 33 33 34.5 39 10.5 39Z",
  b: "M22.5 6.2A2 2 0 1 0 22.5 10.2 2 2 0 1 0 22.5 6.2ZM22.5 10.5C25.5 12 28.5 15.5 28.5 19.5 28.5 22 27 24 25 25L27 31 18 31 20 25C18 24 16.5 22 16.5 19.5 16.5 15.5 19.5 12 22.5 10.5ZM16 31 29 31 31 33 14 33ZM13.5 33 31.5 33 33 39 12 39Z",
  n: "M21.5 9 24 6.5C24 6.5 25.5 8.5 25 11 28 12 31 16 31 22L31 33 16 33C16 28 16 26 18 24 13.5 24.5 13 20 13 18.5 13 16 15 13.5 18 12L17.5 9.5 19.5 10.5 21.5 9ZM13.5 33 31.5 33 33 39 12 39Z",
  q: "M9 16A2 2 0 1 0 9 12 2 2 0 1 0 9 16ZM22.5 11A2 2 0 1 0 22.5 7 2 2 0 1 0 22.5 11ZM36 16A2 2 0 1 0 36 12 2 2 0 1 0 36 16ZM9 14 13 27 32 27 36 14 30 24 30 13 25 23 22.5 11 20 23 15 13 15 24ZM13 27 32 27 33.5 31 11.5 31ZM12 33 33 33 34.5 39 10.5 39Z",
  k: "M22.5 5 22.5 11M19.5 7.5 25.5 7.5M22.5 11C22.5 11 27 13 27 17 27 20 24 22 24 22L26.5 31 18.5 31 21 22C21 22 18 20 18 17 18 13 22.5 11 22.5 11ZM16.5 31 28.5 31 30 33 15 33ZM12.5 33 32.5 33 34 39 11 39Z",
};

// Stroke-coloured detail overlays for the light pieces.
const DETAIL: Partial<Record<Shape, string>> = {
  b: "M22.5 16 24.5 19",
  n: "M19 16A0.9 0.9 0 1 0 19 16.01Z",
  r: "M13.5 17 29 17",
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
  const detail = DETAIL[shape];
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
        strokeWidth={1.4}
        strokeLinejoin="round"
        strokeLinecap="round"
        style={{ paintOrder: "stroke" }}
      />
      {detail && (
        <path
          d={detail}
          fill="none"
          stroke={stroke}
          strokeWidth={1.2}
          strokeLinecap="round"
        />
      )}
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
