import {
  Component,
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Crosshair,
  RefreshCw,
  ScanLine,
  FileText,
  TrendingUp,
  Gamepad2,
  Check,
  Plus,
  Minus,
  ArrowRight,
} from "lucide-react";
import { PLANS } from "@/lib/plans";
import { PieceArt } from "@/components/chessPieces";
import { Reveal } from "./Reveal";
import { Eyebrow } from "./ui";

/* ── Integrations strip ───────────────────────────────────────────────────── */
export const Logos = () => (
  <section className="border-y border-line bg-card/40">
    <div className="mx-auto flex max-w-screen-xl flex-col items-center gap-4 px-5 py-8 md:flex-row md:justify-between md:px-8">
      <p className="text-xs text-muted">
        Built on real engine analysis
      </p>
      <div className="flex items-center gap-4 font-display text-base font-semibold text-ink/70 sm:gap-8 sm:text-lg">
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
    title: "Stockfish game analysis",
    body: "Every move from your students' real online games, scored by Stockfish and translated into coach-ready notes: themes, missed plans, critical moments.",
  },
  {
    icon: RefreshCw,
    title: "Fix-your-mistakes trainer",
    body: "Re-solve the exact positions they got wrong, scheduled to resurface right before they'd forget. FSRS spaced repetition, built for chess.",
  },
  {
    icon: ScanLine,
    title: "Scan a paper scoresheet",
    body: "Snap a photo of a handwritten scoresheet and get the full digital game back, ready for analysis. Tournament games, finally usable.",
  },
  {
    icon: FileText,
    title: "AI report cards",
    body: "Game-specific written summaries in seconds, in plain language. Send them home with parents. Drop them straight into your lesson plan.",
  },
  {
    icon: TrendingUp,
    title: "Growth tracking",
    body: "Prove progress over weeks. Accuracy trends, rating curves, themes resolved: the receipts that keep students (and parents) bought in.",
  },
  {
    icon: Gamepad2,
    title: "The Lab",
    body: "Knight's tour, mazes, vision drills: chess brain-games that keep younger students engaged between serious training blocks.",
  },
];

// three.js king — lazy so it only loads on the landing page, never the app.
const KingPiece3D = lazy(() => import("./KingPiece3D"));

// Defer mounting until near the viewport, so the 3D chunk only downloads when a
// visitor actually scrolls toward it.
function useInView<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, inView] as const;
}

// Track a media query (client-only SPA, so window is always available).
function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(
    typeof window !== "undefined" && window.matchMedia(query).matches,
  );
  useEffect(() => {
    const m = window.matchMedia(query);
    const on = () => setMatches(m.matches);
    on();
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, [query]);
  return matches;
}

// WebGL unavailable / three.js throws → fall back to a glyph silhouette.
class GLBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

const KingGlyph = () => (
  <div className="grid h-full w-full place-items-center">
    <span className="select-none text-[7rem] leading-none text-paper/15">
      ♚
    </span>
  </div>
);

// ── Bespoke per-feature visuals ───────────────────────────────────────────────
const ACCENT = "#e8662f";

// Hero overlay: a thin engine eval bar + best-move chip (Grandmaster analysis)
const EvalBar = () => (
  <div className="absolute left-5 top-5 bottom-5 hidden w-2 overflow-hidden rounded-full bg-paper/15 sm:block">
    <div className="absolute inset-x-0 top-0 h-[38%] bg-paper" />
  </div>
);

// Rating / accuracy curve (Growth tracking)
const RatingChart = () => (
  <svg viewBox="0 0 240 92" className="w-full" fill="none" aria-hidden>
    {[18, 44, 70].map((y) => (
      <line key={y} x1="0" y1={y} x2="240" y2={y} stroke="#ece9e2" strokeWidth="1" />
    ))}
    <path
      d="M4 76 40 67 76 71 112 49 148 53 184 30 220 21 236 12 236 88 4 88Z"
      fill={ACCENT}
      opacity="0.09"
    />
    <polyline
      points="4,76 40,67 76,71 112,49 148,53 184,30 220,21 236,12"
      stroke={ACCENT}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="236" cy="12" r="3.5" fill={ACCENT} />
  </svg>
);

// Spaced-repetition flashcard deck (Fix-your-mistakes trainer)
const TrainerDeck = () => (
  <div className="relative mx-auto h-[68px] w-[110px]">
    <div className="absolute left-1/2 top-3 h-12 w-[88px] -translate-x-1/2 -rotate-6 rounded-lg border border-line bg-paper" />
    <div className="absolute left-1/2 top-1.5 h-12 w-[88px] -translate-x-1/2 rotate-3 rounded-lg border border-line bg-paper" />
    <div className="absolute left-1/2 top-0 flex h-12 w-[88px] -translate-x-1/2 items-center justify-center rounded-lg border border-accent bg-paper shadow-sm">
      <span className="text-xs font-semibold text-accent">
        Due · 1
      </span>
    </div>
  </div>
);

// Accuracy ring (AI report cards)
const ReportRing = () => (
  <div className="flex items-center gap-3">
    <svg width="58" height="58" viewBox="0 0 58 58" aria-hidden>
      <circle cx="29" cy="29" r="24" fill="none" stroke="#ece9e2" strokeWidth="6" />
      <circle
        cx="29"
        cy="29"
        r="24"
        fill="none"
        stroke={ACCENT}
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray="150.8"
        strokeDashoffset="31.7"
        transform="rotate(-90 29 29)"
      />
      <text x="29" y="33" textAnchor="middle" fontSize="13" fontWeight="700" fill="#1c1b18">
        79%
      </text>
    </svg>
    <div className="space-y-1.5">
      <div className="h-1.5 w-16 rounded-full bg-line" />
      <div className="h-1.5 w-12 rounded-full bg-line" />
      <div className="h-1.5 w-14 rounded-full bg-line" />
    </div>
  </div>
);

// Handwritten scoresheet → digital game (Scan a paper scoresheet)
const ScanTransform = () => (
  <div className="flex items-center gap-3">
    <div className="-rotate-3 rounded-md border border-line bg-paper p-2 shadow-sm">
      <svg width="58" height="50" fill="none" aria-hidden>
        {[10, 20, 30, 40].map((y) => (
          <path
            key={y}
            d={`M6 ${y} q6 -4 12 0 t12 0 t12 0 t10 0`}
            stroke="#bdb6a7"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        ))}
      </svg>
    </div>
    <ArrowRight size={16} className="shrink-0 text-accent" />
    <div className="rounded-md border border-line bg-card px-2.5 py-1.5 font-mono text-[10px] leading-[1.5] text-ink">
      <div>1. e4 e5</div>
      <div>2. Nf3 Nc6</div>
      <div>3. Bb5 a6</div>
    </div>
  </div>
);

// Knight's-tour board (The Lab) — light on the dark tile
const KnightTour = () => (
  <svg viewBox="0 0 116 116" className="h-[104px] w-[104px]" aria-hidden>
    {Array.from({ length: 16 }).map((_, idx) => {
      const r = Math.floor(idx / 4);
      const c = idx % 4;
      const dark = (r + c) % 2 === 1;
      return (
        <rect
          key={idx}
          x={c * 29}
          y={r * 29}
          width="29"
          height="29"
          fill={dark ? "rgba(20,18,15,0.10)" : "rgba(20,18,15,0.04)"}
        />
      );
    })}
    <polyline
      points="14,72 72,101 101,43 43,14 14,43 72,72"
      fill="none"
      stroke={ACCENT}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray="3 5"
    />
    {[
      [14, 72],
      [72, 101],
      [101, 43],
      [43, 14],
    ].map(([x, y], k) => (
      <circle key={k} cx={x} cy={y} r="4" fill={ACCENT} />
    ))}
  </svg>
);

// Steel-blue mini board (matches the hero) for the "analyze" step.
const SB_LIGHT = "#e8edf1";
const SB_DARK = "#6f8da9";
const MINI_PIECES: Record<string, { s: "p" | "n" | "b" | "r" | "q" | "k"; l: boolean }> = {
  "0,2": { s: "b", l: false },
  "0,4": { s: "k", l: false },
  "1,3": { s: "p", l: false },
  "2,5": { s: "n", l: false },
  "4,3": { s: "p", l: true },
  "5,2": { s: "n", l: true },
  "6,5": { s: "p", l: true },
  "7,4": { s: "k", l: true },
  "7,6": { s: "r", l: true },
};
const MINI_LASTMOVE = new Set(["2,5", "3,5"]);

const MiniBoard = () => (
  <div className="overflow-hidden rounded-lg shadow-sm ring-1 ring-black/10">
    <div className="grid grid-cols-8">
      {Array.from({ length: 64 }).map((_, idx) => {
        const r = Math.floor(idx / 8);
        const c = idx % 8;
        const key = `${r},${c}`;
        const dark = (r + c) % 2 === 1;
        const p = MINI_PIECES[key];
        return (
          <div
            key={idx}
            className="relative aspect-square"
            style={{ background: dark ? SB_DARK : SB_LIGHT }}
          >
            {MINI_LASTMOVE.has(key) && (
              <span className="absolute inset-0 bg-[oklch(0.56_0.19_38_/_0.32)]" />
            )}
            {p && (
              <div className="absolute inset-0">
                <PieceArt shape={p.s} light={p.l} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  </div>
);

// One row per feature: copy on the left, its visual on the right.
const TILES = [
  {
    title: "Growth tracking",
    body: "Accuracy & rating trends that prove progress over weeks.",
    visual: (
      <div className="w-[176px] max-w-full">
        <RatingChart />
      </div>
    ),
  },
  {
    title: "Fix-your-mistakes trainer",
    body: "Their blunders, resurfaced right before they'd forget.",
    visual: <TrainerDeck />,
  },
  {
    title: "AI report cards",
    body: "Plain-language game summaries in seconds.",
    visual: <ReportRing />,
  },
  {
    title: "Scan a paper scoresheet",
    body: "Photo of a handwritten sheet → a clean digital game.",
    visual: <ScanTransform />,
  },
  {
    title: "The Lab",
    body: "Knight's tour, mazes & vision drills between training blocks.",
    visual: <KnightTour />,
  },
] as const;

export const Features = () => {
  const [stageRef, inView] = useInView<HTMLDivElement>();
  const isDesktop = useMediaQuery("(min-width: 768px)");

  return (
    <section
      id="features"
      className="mx-auto max-w-screen-xl px-5 py-16 sm:py-24 md:px-8 md:py-32"
    >
      <Reveal className="max-w-2xl">
        <Eyebrow label="What's inside" />
        <h2 className="mt-5 font-display text-[1.9rem] font-semibold tracking-[-0.02em] md:text-[2.75rem]">
          Every tool a coach actually opens on a Tuesday night.
        </h2>
        <p className="mt-4 text-muted">
          Not a giant feature graveyard. Six things, sharpened around the loop of
          analyze, assign, retest.
        </p>
      </Reveal>

      <div
        ref={stageRef}
        className="mt-14 grid gap-8 md:grid-cols-[1.1fr_1fr] md:gap-12"
      >
        {/* The lead feature: live 3D king with an engine eval */}
        <Reveal className="relative min-h-[420px] overflow-hidden rounded-2xl bg-ink text-paper md:min-h-0">
          <div className="absolute inset-0">
            {inView && isDesktop ? (
              <GLBoundary fallback={<KingGlyph />}>
                <Suspense fallback={<KingGlyph />}>
                  <KingPiece3D />
                </Suspense>
              </GLBoundary>
            ) : (
              <KingGlyph />
            )}
          </div>
          <EvalBar />
          <p className="absolute right-6 top-6 z-10 font-mono text-xs text-paper/80">
            Best <span className="text-accent">Nf5</span> +1.2
          </p>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-ink via-ink/70 to-transparent" />
          <div className="relative flex h-full flex-col justify-end p-8">
            <h3 className="font-display text-2xl font-semibold tracking-tight">
              {FEATURES[0].title}
            </h3>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-paper/70">
              Every move scored by Stockfish: themes, missed plans and the
              critical moments, in coach-ready language.
            </p>
          </div>
        </Reveal>

        {/* The other five as a ruled list */}
        <ul className="border-b border-line">
          {TILES.map((t, k) => (
            <Reveal
              as="li"
              key={t.title}
              delay={(k % 3) * 60}
              className="grid items-center gap-6 border-t border-line py-6 sm:grid-cols-[1fr_176px]"
            >
              <div>
                <h3 className="font-display text-lg font-semibold tracking-tight">
                  {t.title}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-muted">
                  {t.body}
                </p>
              </div>
              <div className="flex justify-start sm:justify-end">{t.visual}</div>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
};

/* ── How it works ─────────────────────────────────────────────────────────── */
const STEPS = [
  {
    title: "Add a student by username",
    body: "Just their Lichess or Chess.com handle. No account needed on the student's side.",
  },
  {
    title: "Strategem analyzes their games",
    body: "We pull recent games, run engine analysis, and surface patterns across the whole batch.",
  },
  {
    title: "Get weaknesses, drills & a report card",
    body: "You walk into the next lesson knowing exactly what to teach. They walk out with drills.",
  },
];

// Each step is marked like a line on a scoresheet.
const STEP_MOVE = ["1. e4", "1…e5", "2. Nf3"];

const ANALYSIS_FEED = [
  { mv: "Bxf7+", tag: "Brilliant", cls: "text-positive" },
  { mv: "Nbd2", tag: "Inaccuracy", cls: "text-muted" },
  { mv: "Qh5??", tag: "Blunder", cls: "text-accent" },
];
const REPORT_BARS = [
  { label: "Rook endgames", pct: 58 },
  { label: "Back-rank", pct: 71 },
];

const StepVisual = ({ i }: { i: number }) => {
  if (i === 0)
    return (
      <div className="flex items-baseline justify-between border-b border-ink/30 pb-2">
        <span className="font-mono text-sm text-ink">magnus_jr</span>
        <span className="text-xs text-muted">Lichess</span>
      </div>
    );
  if (i === 1)
    return (
      <div className="flex items-center gap-6">
        <div className="w-28 shrink-0 sm:w-32">
          <MiniBoard />
        </div>
        <div className="min-w-0 flex-1">
          <p className="pb-2 text-xs text-muted">Analyzing 47 games</p>
          {ANALYSIS_FEED.map((r) => (
            <div
              key={r.mv}
              className="flex items-baseline justify-between border-t border-line py-2"
            >
              <span className="font-mono text-[13px] text-ink">{r.mv}</span>
              <span className={`text-xs ${r.cls}`}>{r.tag}</span>
            </div>
          ))}
        </div>
      </div>
    );
  return (
    <div>
      <p className="pb-2 text-xs text-muted">Report for Magnus Jr</p>
      {REPORT_BARS.map((b) => (
        <div key={b.label} className="border-t border-line py-2">
          <div className="flex items-baseline justify-between text-[13px]">
            <span className="text-ink">{b.label}</span>
            <span className="font-mono tabular-nums text-muted">{b.pct}%</span>
          </div>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-line">
            <span
              className="block h-full bg-accent"
              style={{ width: `${b.pct}%` }}
            />
          </div>
        </div>
      ))}
      <p className="border-t border-line pt-2 text-xs text-muted">
        4 drills queued
      </p>
    </div>
  );
};

export const HowItWorks = () => (
  <section id="how" className="border-t border-line bg-card/40">
    <div className="mx-auto max-w-screen-xl px-5 py-16 sm:py-24 md:px-8 md:py-32">
      <Reveal className="max-w-2xl">
        <Eyebrow label="How it works" />
        <h2 className="mt-5 font-display text-[1.9rem] font-semibold tracking-[-0.02em] text-balance md:text-[2.75rem]">
          From a username to a lesson plan.
        </h2>
      </Reveal>

      <ol className="mt-14 border-b border-line">
        {STEPS.map((s, i) => (
          <li key={s.title} className="border-t border-line">
            <Reveal
              delay={i * 80}
              className="grid gap-4 py-8 md:grid-cols-[80px_minmax(0,1fr)_minmax(0,1fr)] md:gap-8 md:py-10"
            >
              <span className="pt-1 font-mono text-sm text-muted">
                {STEP_MOVE[i]}
              </span>
              <div>
                <h3 className="font-display text-xl font-semibold tracking-tight">
                  {s.title}
                </h3>
                <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">
                  {s.body}
                </p>
              </div>
              <div className="mt-2 md:mt-0">
                <StepVisual i={i} />
              </div>
            </Reveal>
          </li>
        ))}
      </ol>
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
  <section
    id="pricing"
    className="mx-auto max-w-screen-xl px-5 py-16 sm:py-24 md:px-8 md:py-32"
  >
    <Reveal className="max-w-2xl">
      <Eyebrow label="Pricing" />
      <h2 className="mt-5 font-display text-[1.9rem] font-semibold tracking-[-0.02em] md:text-[2.75rem]">
        One student free. Scale when your roster scales.
      </h2>
      <p className="mt-4 text-muted">
        Monthly. Cancel anytime. No per-student surprise fees.
      </p>
    </Reveal>

    <div className="mt-14 grid border-t border-ink/20 md:grid-cols-2 xl:grid-cols-4">
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
            className={`flex flex-col border-b border-line py-8 md:px-6 xl:border-b-0 ${
              i === 0 ? "xl:pl-0" : "xl:border-l"
            } ${i % 2 === 1 ? "md:border-l" : ""} ${i === 3 ? "xl:pr-0" : ""}`}
          >
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-display text-[15px] font-semibold">
                {plan.name}
              </span>
              {featured && (
                <span className="text-xs text-accent">Most popular</span>
              )}
            </div>
            <div className="mt-4 flex items-baseline gap-1.5">
              <span className="font-display text-4xl font-medium tracking-tight tabular-nums">
                ${plan.price}
              </span>
              <span className="text-[13px] text-muted">/mo</span>
            </div>
            <p className="mt-2 text-[13px] leading-relaxed text-muted">
              {TAGLINE[plan.id]}
            </p>
            <ul className="my-6 flex-1 space-y-2.5 border-t border-line pt-6">
              {plan.features.map((feat) => (
                <li key={feat} className="flex items-start gap-2 text-[13.5px]">
                  <Check size={16} className="mt-0.5 shrink-0 text-muted" />
                  <span>{feat}</span>
                </li>
              ))}
            </ul>
            <a
              href="#start"
              className={`inline-flex h-11 items-center justify-center rounded-lg px-5 text-sm font-medium transition-[background-color,opacity,transform] duration-150 active:scale-[0.98] ${
                featured
                  ? "bg-accent text-paper hover:opacity-90"
                  : "text-ink ring-1 ring-line hover:bg-ink-soft"
              }`}
            >
              {cta}
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
    a: "No. You add them by their Lichess or Chess.com username. We do the rest, and they keep playing where they already play.",
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
        <span className="grid h-7 w-7 shrink-0 place-items-center text-muted transition-colors hover:text-ink">
          {open ? <Minus size={14} /> : <Plus size={14} />}
        </span>
      </button>
      <div
        className="grid overflow-hidden transition-[grid-template-rows,opacity] duration-300 ease-out"
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
    <div className="mx-auto grid max-w-screen-xl gap-10 px-5 py-16 sm:py-24 md:grid-cols-[1fr_1.4fr] md:gap-12 md:px-8 md:py-32">
      <Reveal>
        <Eyebrow label="FAQ" />
        <h2 className="mt-5 font-display text-[1.9rem] font-semibold tracking-[-0.02em] md:text-[2.5rem]">
          Questions coaches actually ask.
        </h2>
        <p className="mt-4 max-w-md text-[15px] leading-relaxed text-muted">
          Don&rsquo;t see yours?{" "}
          <a href="#start" className="font-semibold text-ink underline-offset-2 hover:underline">
            Email us
          </a>{" "}
          and a human writes back.
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
