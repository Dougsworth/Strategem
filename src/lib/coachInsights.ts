import type { Phase, StudentReport } from "./types";

// Turns a computed StudentReport into the things a coach actually acts on:
// a prioritized training plan, a weekly routine, and "mindset signals" that
// translate recurring mistakes into the psychology behind them.
//
// Grounded in how strong coaches work: focus on decision-making and recurring
// patterns (not single moves), build a study plan around the biggest weakness,
// and treat consistency / tilt / time-pressure as trainable skills.

const PHASE_LABEL: Record<Phase, string> = {
  opening: "Opening",
  middlegame: "Middlegame",
  endgame: "Endgame",
};

const PHASE_DRILLS: Record<Phase, string[]> = {
  opening: [
    "Pick a 2–3 line repertoire for White and Black and play only those for two weeks.",
    "After each game, find the first move you left book — learn the right one before the next game.",
    "Know the *plan* behind your openings, not just the moves (where do the pieces belong?).",
  ],
  middlegame: [
    "Before every move, say the opponent’s main threat first — then choose your move.",
    "Study 3 annotated middlegames a week in your own openings; note the recurring plans.",
    "Solve “find the plan” positions, not just tactics — train evaluation, not only calculation.",
  ],
  endgame: [
    "Drill the essentials cold: K+P vs K, Lucena, Philidor, rook-behind-the-passer.",
    "Play won and lost endings out against the engine to build real conversion technique.",
    "Slow down at the start of the endgame — that’s where most of the rating is won or lost.",
  ],
};

export interface FocusArea {
  tag: string; // "Weakest phase" / "Most frequent mistake" / "Tactics gap"
  title: string;
  metric: string; // "71% accuracy" / "107×"
  why: string;
  drills: string[];
  /** A practice surface this links to, if any. */
  cta?: "mistakes" | "puzzles";
}

export interface MindsetSignal {
  signal: string;
  meaning: string;
  habit: string;
  count: number;
}

interface MindsetDef {
  signal: string;
  meaning: string;
  habit: string;
}

// Keyed by the recurring-error taxonomy from computeReport (hung/slip/missedWin/panic).
const MINDSET: Record<string, MindsetDef> = {
  hung: {
    signal: "Pieces left hanging",
    meaning:
      "Board-vision lapses — usually rushing, or tunnel-vision on your own plan while the opponent’s threat sits in plain sight.",
    habit:
      "Blunder-check every move: scan all checks, captures, and undefended pieces — both sides — before you commit.",
  },
  slip: {
    signal: "Tactical slips in sharp positions",
    meaning:
      "Calculation stops half a move too early exactly when the position gets tense and concrete.",
    habit:
      "In sharp spots, force one more half-move: after your candidate, ask “what’s their best reply?” and only then decide.",
  },
  missedWin: {
    signal: "Won games slipping away",
    meaning:
      "Over-caution or relaxation when ahead — the classic ‘how to not lose a winning position’ problem.",
    habit:
      "When clearly winning, switch modes: simplify, kill counterplay, and re-check for tricks every single move.",
  },
  panic: {
    signal: "Errors under time pressure",
    meaning:
      "Decision quality falls off as the clock drops — a focus and emotional-control issue more than a chess one.",
    habit:
      "Budget the clock: spend your thinking time early where you’re less sure, and never let yourself sink to seconds in a normal position.",
  },
};

function mindsetFor(key: string, title: string): MindsetDef {
  if (MINDSET[key]) return MINDSET[key];
  // Fallback by matching the human title to a known pattern.
  const t = title.toLowerCase();
  if (t.includes("hang") || t.includes("drop")) return MINDSET.hung;
  if (t.includes("win") || t.includes("convert")) return MINDSET.missedWin;
  if (t.includes("time") || t.includes("panic")) return MINDSET.panic;
  return MINDSET.slip;
}

/** Prioritized 2–4 focus areas: weakest phase, top recurring error, weakest tactic. */
export function focusAreas(report: StudentReport): FocusArea[] {
  const areas: FocusArea[] = [];

  const played = report.phases.filter((p) => p.moves >= 5);
  const weakestPhase = [...played].sort((a, b) => a.accuracy - b.accuracy)[0];
  if (weakestPhase) {
    areas.push({
      tag: "Weakest phase",
      title: `${PHASE_LABEL[weakestPhase.phase]} play`,
      metric: `${Math.round(weakestPhase.accuracy)}% accuracy`,
      why: `Their ${PHASE_LABEL[weakestPhase.phase].toLowerCase()} is the lowest-scoring part of their game — the fastest rating to unlock.`,
      drills: PHASE_DRILLS[weakestPhase.phase],
    });
  }

  const topError = report.recurringErrors[0];
  if (topError) {
    const m = mindsetFor(topError.key, topError.title);
    areas.push({
      tag: "Most frequent mistake",
      title: topError.title,
      metric: `${topError.count}×`,
      why: m.meaning,
      drills: [
        m.habit,
        "Re-solve these exact positions in the mistake drills until the pattern is automatic.",
      ],
      cta: "mistakes",
    });
  }

  const reliableMotifs = report.tacticalMotifs.filter(
    (t) => t.reliable && t.accuracy != null,
  );
  const weakestMotif = [...reliableMotifs].sort(
    (a, b) => (a.accuracy ?? 100) - (b.accuracy ?? 100),
  )[0];
  if (weakestMotif && (weakestMotif.accuracy ?? 100) < 80) {
    areas.push({
      tag: "Tactics gap",
      title: weakestMotif.title,
      metric: `${weakestMotif.accuracy}% spotted`,
      why: `They miss ${weakestMotif.title.toLowerCase()} more often than other patterns — a targeted puzzle set fixes this fast.`,
      drills: [
        `Do a focused ${weakestMotif.title.toLowerCase()} puzzle set 3× this week.`,
        "Quality over speed: fully calculate each before moving.",
      ],
      cta: "puzzles",
    });
  }

  return areas;
}

/** Recurring mistakes translated into the mental pattern behind them. */
export function mindsetSignals(report: StudentReport): MindsetSignal[] {
  return report.recurringErrors.slice(0, 3).map((e) => {
    const m = mindsetFor(e.key, e.title);
    return { ...m, count: e.count };
  });
}

export interface Consistency {
  stdev: number;
  label: string;
  blurb: string;
}

/** Steadiness of play, from the spread of per-game accuracy — a proxy for focus & tilt. */
export function consistency(report: StudentReport): Consistency | null {
  const xs = report.gamesTimeline.map((g) => g.accuracy).filter((n) => n > 0);
  if (xs.length < 4) return null;
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  const variance = xs.reduce((a, b) => a + (b - mean) ** 2, 0) / xs.length;
  const stdev = Math.sqrt(variance);

  if (stdev < 8) {
    return {
      stdev,
      label: "Rock-steady",
      blurb:
        "Their level barely wavers game to game — a strong sign of focus and emotional control. Push the ceiling with harder material.",
    };
  }
  if (stdev < 14) {
    return {
      stdev,
      label: "Fairly steady",
      blurb:
        "Mostly consistent, with the occasional off game. A pre-game routine (a few easy puzzles to warm up) will tighten the floor.",
    };
  }
  return {
    stdev,
    label: "Streaky",
    blurb:
      "Big swings between their best and worst games — often tilt or focus dropping after a setback. Train the reset: short break + breathing after a bad game, and stop sessions after two losses in a row.",
  };
}

/** A concrete weekly routine, lightly tailored to the biggest weakness. */
export function weeklyRoutine(report: StudentReport): string[] {
  const weakestPhase = [...report.phases]
    .filter((p) => p.moves >= 5)
    .sort((a, b) => a.accuracy - b.accuracy)[0];
  const motif = report.tacticalMotifs.find((t) => t.reliable && t.accuracy != null);

  const routine = [
    `Tactics: 3 short sets a week${motif ? ` (lean on ${motif.title.toLowerCase()})` : ""} — accuracy first, speed later.`,
    "Review 1 of your own games deeply per week: pause before each mistake and guess the move before checking.",
  ];
  if (weakestPhase) {
    routine.push(
      `${PHASE_LABEL[weakestPhase.phase]} focus: one ${PHASE_LABEL[weakestPhase.phase].toLowerCase()} study session a week.`,
    );
  }
  routine.push(
    "Mindset: a 2-minute warm-up before rated games, and a hard stop after two losses in a row.",
  );
  return routine;
}
