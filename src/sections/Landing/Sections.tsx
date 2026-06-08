import { useState } from "react";
import {
  Crosshair,
  RefreshCw,
  ScanLine,
  FileText,
  TrendingUp,
  Gamepad2,
  UserPlus,
  Cpu,
  ClipboardCheck,
  Check,
  Plus,
  Minus,
  ArrowRight,
} from "lucide-react";
import { PLANS } from "@/lib/plans";
import { Reveal } from "./Reveal";
import { Eyebrow } from "./ui";

/* ── Integrations strip ───────────────────────────────────────────────────── */
export const Logos = () => (
  <section className="border-y border-line bg-card/40">
    <div className="mx-auto flex max-w-screen-xl flex-col items-center gap-4 px-5 py-8 md:flex-row md:justify-between md:px-8">
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
        Built on real engine analysis
      </p>
      <div className="flex items-center gap-8 font-display text-lg font-semibold text-ink/70">
        <span className="transition-colors hover:text-ink">Lichess</span>
        <span className="h-4 w-px bg-line" />
        <span className="transition-colors hover:text-ink">Chess.com</span>
        <span className="h-4 w-px bg-line" />
        <span className="transition-colors hover:text-ink">Stockfish</span>
      </div>
    </div>
  </section>
);

/* ── Features ──────────────────────────────────────────────────────────────── */
const FEATURES = [
  {
    icon: Crosshair,
    title: "Grandmaster-grade game analysis",
    body: "Every move from your students' real online games, scored by Stockfish and translated into coach-ready notes — themes, missed plans, critical moments.",
  },
  {
    icon: RefreshCw,
    title: "Fix-your-mistakes trainer",
    body: "Re-solve the exact positions they got wrong, scheduled to resurface right before they'd forget. FSRS spaced repetition, built for chess.",
  },
  {
    icon: ScanLine,
    title: "Scan a paper scoresheet",
    body: "Snap a photo of a handwritten scoresheet — get the full digital game back, ready for analysis. Tournament games, finally usable.",
  },
  {
    icon: FileText,
    title: "AI report cards",
    body: "Game-specific written summaries in seconds, in plain language. Send them home with parents. Drop them straight into your lesson plan.",
  },
  {
    icon: TrendingUp,
    title: "Growth tracking",
    body: "Prove progress over weeks. Accuracy trends, rating curves, themes resolved — the receipts that keep students (and parents) bought in.",
  },
  {
    icon: Gamepad2,
    title: "The Lab",
    body: "Knight's tour, mazes, vision drills — chess brain-games that keep younger students engaged between serious training blocks.",
  },
];

export const Features = () => (
  <section id="features" className="mx-auto max-w-screen-xl px-5 py-24 md:px-8 md:py-32">
    <Reveal className="max-w-2xl">
      <Eyebrow n="§ 01" label="What's inside" />
      <h2 className="mt-5 font-display text-[1.9rem] font-bold tracking-[-0.02em] md:text-[2.75rem]">
        Every tool a coach actually opens on a Tuesday night.
      </h2>
      <p className="mt-4 text-muted">
        Not a giant feature graveyard. Six things, sharpened around the loop of
        analyze, assign, retest.
      </p>
    </Reveal>

    <div className="mt-14 grid overflow-hidden rounded-3xl border border-line bg-line md:grid-cols-3" style={{ gap: "1px" }}>
      {FEATURES.map((f, i) => (
        <Reveal
          key={f.title}
          delay={(i % 3) * 80}
          className="group bg-card p-7 transition-colors hover:bg-ink-soft/40"
        >
          <div className="flex items-center justify-between">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-accent-soft text-accent transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:scale-105">
              <f.icon size={20} />
            </span>
            <span className="font-mono text-[11px] text-muted/70">
              {String(i + 1).padStart(2, "0")}
            </span>
          </div>
          <h3 className="mt-5 font-display text-lg font-bold tracking-tight">
            {f.title}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-muted">{f.body}</p>
        </Reveal>
      ))}
    </div>
  </section>
);

/* ── How it works ─────────────────────────────────────────────────────────── */
const STEPS = [
  {
    icon: UserPlus,
    title: "Add a student by username",
    body: "Just their Lichess or Chess.com handle. No account needed on the student's side.",
  },
  {
    icon: Cpu,
    title: "Strategem analyzes their games",
    body: "We pull recent games, run engine analysis, and surface patterns across the whole batch.",
  },
  {
    icon: ClipboardCheck,
    title: "Get weaknesses, drills & a report card",
    body: "You walk into the next lesson knowing exactly what to teach. They walk out with drills.",
  },
];

export const HowItWorks = () => (
  <section id="how" className="border-t border-line bg-card/40">
    <div className="mx-auto max-w-screen-xl px-5 py-24 md:px-8 md:py-32">
      <Reveal className="max-w-2xl">
        <Eyebrow n="§ 02" label="How it works" />
        <h2 className="mt-5 font-display text-[1.9rem] font-bold tracking-[-0.02em] md:text-[2.75rem]">
          From username to lesson plan in under two minutes.
        </h2>
      </Reveal>

      <div className="relative mt-14 grid gap-8 md:grid-cols-3">
        {/* connecting line */}
        <div className="pointer-events-none absolute left-0 right-0 top-[26px] hidden h-px bg-line md:block" />
        {STEPS.map((s, i) => (
          <Reveal key={s.title} delay={i * 110} className="relative">
            <div className="flex items-center gap-4">
              <span className="relative z-10 grid h-[52px] w-[52px] shrink-0 place-items-center rounded-2xl border border-line bg-card text-accent shadow-sm">
                <s.icon size={22} />
              </span>
              <span className="font-mono text-sm text-muted/70">
                0{i + 1}
              </span>
            </div>
            <h3 className="mt-5 font-display text-lg font-bold tracking-tight">
              {s.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{s.body}</p>
          </Reveal>
        ))}
      </div>
    </div>
  </section>
);

/* ── Pricing (sourced from the app's real plans) ──────────────────────────── */
const TAGLINE: Record<string, string> = {
  free: "Try the whole loop on one student.",
  pro: "For independent coaches running a real roster.",
  team: "Small academies that need their own brand on it.",
  club: "Clubs with multiple coaches on one roster.",
};

export const Pricing = () => (
  <section id="pricing" className="mx-auto max-w-screen-xl px-5 py-24 md:px-8 md:py-32">
    <Reveal className="max-w-2xl">
      <Eyebrow n="§ 03" label="Pricing" />
      <h2 className="mt-5 font-display text-[1.9rem] font-bold tracking-[-0.02em] md:text-[2.75rem]">
        One student free. Scale when your roster scales.
      </h2>
      <p className="mt-4 text-muted">
        Monthly. Cancel anytime. No per-student surprise fees.
      </p>
    </Reveal>

    <div className="mt-14 grid gap-5 md:grid-cols-4">
      {PLANS.map((plan, i) => {
        const featured = plan.recommended;
        const cta =
          plan.id === "club"
            ? "Talk to us"
            : plan.price === 0
              ? "Start free"
              : "Start free trial";
        return (
          <Reveal
            key={plan.id}
            delay={i * 70}
            className={`relative flex flex-col rounded-3xl p-7 transition-transform duration-200 hover:-translate-y-1 ${
              featured
                ? "bg-ink text-paper shadow-[0_30px_60px_-20px_rgba(20,18,15,0.45)]"
                : "border border-line bg-card"
            }`}
          >
            {featured && (
              <span className="absolute -top-3 left-7 inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-paper">
                <span className="h-1 w-1 rounded-full bg-paper" />
                Most popular
              </span>
            )}
            <div className="flex items-center justify-between">
              <span className="font-display text-[15px] font-semibold">
                {plan.name}
              </span>
              <span
                className={`font-mono text-[10px] ${featured ? "text-paper/40" : "text-muted/60"}`}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
            </div>
            <div className="mt-4 flex items-baseline gap-1.5">
              <span className="font-display text-4xl font-bold tracking-tight tabular-nums">
                ${plan.price}
              </span>
              <span
                className={`text-[13px] ${featured ? "text-paper/60" : "text-muted"}`}
              >
                /mo
              </span>
            </div>
            <p
              className={`mt-2 text-[13px] leading-relaxed ${featured ? "text-paper/70" : "text-muted"}`}
            >
              {TAGLINE[plan.id]}
            </p>
            <div
              className={`my-6 h-px ${featured ? "bg-paper/15" : "bg-line"}`}
            />
            <ul className="space-y-2.5">
              {plan.features.map((feat) => (
                <li key={feat} className="flex items-start gap-2 text-[13.5px]">
                  <Check
                    size={16}
                    className={`mt-0.5 shrink-0 ${featured ? "text-accent" : "text-positive"}`}
                  />
                  <span className={featured ? "text-paper/85" : ""}>{feat}</span>
                </li>
              ))}
            </ul>
            <a
              href="#start"
              className={`group mt-8 inline-flex h-11 items-center justify-center gap-1.5 rounded-full px-5 text-sm font-semibold transition-all hover:-translate-y-0.5 active:scale-[0.99] ${
                featured
                  ? "bg-accent text-paper"
                  : "bg-paper text-ink ring-1 ring-line hover:bg-ink-soft"
              }`}
            >
              {cta}
              <ArrowRight
                size={15}
                className="transition-transform group-hover:translate-x-0.5"
              />
            </a>
          </Reveal>
        );
      })}
    </div>
  </section>
);

/* ── FAQ (accordion) ──────────────────────────────────────────────────────── */
const FAQS = [
  {
    q: "Do my students need to create accounts?",
    a: "No. You add them by their Lichess or Chess.com username. We do the rest — they keep playing where they already play.",
  },
  {
    q: "Which sites do you support?",
    a: "Lichess and Chess.com today. Both rapid and classical. Bullet games are pulled but de-emphasized in analysis since they're noisy signal.",
  },
  {
    q: "How accurate is the analysis?",
    a: "Analysis runs on Stockfish at deep node counts per critical move. Move classifications (blunder, mistake, missed plan) are calibrated against master games, not just raw centipawn loss.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Monthly plans cancel from your dashboard with one click. You keep access until the end of the billing period.",
  },
  {
    q: "What about student privacy?",
    a: "Game data comes from public chess sites. We never publish student names. Report cards live behind your coach login and shareable links you control.",
  },
];

const FaqRow = ({ q, a, n }: { q: string; a: string; n: number }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-line">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-4 py-5 text-left"
      >
        <span className="font-mono text-[11px] text-muted/60">
          0{n}
        </span>
        <span className="flex-1 font-display text-[15px] font-semibold tracking-tight">
          {q}
        </span>
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-line text-muted transition-colors hover:text-ink">
          {open ? <Minus size={14} /> : <Plus size={14} />}
        </span>
      </button>
      <div
        className="grid overflow-hidden transition-all duration-300 ease-out"
        style={{
          gridTemplateRows: open ? "1fr" : "0fr",
          opacity: open ? 1 : 0,
        }}
      >
        <div className="min-h-0">
          <p className="max-w-prose pb-5 pl-9 text-sm leading-relaxed text-muted">
            {a}
          </p>
        </div>
      </div>
    </div>
  );
};

export const Faq = () => (
  <section id="faq" className="border-t border-line">
    <div className="mx-auto grid max-w-screen-xl gap-12 px-5 py-24 md:grid-cols-[1fr_1.4fr] md:px-8 md:py-32">
      <Reveal>
        <Eyebrow n="§ 04" label="FAQ" />
        <h2 className="mt-5 font-display text-[1.9rem] font-bold tracking-[-0.02em] md:text-[2.5rem]">
          Questions coaches actually ask.
        </h2>
        <p className="mt-4 max-w-md text-[15px] leading-relaxed text-muted">
          Don&rsquo;t see yours?{" "}
          <a href="#start" className="font-semibold text-ink underline-offset-2 hover:underline">
            Email us
          </a>{" "}
          — a human writes back.
        </p>
      </Reveal>
      <Reveal delay={80} className="border-t border-line">
        {FAQS.map((f, i) => (
          <FaqRow key={f.q} q={f.q} a={f.a} n={i + 1} />
        ))}
      </Reveal>
    </div>
  </section>
);
