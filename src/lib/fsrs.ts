// FSRS — Free Spaced Repetition Scheduler (v5, long-term formulas).
//
// Each card's memory is modelled as two numbers: `stability` (days until the
// chance of recall decays to the target) and `difficulty` (1–10, intrinsic
// hardness). After every review we predict how well the card was remembered
// and reschedule it for right before it would be forgotten — far better
// retention-per-review than the fixed-multiplier SM-2 most chess tools use.
//
// We use the published FSRS-5 default weights and the day-granular formulas;
// the same-day "short-term" stability bump (w[17], w[18]) is intentionally
// omitted — we never grow a card within the same day.
// Reference: open-spaced-repetition (ts-fsrs / py-fsrs).

export type Grade = 1 | 2 | 3 | 4; // Again, Hard, Good, Easy

export interface Memory {
  /** Days until predicted recall probability falls to the target retention. */
  stability: number;
  /** Intrinsic hardness, 1 (easy) … 10 (hard). */
  difficulty: number;
}

// FSRS-5 default parameters (19 weights).
const W = [
  0.40255, 1.18385, 3.173, 15.69105, 7.1949, 0.5345, 1.4604, 0.0046, 1.54575,
  0.1192, 1.01925, 1.9395, 0.11, 0.29605, 2.2698, 0.2315, 2.9898, 0.51655,
  0.6621,
];

const DECAY = -0.5;
const FACTOR = Math.pow(0.9, 1 / DECAY) - 1; // = 19/81 ≈ 0.2345679
const MIN_S = 0.01;
const MAX_S = 36500; // ~100 years

export const DEFAULT_RETENTION = 0.9;

const clampD = (d: number) => Math.min(Math.max(d, 1), 10);
const clampS = (s: number) => Math.min(Math.max(s, MIN_S), MAX_S);

const initStability = (g: Grade): number => clampS(W[g - 1]);
const initDifficulty = (g: Grade): number =>
  clampD(W[4] - Math.exp(W[5] * (g - 1)) + 1);

/** Probability of recall after `t` days at stability `s`. */
export function retrievability(t: number, s: number): number {
  return Math.pow(1 + FACTOR * (t / s), DECAY);
}

/** Days until recall probability decays to `target` — i.e. the next interval. */
export function intervalDays(s: number, target = DEFAULT_RETENTION): number {
  const raw = (s / FACTOR) * (Math.pow(target, 1 / DECAY) - 1);
  return Math.max(1, Math.round(raw));
}

function nextDifficulty(d: number, g: Grade): number {
  const deltaD = -W[6] * (g - 3);
  const damped = d + (deltaD * (10 - d)) / 9; // linear damping
  const reverted = W[7] * initDifficulty(4) + (1 - W[7]) * damped; // mean reversion
  return clampD(reverted);
}

function nextStabilitySuccess(d: number, s: number, r: number, g: Grade): number {
  const hard = g === 2 ? W[15] : 1;
  const easy = g === 4 ? W[16] : 1;
  const inc =
    Math.exp(W[8]) *
    (11 - d) *
    Math.pow(s, -W[9]) *
    (Math.exp((1 - r) * W[10]) - 1) *
    hard *
    easy;
  return clampS(s * (1 + inc));
}

function nextStabilityForget(d: number, s: number, r: number): number {
  const sf =
    W[11] *
    Math.pow(d, -W[12]) *
    (Math.pow(s + 1, W[13]) - 1) *
    Math.exp((1 - r) * W[14]);
  return clampS(Math.min(sf, s)); // a lapse never increases stability
}

/** Memory state after a card's first-ever review. */
export function scheduleNew(g: Grade): Memory {
  return { stability: initStability(g), difficulty: initDifficulty(g) };
}

/** Memory state after reviewing a card last seen `elapsedDays` ago. */
export function schedule(prev: Memory, g: Grade, elapsedDays: number): Memory {
  const t = Math.max(0, elapsedDays);
  const r = retrievability(t, prev.stability);
  const difficulty = nextDifficulty(prev.difficulty, g);
  const stability =
    g === 1
      ? nextStabilityForget(prev.difficulty, prev.stability, r)
      : nextStabilitySuccess(prev.difficulty, prev.stability, r, g);
  return { stability, difficulty };
}
