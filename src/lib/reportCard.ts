import type { StudentReport } from "./types";
import { PHASE_LABEL } from "./format";
import { recommendPuzzles, type PuzzleRec } from "./puzzles";
import type { Delta } from "./snapshots";

// Builds the content for a printable report card. The NUMBERS are deterministic
// and exact. Only `narrative` is a candidate for AI generation — `generateNarrative`
// is the single seam to swap a rules-based summary for a Claude-written one later
// (feed it this same structured data; never let the model invent figures).

export interface SkillLine {
  label: string;
  accuracy: number;
  detail: string;
}

export interface ReportCardData {
  strengths: SkillLine[];
  weaknesses: SkillLine[];
  focus: PuzzleRec[];
  narrative: string;
}

/** Flatten phases + motifs into one ranked list of skills. */
function skillLines(report: StudentReport): SkillLine[] {
  const lines: SkillLine[] = [];
  for (const p of report.phases) {
    if (p.moves >= 3)
      lines.push({
        label: PHASE_LABEL[p.phase],
        accuracy: p.accuracy,
        detail: `Plays ${Math.round(p.accuracy)}% good moves here`,
      });
  }
  for (const m of report.tacticalMotifs) {
    if (m.accuracy !== null && m.sample >= 3)
      lines.push({
        label: m.title,
        accuracy: m.accuracy,
        detail: `Spotted ${Math.round(m.accuracy)}% of ${m.sample} chances`,
      });
  }
  return lines.sort((a, b) => b.accuracy - a.accuracy);
}

function fmtChange(change: number | null, unit = ""): string | null {
  if (change === null || Math.abs(change) < 0.5) return null;
  const sign = change > 0 ? "up" : "down";
  return `${sign} ${Math.abs(change)}${unit}`;
}

/**
 * Rules-based narrative. Deterministic, offline, coach-voiced.
 * Swap this body for a Claude call later — keep the same (report, deltas) input.
 */
export function generateNarrative(
  report: StudentReport,
  ranked: SkillLine[],
  ratingDelta?: Delta | null,
): string {
  const name = report.displayName.split(/\s+/)[0];
  const top = ranked[0];
  const weak = ranked[ranked.length - 1];
  const sentences: string[] = [];

  sentences.push(
    `${name} is around ${report.rating ?? "—"} rating and finds a good move about ${report.overallAccuracy}% of the time across ${report.gamesAnalyzed} recent games.`,
  );
  if (top && weak && top.label !== weak.label) {
    sentences.push(
      `They’re strongest at ${top.label.toLowerCase()} (${Math.round(top.accuracy)}%); the biggest thing to work on is ${weak.label.toLowerCase()} (${Math.round(weak.accuracy)}%).`,
    );
  }
  if (report.recurringErrors[0]) {
    const e = report.recurringErrors[0];
    sentences.push(
      `Their most common mistake is ${e.title.toLowerCase()} (${e.count} times) — ${e.description.toLowerCase()}`,
    );
  }
  const ratingMove = ratingDelta ? fmtChange(ratingDelta.change) : null;
  const accMove = fmtChange(report.accuracyDelta, "%");
  if (ratingMove || accMove) {
    const parts = [
      ratingMove && `rating is ${ratingMove}`,
      accMove && `accuracy is ${accMove}`,
    ].filter(Boolean);
    sentences.push(`Since last time, ${parts.join(" and ")}.`);
  } else if (report.accuracyDelta) {
    sentences.push(
      `Lately their accuracy is ${report.accuracyDelta > 0 ? "up" : "down"} ${Math.abs(report.accuracyDelta)}% versus earlier games.`,
    );
  }
  sentences.push(
    `Plan: practice the puzzles below at their level and check back in two weeks.`,
  );
  return sentences.join(" ");
}

export function buildReportCard(
  report: StudentReport,
  ratingDelta?: Delta | null,
): ReportCardData {
  const ranked = skillLines(report);
  return {
    strengths: ranked.slice(0, 2),
    weaknesses: ranked.slice(-2).reverse(),
    focus: recommendPuzzles(report),
    narrative: generateNarrative(report, ranked, ratingDelta),
  };
}
