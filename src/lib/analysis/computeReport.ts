import { Chess } from "chess.js";
import type {
  Evidence,
  LastGameSummary,
  Phase,
  PerfSummary,
  PhaseStrength,
  RecurringError,
  ReportProfile,
  StudentReport,
  TacticalMotif,
  Trend,
  RatingPoint,
} from "../types";
import {
  accuracyFromWinPercents,
  blendAccuracies,
  clamp,
  winPercentFromCp,
} from "./accuracy";
import { classifyPhase } from "../chess/phase";
import { hangingPieces, motifsOfMove, type Motif } from "./motifs";
import {
  fetchGames,
  fetchLastGameAt,
  fetchRatingHistory,
  fetchUser,
  type LichessEvalNode,
  type LichessGame,
} from "../providers/lichess";

const PHASES: Phase[] = ["opening", "middlegame", "endgame"];
const CP_CAP = 1000; // Lichess caps per-move centipawn loss here.

/** Eval node → centipawns from White's POV, with mate mapped to a large cp. */
function nodeCp(node: LichessEvalNode | undefined, fallback = 15): number {
  if (!node) return fallback;
  if (typeof node.eval === "number") return node.eval;
  if (typeof node.mate === "number") return node.mate > 0 ? 10000 : -10000;
  return fallback;
}

interface MotifTally {
  tested: number;
  found: number;
}

const MOTIF_META: Record<
  Motif,
  { key: string; badge: string; title: string; description: string }
> = {
  fork: {
    key: "fork",
    badge: "Fk",
    title: "Forks",
    description: "Attacking two pieces at the same time",
  },
  pinskewer: {
    key: "pinskewer",
    badge: "Pn",
    title: "Pins & Skewers",
    description: "Lining up an enemy piece in front of a better one",
  },
  backrank: {
    key: "backrank",
    badge: "Br",
    title: "Back-rank Mates",
    description: "Checkmating a king stuck on its back row",
  },
  discovered: {
    key: "discovered",
    badge: "DA",
    title: "Discovered Attacks",
    description: "Moving one piece to unleash another behind it",
  },
};

const PHASE_LABEL: Record<Phase, string> = {
  opening: "the opening",
  middlegame: "the middlegame",
  endgame: "the endgame",
};

function studentColorOf(game: LichessGame, username: string): "w" | "b" | null {
  const u = username.toLowerCase();
  if (game.players.white.user?.id?.toLowerCase() === u) return "w";
  if (game.players.black.user?.id?.toLowerCase() === u) return "b";
  return null;
}

/** Everything `buildReport` needs — also the message payload sent to the worker. */
export interface BuildReportArgs {
  username: string;
  displayName: string;
  rating: number | null;
  perf: string;
  availablePerfs: PerfSummary[];
  ratingHistory: RatingPoint[];
  games: LichessGame[];
}

/** Build a full report from already-fetched Lichess data. Pure + testable. */
export function buildReport(args: BuildReportArgs): StudentReport {
  const { username, displayName, rating, perf, availablePerfs, ratingHistory, games } =
    args;

  const analysedGames = games.filter(
    (g) => Array.isArray(g.analysis) && g.analysis.length > 0,
  );

  const motifTally: Record<Motif, MotifTally> = {
    fork: { tested: 0, found: 0 },
    pinskewer: { tested: 0, found: 0 },
    backrank: { tested: 0, found: 0 },
    discovered: { tested: 0, found: 0 },
  };
  const motifMissed: Record<Motif, Evidence[]> = {
    fork: [],
    pinskewer: [],
    backrank: [],
    discovered: [],
  };
  const errorCounts: Record<string, number> = {};
  const errorExamples: Record<string, Evidence[]> = {};
  // Per-game accuracy (Lichess blends accuracy within a game, then we average
  // across games — accuracy does NOT pool across games via a single mean).
  const perGameAccuracy: { date: number; accuracy: number }[] = [];
  // Per-phase, per-game accuracy + a pooled cp-loss accumulator (acpl is a
  // plain mean, so pooling it across games is fine).
  const phaseGameAcc: Record<Phase, { acc: number; moves: number }[]> = {
    opening: [],
    middlegame: [],
    endgame: [],
  };
  const phaseCp: Record<Phase, number[]> = {
    opening: [],
    middlegame: [],
    endgame: [],
  };

  let lastGameAt: number | null = null;
  // The newest analysed game (games come newest-first) — captured from data we
  // already have, so the "last game" card costs zero extra requests.
  let lastGame: LastGameSummary | null = null;

  analysedGames.forEach((game) => {
    const color = studentColorOf(game, username);
    if (!color) return;
    lastGameAt = Math.max(lastGameAt ?? 0, game.lastMoveAt);

    const gameId = game.id;
    const oppName =
      (color === "w" ? game.players.black : game.players.white).user?.name ??
      "opponent";

    const sans = game.moves.trim().split(/\s+/).filter(Boolean);
    const analysis = game.analysis ?? [];
    const chess = new Chess();
    const gameMoveAccs: number[] = [];
    const gamePhaseMoves: Record<Phase, number[]> = {
      opening: [],
      middlegame: [],
      endgame: [],
    };

    for (let ply = 0; ply < sans.length; ply++) {
      const fenBefore = chess.fen();
      const moverColor = ply % 2 === 0 ? "w" : "b";
      const moveNumber = chess.moveNumber();
      const wasInCheck = chess.inCheck();
      // Phase must be read from the pre-move position. Compute it from the live
      // instance (non-mutating) here, only for the student's own moves — this
      // avoids a throwaway `new Chess(fenBefore)` clone on every scored move.
      const phase = moverColor === color ? classifyPhase(chess, moveNumber) : null;

      let move;
      try {
        move = chess.move(sans[ply]);
      } catch {
        break; // desync between moves and engine — bail on this game
      }
      if (!move) break;

      // Only score the student's own moves.
      if (moverColor !== color || phase === null) continue;

      const cpBeforeW = nodeCp(analysis[ply - 1]);
      const cpAfterW = nodeCp(analysis[ply]);
      const sign = color === "w" ? 1 : -1;
      const winBefore = winPercentFromCp(sign * cpBeforeW);
      const winAfter = winPercentFromCp(sign * cpAfterW);
      const accuracy = accuracyFromWinPercents(winBefore, winAfter);
      const cpLoss = clamp(sign * (cpBeforeW - cpAfterW), 0, CP_CAP);

      gameMoveAccs.push(accuracy);
      gamePhaseMoves[phase].push(accuracy);
      phaseCp[phase].push(cpLoss);

      // Tactical motif tally (opportunity = best or actual move shows motif).
      const node = analysis[ply];
      const actualMotifs = motifsOfMove(fenBefore, move.lan);
      const bestMotifs = node?.best
        ? motifsOfMove(fenBefore, node.best)
        : actualMotifs;
      const opportunities = new Set<Motif>([...actualMotifs, ...bestMotifs]);
      for (const m of opportunities) {
        motifTally[m].tested++;
        if (actualMotifs.has(m)) {
          motifTally[m].found++;
        } else if (node?.best && motifMissed[m].length < MAX_EVIDENCE) {
          // Best move was this kind of tactic, student played something else.
          motifMissed[m].push(
            makeEvidence(gameId, ply, fenBefore, color, sanOf(fenBefore, node.best), oppName, node.best),
          );
        }
      }

      // Recurring-error classification on flagged mistakes/blunders. Specific,
      // verifiable buckets (each example is captured for auditing).
      const judged = node?.judgment?.name;
      if (judged === "Mistake" || judged === "Blunder") {
        const after = new Chess(chess.fen());
        let key: string;
        if (hangingPieces(after, color).length > 0) key = "hung";
        else if (wasInCheck && winBefore > 45) key = "panic";
        else if (winBefore >= 70 && winBefore - winAfter >= 15) key = "missedWin";
        else key = "slip";

        errorCounts[key] = (errorCounts[key] ?? 0) + 1;
        const list = (errorExamples[key] ??= []);
        if (list.length < MAX_EVIDENCE) {
          // san = the move they actually played (the mistake); solutionUci =
          // the engine's better move, so it can become a "fix it" drill.
          list.push(makeEvidence(gameId, ply, fenBefore, color, move.san, oppName, node.best));
        }
      }
    }

    if (gameMoveAccs.length === 0) return;
    const gameAccuracy = blendAccuracies(gameMoveAccs);
    perGameAccuracy.push({ date: game.lastMoveAt, accuracy: gameAccuracy });

    // First scorable game in iteration order = the most recent game.
    if (!lastGame) {
      const result: LastGameSummary["result"] = !game.winner
        ? "draw"
        : (game.winner === "white") === (color === "w")
          ? "win"
          : "loss";
      lastGame = {
        gameId,
        url: `https://lichess.org/${gameId}`,
        opponent: oppName,
        color,
        result,
        accuracy: round1(gameAccuracy),
        date: game.lastMoveAt,
        mistakes: [], // filled in after the loop from captured evidence
      };
    }
    for (const phase of PHASES) {
      const accs = gamePhaseMoves[phase];
      if (accs.length > 0) {
        phaseGameAcc[phase].push({
          acc: blendAccuracies(accs),
          moves: accs.length,
        });
      }
    }
  });

  const phases = buildPhases(phaseGameAcc, phaseCp);
  const accuracies = perGameAccuracy.map((g) => g.accuracy);
  const overallAccuracy = mean(accuracies);
  // Month-over-month proxy: most recent third of games vs the rest.
  // perGameAccuracy is in API order (newest first).
  const cut = Math.max(1, Math.floor(accuracies.length / 3));
  const recent = mean(accuracies.slice(0, cut));
  const older = mean(accuracies.slice(cut));
  const accuracyDelta = accuracies.length >= 4 ? round1(recent - older) : 0;
  // Real growth curve: per-game accuracy ordered oldest → newest.
  const gamesTimeline = [...perGameAccuracy]
    .sort((a, b) => a.date - b.date)
    .map((g) => ({ date: g.date, accuracy: round1(g.accuracy) }));

  const tacticalMotifs = buildMotifs(motifTally, motifMissed);
  const recurringErrors = buildErrors(errorCounts, errorExamples);

  // Attach the most recent game's own mistakes (from the evidence we captured).
  if (lastGame) {
    const id = (lastGame as LastGameSummary).gameId;
    const seen = new Set<number>();
    const mistakes: Evidence[] = [];
    for (const list of Object.values(errorExamples)) {
      for (const ev of list) {
        if (ev.gameId === id && !seen.has(ev.ply)) {
          seen.add(ev.ply);
          mistakes.push(ev);
        }
      }
    }
    mistakes.sort((a, b) => a.ply - b.ply);
    (lastGame as LastGameSummary).mistakes = mistakes;
  }
  const { drift, history } = ratingDrift(ratingHistory);
  const trend = trendFrom(drift, history.length);
  const headline = buildHeadline(phases, recurringErrors, accuracyDelta);
  const notes = buildNotes(games.length, analysedGames.length);

  return {
    platform: "lichess",
    username,
    displayName,
    rating,
    perf,
    availablePerfs,
    trend,
    ratingDrift: drift,
    ratingHistory: history,
    lastGameAt,
    gamesAnalyzed: analysedGames.length,
    gamesFetched: games.length,
    overallAccuracy: round1(overallAccuracy),
    accuracyDelta,
    gamesTimeline,
    phases,
    recurringErrors,
    tacticalMotifs,
    lastGame,
    headline,
    notes,
  };
}

function buildPhases(
  phaseGameAcc: Record<Phase, { acc: number; moves: number }[]>,
  phaseCp: Record<Phase, number[]>,
): PhaseStrength[] {
  return PHASES.map((phase) => {
    const games = phaseGameAcc[phase];
    const totalMoves = games.reduce((s, g) => s + g.moves, 0);
    // Move-weighted average of per-game phase accuracy.
    const accuracy =
      totalMoves > 0
        ? games.reduce((s, g) => s + g.acc * g.moves, 0) / totalMoves
        : 0;
    const cps = phaseCp[phase];
    const acpl = cps.length ? cps.reduce((s, c) => s + c, 0) / cps.length : 0;
    return {
      phase,
      accuracy: round1(accuracy),
      acpl: Math.round(acpl),
      moves: cps.length,
    };
  });
}

function buildMotifs(
  tally: Record<Motif, MotifTally>,
  missed: Record<Motif, Evidence[]>,
): TacticalMotif[] {
  return (Object.keys(MOTIF_META) as Motif[]).map((m) => {
    const t = tally[m];
    const meta = MOTIF_META[m];
    return {
      ...meta,
      accuracy: t.tested > 0 ? round1((t.found / t.tested) * 100) : null,
      sample: t.tested,
      reliable: t.tested >= MIN_MOTIF_SAMPLE,
      missed: missed[m],
    };
  });
}

const ERROR_META: Record<string, { title: string; description: string }> = {
  hung: {
    title: "Dropping pieces",
    description: "Left a piece where it could be taken for nothing.",
  },
  missedWin: {
    title: "Letting wins slip",
    description: "Had a winning position but didn’t convert it.",
  },
  panic: {
    title: "Panicking in check",
    description: "Over-reacts to checks that aren’t actually dangerous.",
  },
  slip: {
    title: "Tactical slips",
    description: "Missed the strongest move in a sharp position.",
  },
};

function buildErrors(
  counts: Record<string, number>,
  examples: Record<string, Evidence[]>,
): RecurringError[] {
  return Object.entries(counts)
    .filter(([, count]) => count > 0)
    .map(([key, count]) => ({
      key,
      count,
      ...ERROR_META[key],
      examples: examples[key] ?? [],
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);
}

export function ratingDrift(history: RatingPoint[]): {
  drift: number;
  history: RatingPoint[];
} {
  // Use the tail of the history (recent form) for the sparkline.
  const tail = history.slice(-20);
  if (tail.length < 2) return { drift: 0, history: tail };
  return { drift: tail[tail.length - 1].rating - tail[0].rating, history: tail };
}

export function trendFrom(drift: number, points: number): Trend {
  if (drift >= 20) return "rising";
  if (drift <= -20) return "declining";
  if (points >= 8 && Math.abs(drift) <= 10) return "plateau";
  return "steady";
}

function buildHeadline(
  phases: PhaseStrength[],
  errors: RecurringError[],
  accuracyDelta: number,
): string {
  const ranked = [...phases]
    .filter((p) => p.moves >= 3)
    .sort((a, b) => a.accuracy - b.accuracy);
  const weakest = ranked[0];
  const weakPart = weakest
    ? `Biggest thing to work on: ${PHASE_LABEL[weakest.phase]}`
    : "Still building a picture from recent games";
  const errorPart =
    errors[0] && weakest ? `, and ${errors[0].title.toLowerCase()}` : "";
  const dir =
    accuracyDelta < -0.5
      ? `slipping a little (${Math.abs(accuracyDelta)}% lower)`
      : accuracyDelta > 0.5
        ? `improving (${accuracyDelta}% higher)`
        : "holding steady";
  return `${weakPart}${errorPart}. Lately their play is ${dir}.`;
}

function buildNotes(fetched: number, analysed: number): string[] {
  const notes: string[] = [];
  notes.push(`Based on ${analysed} engine-analyzed game${analysed === 1 ? "" : "s"}.`);
  if (analysed < fetched) {
    notes.push(
      `${fetched - analysed} of ${fetched} fetched games lacked Lichess analysis and were skipped.`,
    );
  }
  if (analysed < 8) {
    notes.push("Small sample — numbers will firm up with more analyzed games.");
  }
  return notes;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0;
}

/** Cap on stored example positions per finding, and min sample to trust a motif %. */
const MAX_EVIDENCE = 8;
const MIN_MOTIF_SAMPLE = 6;

/** SAN of a UCI move from a position (falls back to the UCI string). */
function sanOf(fen: string, uci: string): string {
  try {
    const c = new Chess(fen);
    const m = c.move({
      from: uci.slice(0, 2),
      to: uci.slice(2, 4),
      promotion: uci.slice(4) || undefined,
    });
    return m?.san ?? uci;
  } catch {
    return uci;
  }
}

function makeEvidence(
  gameId: string,
  ply: number,
  fen: string,
  turn: "w" | "b",
  san: string,
  oppName: string,
  solutionUci?: string,
): Evidence {
  return {
    gameId,
    ply,
    fen,
    turn,
    san,
    solutionUci,
    url: `https://lichess.org/${gameId}#${ply + 1}`,
    label: `vs ${oppName} · move ${Math.floor(ply / 2) + 1}`,
  };
}

const PERF_ORDER: { key: string; label: string }[] = [
  { key: "bullet", label: "Bullet" },
  { key: "blitz", label: "Blitz" },
  { key: "rapid", label: "Rapid" },
  { key: "classical", label: "Classical" },
];

/** Default game sample for the live app (smaller than validation for speed). */
export const APP_MAX_GAMES = 40;

/** What `resolveProfile` returns: instant header data + the base for buildReport. */
export interface ResolvedProfile {
  /** UI-facing identity + rating trend, available before games are analyzed. */
  profile: ReportProfile;
  /** buildReport args minus `games` — combine with fetched games to analyze. */
  buildBase: Omit<BuildReportArgs, "games">;
  perf: string;
}

/**
 * Fast first stage: fetch the user + rating history (no games), so the dashboard
 * can show name, rating, trend, the perf selector, and the rating sparkline
 * immediately while the heavy game analysis runs separately.
 */
export async function resolveProfile(
  username: string,
  opts: { perf?: string } = {},
): Promise<ResolvedProfile> {
  const user = await fetchUser(username);

  const availablePerfs: PerfSummary[] = PERF_ORDER.map(({ key, label }) => ({
    key,
    label,
    rating: user.perfs?.[key]?.rating ?? null,
    games: user.perfs?.[key]?.games ?? 0,
  })).filter((p) => p.games > 0);

  const sortedByGames = [...availablePerfs].sort((a, b) => b.games - a.games);
  const perf =
    (opts.perf && availablePerfs.some((p) => p.key === opts.perf)
      ? opts.perf
      : sortedByGames[0]?.key) ?? "blitz";
  const perfLabel = PERF_ORDER.find((p) => p.key === perf)?.label ?? "Blitz";

  const [fullHistory, lastGameAt] = await Promise.all([
    fetchRatingHistory(username, perfLabel),
    fetchLastGameAt(username, perf),
  ]);
  const { drift, history } = ratingDrift(fullHistory);
  const trend = trendFrom(drift, history.length);

  const displayName =
    [user.profile?.firstName, user.profile?.lastName].filter(Boolean).join(" ") ||
    user.username;
  const rating = user.perfs?.[perf]?.rating ?? null;

  return {
    perf,
    profile: {
      username: user.username,
      displayName,
      rating,
      perf,
      availablePerfs,
      ratingHistory: history, // tail, matches what buildReport exposes
      trend,
      ratingDrift: drift,
      lastGameAt, // true last game (any game), so it's accurate immediately
    },
    buildBase: {
      username: user.username,
      displayName,
      rating,
      perf,
      availablePerfs,
      ratingHistory: fullHistory,
    },
  };
}

/** Second stage: fetch the analyzed games for a resolved perf. */
export async function fetchReportGames(
  username: string,
  perf: string,
  max = APP_MAX_GAMES,
) {
  return fetchGames(username, { max, onlyAnalysed: true, perfType: perf });
}

/**
 * Fetch + build a report synchronously (worker-free path; used by the Node
 * validation script). For the live app the context stages resolveProfile +
 * fetchReportGames + the worker instead.
 */
export async function fetchLichessReport(
  username: string,
  opts: { max?: number; perf?: string } = {},
): Promise<StudentReport> {
  const { buildBase, perf } = await resolveProfile(username, { perf: opts.perf });
  const games = await fetchReportGames(username, perf, opts.max ?? APP_MAX_GAMES);
  return buildReport({ ...buildBase, games });
}
