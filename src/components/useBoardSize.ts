import { useEffect, useState } from "react";

// Sizes a chessboard to fill the viewport on a full-screen analysis page,
// capped so it never gets absurd on huge monitors.
export function useBoardSize(max = 620): number {
  const [size, setSize] = useState(420);
  useEffect(() => {
    const calc = () =>
      setSize(
        Math.max(
          280,
          Math.min(
            max,
            Math.floor(window.innerHeight * 0.78),
            Math.floor(window.innerWidth * 0.55),
          ),
        ),
      );
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, [max]);
  return size;
}
