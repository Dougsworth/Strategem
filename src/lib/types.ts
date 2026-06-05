// Domain types for a computed student report.
// Everything the dashboard renders should come from a StudentReport — no hardcoded numbers.

export type Platform = "lichess" | "chesscom";

export type Phase = "opening" | "middlegame" | "endgame";

export type Trend = "rising" | "steady" | "plateau" | "declining";

/** A single point on the rating-drift sparkline. */
export interface RatingPoint {
  /** ms epoch */
  date: number;
  rating: number;
}

/** Per-game accuracy over time — the real growth curve. */
export interface GamePoint {
  /** ms epoch of the game */
  date: number;
  accuracy: number;
}

/** Accuracy for one game phase, derived from per-move centipawn loss. */
export interface PhaseStrength {
  phase: Phase;
  /** 0–100 accuracy, averaged over the student's moves in this phase. */
  accuracy: number;
  /** Average centipawn loss in this phase (lower = better). */
  acpl: number;
  /** How many of the student's moves fell in this phase. */
  moves: number;
}

/** A concrete moment a finding is based on — so any number can be audited. */
export interface Evidence {
  gameId: string;
  /** 0-based half-move index of the student's move. */
  ply: number;
  /** Position before the student's move (FEN). */
  fen: string;
  /** Side to move in `fen` (the student). */
  turn: "w" | "b";
  /** The move played (for mistakes) or the move that should have been played. */
  san: string;
  /** The engine's best move in UCI — the answer for a "fix it" drill. */
  solutionUci?: string;
  /** Deep link to the game at that move on Lichess. */
  url: string;
  /** Short caption, e.g. "vs Magnus · move 24". */
  label: string;
}

/** A recurring mistake pattern, e.g. "Dropping pieces (x4)". */
export interface RecurringError {
  key: string;
  title: string;
  description: string;
  /** Number of times this pattern occurred across the sampled games. */
  count: number;
  /** Real positions where it happened (capped), for auditing. */
  examples: Evidence[];
}

/** Best-effort tactical-motif accuracy estimate. */
export interface TacticalMotif {
  key: string;
  /** Two-letter badge, e.g. "Fk". */
  badge: string;
  title: string;
  description: string;
  /** 0–100 estimate. Null when we have no signal for this motif. */
  accuracy: number | null;
  /** How many data points fed this estimate (low = take with a grain of salt). */
  sample: number;
  /** Whether the sample is large enough to trust the percentage. */
  reliable: boolean;
  /** Positions where this tactic was available but the student missed it. */
  missed: Evidence[];
}

/** A quick read on the student's most recent analysed game — reuses the games
 * already fetched for the report, so it costs no extra requests. */
export interface LastGameSummary {
  gameId: string;
  url: string;
  opponent: string;
  color: "w" | "b";
  result: "win" | "loss" | "draw";
  /** 0–100 accuracy for this single game. */
  accuracy: number;
  /** ms epoch of the game. */
  date: number;
  /** The student's mistakes in THIS game, for one-click review. */
  mistakes: Evidence[];
}

/** One time-control a player has games in (bullet, blitz, rapid, classical). */
export interface PerfSummary {
  key: string;
  label: string;
  rating: number | null;
  games: number;
}

/** Fast identity + rating data, shown before the heavy game analysis finishes. */
export interface ReportProfile {
  username: string;
  displayName: string;
  rating: number | null;
  perf: string;
  availablePerfs: PerfSummary[];
  ratingHistory: RatingPoint[];
  trend: Trend;
  ratingDrift: number;
  /** ms epoch of the most recent game — null until the report lands. */
  lastGameAt: number | null;
}

/** The full computed report backing the dashboard for one student. */
export interface StudentReport {
  platform: Platform;
  username: string;
  displayName: string;
  rating: number | null;
  /** Which time-control this report covers (e.g. "blitz"). */
  perf: string;
  /** All time-controls the player has games in, for the selector. */
  availablePerfs: PerfSummary[];
  trend: Trend;
  /** Net rating change over the sampled window. */
  ratingDrift: number;
  ratingHistory: RatingPoint[];

  /** ms epoch of the most recent game, or null. */
  lastGameAt: number | null;
  /** Number of games actually analyzed into this report. */
  gamesAnalyzed: number;
  /** Number of games fetched (some may lack engine analysis). */
  gamesFetched: number;

  /** Overall blended accuracy across all phases (0–100). */
  overallAccuracy: number;
  /** Month-over-month change in tactical accuracy, in points. */
  accuracyDelta: number;
  /** Per-game accuracy over the sampled window, oldest → newest. */
  gamesTimeline: GamePoint[];

  phases: PhaseStrength[];
  recurringErrors: RecurringError[];
  tacticalMotifs: TacticalMotif[];

  /** The most recent analysed game at a glance (null if none analysed). */
  lastGame: LastGameSummary | null;

  /** One-line human summary, e.g. "Currently struggling with Endgames." */
  headline: string;

  /** Non-fatal notes about data quality (e.g. "only 6 of 50 games analyzed"). */
  notes: string[];
}

/** A compact, persisted snapshot of a report for longitudinal comparison. */
export interface ReportSnapshot {
  takenAt: number;
  rating: number | null;
  overallAccuracy: number;
  phaseAccuracy: Record<Phase, number>;
  motifAccuracy: Record<string, number | null>;
  gamesAnalyzed: number;
  lastGameAt: number | null;
}

/** Lightweight roster entry (no full analysis). */
export interface RosterEntry {
  platform: Platform;
  username: string;
  displayName: string;
  initials: string;
  rating: number | null;
  trend: Trend;
}
