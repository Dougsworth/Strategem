import type { Plan } from "./AuthContext";

export interface PlanTier {
  id: Plan;
  name: string;
  price: number; // USD / month
  tagline: string;
  features: string[];
  recommended?: boolean;
}

// Pricing rationale lives in docs/pricing-and-costs.md. The short version: the
// analysis (Stockfish + Lichess) is free to run client-side, and the only real
// variable cost is AI prose (pennies per report) — so AI features anchor the
// paid tiers while costing almost nothing to serve.
export const PLANS: PlanTier[] = [
  {
    id: "free",
    name: "Starter",
    price: 0,
    tagline: "See it work — free",
    features: [
      "1 student",
      "Full game analysis — accuracy, phases, tactics",
      "Fix-your-mistakes trainer on their real games",
      "In-app puzzle trainer",
      "1 scoresheet scan / day",
    ],
  },
  {
    id: "pro",
    name: "Coach",
    price: 19,
    tagline: "Less than half of one lesson",
    recommended: true,
    features: [
      "Up to 8 students",
      "Curriculum — auto training plans per student",
      "Analytics — growth, consistency & mindset signals",
      "Shareable report-card PDFs",
      "Growth tracking over time",
      "8 scoresheet scans / day",
    ],
  },
  {
    id: "team",
    name: "Academy",
    price: 39,
    tagline: "Run your whole studio",
    features: [
      "Up to 30 students",
      "Everything in Coach",
      "Your branding on report cards",
      "20 scoresheet scans / day",
      "Priority email support",
    ],
  },
  {
    id: "club",
    name: "Club",
    price: 99,
    tagline: "For clubs & teams",
    features: [
      "Unlimited students",
      "Multiple coaches on one shared roster",
      "Your branding on report cards",
      "60 scoresheet scans / day",
      "Student groups & tags — coming soon",
      "Priority support",
    ],
  },
];

export const planName = (plan: Plan): string =>
  PLANS.find((p) => p.id === plan)?.name ?? "Starter";
