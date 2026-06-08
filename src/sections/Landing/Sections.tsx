import {
  Component,
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
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
import { PieceArt } from "@/components/chessPieces";
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
    <span className="animate-glow-pulse select-none text-[7rem] leading-none text-paper/15">
      ♚
    </span>
  </div>
);

// ── Small decorative graphics for the wide Feature tiles ──────────────────────
const ACCENT = "#e8662f";

// Spaced-repetition deck (Fix-your-mistakes trainer)
const FlashStack = () => (
  <svg width="92" height="64" viewBox="0 0 92 64" fill="none" aria-hidden>
    <rect x="20" y="8" width="58" height="40" rx="7" fill="#fff" stroke="#d7d1c4" strokeWidth="2" />
    <rect x="12" y="15" width="58" height="40" rx="7" fill="#fff" stroke={ACCENT} strokeWidth="2" />
    <circle cx="25" cy="35" r="4" fill={ACCENT} />
    <rect x="34" y="33" width="28" height="4.5" rx="2.25" fill="#d7d1c4" />
    <rect x="34" y="41" width="18" height="4.5" rx="2.25" fill="#e7e2d6" />
  </svg>
);

// Upward trend (Growth tracking)
const Sparkline = () => (
  <svg width="136" height="60" viewBox="0 0 136 60" fill="none" aria-hidden>
    <polyline
      points="4,50 26,42 48,46 70,28 92,33 114,15 132,6"
      fill="none"
      stroke={ACCENT}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="132" cy="6" r="3.5" fill={ACCENT} />
  </svg>
);

// Knight-tour dot grid (The Lab) — light strokes for the dark tile
const KnightGrid = () => (
  <svg width="72" height="72" viewBox="0 0 72 72" fill="none" aria-hidden>
    {[10, 27, 44, 61].map((y) =>
      [10, 27, 44, 61].map((x) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="2.5" fill="rgba(255,255,255,0.28)" />
      )),
    )}
    <polyline
      points="10,44 44,61 61,27 27,10 10,27"
      fill="none"
      stroke={ACCENT}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const FEATURE_GRAPHIC: Partial<Record<number, () => ReactElement>> = {
  1: FlashStack,
  4: Sparkline,
  5: KnightGrid,
};

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

export const Features = () => {
  const [stageRef, inView] = useInView<HTMLDivElement>();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const HeroIcon = FEATURES[0].icon;

  return (
    <section
      id="features"
      className="mx-auto max-w-screen-xl px-5 py-16 sm:py-24 md:px-8 md:py-32"
    >
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

      <div
        ref={stageRef}
        className="mt-14 grid gap-3 md:grid-cols-4 md:auto-rows-[200px]"
      >
        {/* 01 — big dark tile, live 3D king (desktop only; mobile gets the glyph
            so phones never download the three.js chunk) */}
        <Reveal className="group relative min-h-[300px] overflow-hidden rounded-3xl bg-ink text-paper md:col-span-2 md:row-span-2 md:min-h-0">
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
          {/* legibility gradient under the copy */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-ink via-ink/70 to-transparent" />
          <div className="relative flex h-full flex-col justify-between p-7">
            <div className="flex items-center justify-between">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-paper/10 text-accent">
                <HeroIcon size={19} strokeWidth={1.75} />
              </span>
              <span className="font-mono text-[11px] text-paper/40">01</span>
            </div>
            <div>
              <h3 className="font-display text-2xl font-bold tracking-tight">
                {FEATURES[0].title}
              </h3>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-paper/70">
                {FEATURES[0].body}
              </p>
            </div>
          </div>
        </Reveal>

        {/* 02–06 — shuffled spans: trainer(02) wide, scan(03)+report(04) small,
            growth(05) wide, lab(06) wide-dark. Wide tiles carry a graphic. */}
        {FEATURES.slice(1).map((f, k) => {
          const i = k + 1;
          const wide = i === 1 || i === 4 || i === 5;
          const dark = i === 5;
          const Icon = f.icon;
          const Graphic = FEATURE_GRAPHIC[i];
          return (
            <Reveal
              key={f.title}
              delay={(k % 3) * 70}
              className={`group relative flex flex-col justify-between overflow-hidden rounded-3xl p-6 transition-all duration-300 ${
                wide ? "md:col-span-2" : ""
              } ${
                dark
                  ? "bg-ink text-paper"
                  : "border border-line bg-card hover:bg-ink-soft/30"
              }`}
            >
              <div className="relative z-10 flex items-center justify-between">
                <span
                  className={`grid h-10 w-10 place-items-center rounded-xl transition-transform duration-300 group-hover:-translate-y-0.5 ${
                    dark ? "bg-paper/10 text-accent" : "bg-accent-soft text-accent"
                  }`}
                >
                  <Icon size={19} strokeWidth={1.75} />
                </span>
                <span
                  className={`font-mono text-[11px] ${dark ? "text-paper/40" : "text-muted/60"}`}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>

              {/* graphic — sits bottom-right, copy stays clear of it */}
              {Graphic && (
                <div className="pointer-events-none absolute bottom-5 right-5 opacity-95">
                  <Graphic />
                </div>
              )}

              <div className="relative z-10">
                <h3 className="font-display text-lg font-bold tracking-tight">
                  {f.title}
                </h3>
                <p
                  className={`mt-1.5 text-[13.5px] leading-relaxed ${
                    Graphic ? "max-w-[58%]" : wide ? "" : "line-clamp-2"
                  } ${dark ? "text-paper/70" : "text-muted"}`}
                >
                  {f.body}
                </p>
              </div>
              {!dark && (
                <span className="absolute bottom-0 left-0 h-[3px] w-0 bg-accent transition-all duration-500 ease-out group-hover:w-full" />
              )}
            </Reveal>
          );
        })}
      </div>
    </section>
  );
};

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

// Visual-first: narrow username step, wide board step, full-width report step.
const STEP_SPAN = ["md:col-span-1", "md:col-span-2", "md:col-span-3"];
const STEP_MOVE = ["1. e4", "1…e5", "2. Nf3"];

const ANALYSIS_FEED = [
  { mv: "Bxf7+", tag: "Brilliant", cls: "text-positive bg-positive/15" },
  { mv: "Nbd2", tag: "Inaccuracy", cls: "text-amber-600 bg-amber-500/15" },
  { mv: "Qh5??", tag: "Blunder", cls: "text-accent bg-accent-soft" },
];
const REPORT_BARS = [
  { label: "Rook endgames", pct: 58 },
  { label: "Back-rank", pct: 71 },
];
const WEAKNESS_TAGS = ["Back-rank mates", "Time scrambles", "Rook endgames"];

export const HowItWorks = () => (
  <section id="how" className="border-t border-line bg-card/40">
    <div className="mx-auto max-w-screen-xl px-5 py-16 sm:py-24 md:px-8 md:py-32">
      <Reveal className="max-w-2xl">
        <Eyebrow n="§ 02" label="How it works" />
        <h2 className="mt-5 font-display text-[1.9rem] font-bold tracking-[-0.02em] md:text-[2.75rem]">
          From username to lesson plan in under two minutes.
        </h2>
      </Reveal>

      <div className="mt-14 grid gap-3 md:grid-cols-3 md:auto-rows-[300px]">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const dark = i === 0;
          return (
            <Reveal
              key={s.title}
              delay={i * 110}
              className={`group relative flex flex-col overflow-hidden rounded-3xl p-6 transition-all duration-300 ${STEP_SPAN[i]} ${
                dark
                  ? "bg-ink text-paper"
                  : "border border-line bg-card hover:bg-ink-soft/30"
              }`}
            >
              {/* header: step label + chess-move tag */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-accent">
                  <Icon size={17} strokeWidth={2} />
                  <span className="font-mono text-[11px] uppercase tracking-[0.18em]">
                    Step {i + 1}
                  </span>
                </div>
                <span
                  className={`rounded-md px-2 py-0.5 font-mono text-[11px] ${
                    dark ? "bg-paper/10 text-paper/55" : "bg-ink-soft text-muted"
                  }`}
                >
                  {STEP_MOVE[i]}
                </span>
              </div>

              {/* ── visual region (the focus — minimal copy) ── */}
              <div className="my-4 flex flex-1 items-center">
                {/* 1 — username field */}
                {i === 0 && (
                  <div className="w-full">
                    <div className="flex items-center gap-2 rounded-xl border border-accent/40 bg-paper/[0.06] p-2.5">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-accent text-sm font-bold text-paper">
                        @
                      </span>
                      <span className="font-mono text-sm text-paper/90">magnus_jr</span>
                      <span className="-ml-1 inline-block h-4 w-px animate-pulse bg-accent" />
                      <span className="ml-auto rounded-md bg-paper/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-paper/55">
                        Lichess
                      </span>
                    </div>
                    <p className="mt-3 font-mono text-[11px] text-paper/45">
                      No student account needed.
                    </p>
                  </div>
                )}

                {/* 2 — mini board + live engine verdicts */}
                {i === 1 && (
                  <div className="flex w-full items-center gap-5">
                    <div className="w-[168px] shrink-0">
                      <MiniBoard />
                    </div>
                    <div className="hidden flex-1 space-y-1.5 sm:block">
                      <div className="mb-1 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
                          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
                        </span>
                        Analyzing 47 games
                      </div>
                      {ANALYSIS_FEED.map((r) => (
                        <div
                          key={r.mv}
                          className="flex items-center justify-between rounded-lg border border-line bg-paper px-2.5 py-1.5"
                        >
                          <span className="font-mono text-[13px] font-medium text-ink">
                            {r.mv}
                          </span>
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${r.cls}`}
                          >
                            {r.tag}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3 — weakness tags + report card */}
                {i === 2 && (
                  <div className="flex w-full flex-col items-stretch gap-5 md:flex-row md:items-center md:gap-8">
                    <div className="flex flex-1 flex-wrap content-center gap-2">
                      {WEAKNESS_TAGS.map((t) => (
                        <span
                          key={t}
                          className="rounded-full border border-line bg-paper px-3 py-1 text-[12.5px] font-medium text-ink"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                    <div className="w-full shrink-0 rounded-2xl border border-line bg-paper p-4 shadow-sm md:w-80">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                          Report · Magnus Jr
                        </span>
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-positive">
                          <TrendingUp size={11} /> +6
                        </span>
                      </div>
                      <div className="mt-3 space-y-2.5">
                        {REPORT_BARS.map((b) => (
                          <div key={b.label}>
                            <div className="flex items-center justify-between text-[11.5px]">
                              <span className="text-ink">{b.label}</span>
                              <span className="font-mono text-muted">{b.pct}%</span>
                            </div>
                            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-line">
                              <span
                                className="block h-full rounded-full bg-accent"
                                style={{ width: `${b.pct}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-[11px] font-semibold text-accent">
                          4 drills queued
                        </span>
                        <span className="rounded-full bg-positive/15 px-2.5 py-0.5 text-[11px] font-semibold text-positive">
                          Card ✓
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* title only — no body copy */}
              <h3 className="font-display text-xl font-bold tracking-tight md:text-2xl">
                {s.title}
              </h3>

              {!dark && (
                <span className="absolute bottom-0 left-0 h-[3px] w-0 bg-accent transition-all duration-500 ease-out group-hover:w-full" />
              )}
            </Reveal>
          );
        })}
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
  <section
    id="pricing"
    className="mx-auto max-w-screen-xl px-5 py-16 sm:py-24 md:px-8 md:py-32"
  >
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
    <div className="mx-auto grid max-w-screen-xl gap-10 px-5 py-16 sm:py-24 md:grid-cols-[1fr_1.4fr] md:gap-12 md:px-8 md:py-32">
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
