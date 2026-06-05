import type { Plan } from "./AuthContext";

// Single source of truth for what each plan unlocks. The UI reads this to gate
// features, and the roster enforces the student cap — so "locked behind a plan"
// is real logic, not just a label on the pricing page.

export interface Entitlements {
  /** Max students on the roster. Infinity = unlimited. */
  maxStudents: number;
  /** Analytics deep-dive tab (growth, consistency, mindset signals). */
  analytics: boolean;
  /** Curriculum tab — personalized training plans. */
  curriculum: boolean;
  /** Export / print report-card PDFs. */
  reportCardExport: boolean;
  /** Growth tracking over time ("since last review" deltas). */
  growthHistory: boolean;
  /** AI-written, game-specific report-card summaries (Claude). */
  aiNarrative: boolean;
  /** Your branding on report cards. */
  branding: boolean;
  /** Multiple coaches on one shared roster. */
  multiCoach: boolean;
  /** Scoresheet photo scans per day (each one calls the paid Claude endpoint). */
  scanPerDay: number;
}

const TABLE: Record<Plan, Entitlements> = {
  free: {
    maxStudents: 1,
    analytics: false,
    curriculum: false,
    reportCardExport: false,
    growthHistory: false,
    aiNarrative: false,
    branding: false,
    multiCoach: false,
    scanPerDay: 1,
  },
  pro: {
    maxStudents: 8,
    analytics: true,
    curriculum: true,
    reportCardExport: true,
    growthHistory: true,
    aiNarrative: true,
    branding: false,
    multiCoach: false,
    scanPerDay: 8,
  },
  team: {
    maxStudents: 30,
    analytics: true,
    curriculum: true,
    reportCardExport: true,
    growthHistory: true,
    aiNarrative: true,
    branding: true,
    multiCoach: false,
    scanPerDay: 20,
  },
  club: {
    maxStudents: Infinity,
    analytics: true,
    curriculum: true,
    reportCardExport: true,
    growthHistory: true,
    aiNarrative: true,
    branding: true,
    multiCoach: true,
    scanPerDay: 60,
  },
};

export function entitlements(plan: Plan | undefined): Entitlements {
  return TABLE[plan ?? "free"] ?? TABLE.free;
}

/** Whether a coach on `plan` can add another student given how many they have. */
export function canAddStudent(plan: Plan | undefined, current: number): boolean {
  return current < entitlements(plan).maxStudents;
}

/** Human label for the cap, e.g. "5" or "Unlimited". */
export function studentCapLabel(plan: Plan | undefined): string {
  const max = entitlements(plan).maxStudents;
  return max === Infinity ? "Unlimited" : String(max);
}
