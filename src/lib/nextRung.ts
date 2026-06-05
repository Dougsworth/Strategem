import type { Phase, StudentReport, Trend } from "./types";
import { focusAreas, type FocusArea } from "./coachInsights";

// "Your next rung" — the adaptive ladder. The methodology is built to a high
// (GM-grade) bar: find the few things actually costing rating and push them,
// with NO skill cap — there's always a next rung. But the surface goal is the
// player's: it just shows where you are and the next step up, indefinitely.
// Reuses the existing weakness detection (focusAreas) + report signals.

export interface Skill {
  key: string;
  name: string;
  level: number; // 0–100
}

export interface Rung {
  title: string;
  metric: string;
  why: string;
  drills: string[];
  cta?: "mistakes" | "puzzles";
}

export interface NextRung {
  rung: Rung;
  skills: Skill[];
  /** Which skill the rung targets, for highlighting the ladder. */
  focusKey: string | null;
  rating: number | null;
  trend: Trend;
  accuracyDelta: number;
  overallAccuracy: number;
}

const clamp = (n: number): number => Math.max(0, Math.min(100, Math.round(n)));
const avg = (xs: number[]): number => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

// A skill profile across the dimensions the report can actually measure. Levels
// are 0–100 (higher = stronger). Phase skills only appear with enough moves.
function computeSkills(report: StudentReport): Skill[] {
  const phaseAcc = (p: Phase) =>
    report.phases.find((x) => x.phase === p && x.moves >= 5)?.accuracy ?? null;

  const reliable = report.tacticalMotifs
    .filter((m) => m.reliable && m.accuracy != null)
    .map((m) => m.accuracy as number);
  const tactics = reliable.length ? avg(reliable) : report.overallAccuracy;

  const hung = report.recurringErrors.find((e) =>
    /hang|drop|hung|blunder|piece/i.test(`${e.key} ${e.title}`),
  );
  const vision = report.overallAccuracy - (hung ? Math.min(hung.count * 4, 22) : 0);

  const skills: Skill[] = [
    { key: "vision", name: "Blunder control", level: clamp(vision) },
    { key: "tactics", name: "Tactics", level: clamp(tactics) },
  ];
  const op = phaseAcc("opening");
  if (op != null) skills.push({ key: "opening", name: "Opening", level: clamp(op) });
  const mg = phaseAcc("middlegame");
  if (mg != null) skills.push({ key: "middlegame", name: "Middlegame", level: clamp(mg) });
  const eg = phaseAcc("endgame");
  if (eg != null) skills.push({ key: "endgame", name: "Endgame", level: clamp(eg) });
  return skills;
}

function focusKeyOf(area: FocusArea): string | null {
  const t = `${area.tag} ${area.title}`.toLowerCase();
  if (t.includes("opening")) return "opening";
  if (t.includes("middlegame")) return "middlegame";
  if (t.includes("endgame")) return "endgame";
  if (t.includes("tactic")) return "tactics";
  if (/hang|drop|piece|blunder/.test(t)) return "vision";
  return null;
}

export function computeNextRung(report: StudentReport): NextRung {
  const skills = computeSkills(report);
  const areas = focusAreas(report);

  let rung: Rung;
  let focusKey: string | null;
  if (areas.length) {
    // The app's existing prioritised weakness IS the rung — with its drills.
    const a = areas[0];
    rung = { title: a.title, metric: a.metric, why: a.why, drills: a.drills, cta: a.cta };
    focusKey = focusKeyOf(a);
  } else {
    // No glaring weakness (a strong player): push the lowest skill — never caps.
    const weakest = [...skills].sort((x, y) => x.level - y.level)[0] ?? null;
    focusKey = weakest?.key ?? null;
    rung = {
      title: weakest ? `Sharpen ${weakest.name.toLowerCase()}` : "Keep your edge",
      metric: weakest ? `${weakest.level}%` : "",
      why: "No glaring weakness right now — your lowest skill is where the next gains hide. Keep sharpening it.",
      drills: ["Mixed tactics at your level, daily", "Review every loss for the turning point"],
      cta: "puzzles",
    };
  }

  return {
    rung,
    skills,
    focusKey,
    rating: report.rating,
    trend: report.trend,
    accuracyDelta: report.accuracyDelta,
    overallAccuracy: report.overallAccuracy,
  };
}
