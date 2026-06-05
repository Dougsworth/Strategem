// Lichess's published accuracy model.
// Refs: lila `WinPercent.scala` and `AccuracyPercent.scala`.
//
// The idea: convert a centipawn eval into an expected "win %", then score each
// move by how much win% the player gave up versus the best move. Small drops in
// already-winning or already-losing positions barely dent accuracy; a drop from
// 50% to 20% is brutal. This matches how Lichess reports per-game accuracy, so
// our per-phase numbers line up with what coaches already see on the site.

/** Clamp a number into [min, max]. */
export const clamp = (n: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, n));

/**
 * Win probability (0–100) for the side to move, given a centipawn eval from
 * that side's perspective. Mate scores should be pre-converted to a large cp.
 */
export function winPercentFromCp(cp: number): number {
  const MULTIPLIER = -0.00368208;
  const winChance = 2 / (1 + Math.exp(MULTIPLIER * cp)) - 1;
  return 50 + 50 * winChance;
}

/**
 * Accuracy (0–100) of a single move, given the win% (for the moving side)
 * before and after the move. `before` is the win% with best play available;
 * `after` is the win% the player actually left on the board.
 */
export function accuracyFromWinPercents(before: number, after: number): number {
  const acc = 103.1668 * Math.exp(-0.04354 * (before - after)) - 3.1669;
  return clamp(acc, 0, 100);
}

/**
 * Lichess game accuracy blends a volatility-weighted mean with a harmonic mean
 * of the per-move accuracies, then averages the two. We reuse it for per-phase
 * accuracy so a single horrific move doesn't get washed out by a quiet phase.
 */
export function blendAccuracies(moveAccuracies: number[]): number {
  if (moveAccuracies.length === 0) return 0;

  const harmonic = harmonicMean(moveAccuracies);
  const weighted = weightedMean(moveAccuracies);
  return (harmonic + weighted) / 2;
}

function harmonicMean(xs: number[]): number {
  const safe = xs.map((x) => Math.max(x, 0.01));
  const denom = safe.reduce((s, x) => s + 1 / x, 0);
  return safe.length / denom;
}

/**
 * Weight later/rougher moves more, approximating Lichess's sliding-window
 * volatility weighting without needing the full win% series here.
 */
function weightedMean(xs: number[]): number {
  // A simple monotonic weighting (earlier moves slightly down-weighted) keeps
  // this dependency-free while staying close to Lichess's window weighting.
  let num = 0;
  let den = 0;
  xs.forEach((x, i) => {
    const w = 0.5 + i / Math.max(1, xs.length - 1); // 0.5 → 1.5
    num += x * w;
    den += w;
  });
  return num / den;
}
