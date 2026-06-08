import { Check } from "lucide-react";
import { PrimaryCta, SecondaryCta } from "./ui";
import { HeroBoard } from "./HeroBoard";

export const Hero = () => {
  return (
    <section className="relative overflow-hidden">
      {/* faint drifting board pattern */}
      <div
        className="pointer-events-none absolute inset-0 animate-board-drift opacity-[0.035]"
        style={{
          backgroundImage:
            "linear-gradient(45deg, #000 25%, transparent 25%, transparent 75%, #000 75%), linear-gradient(45deg, #000 25%, transparent 25%, transparent 75%, #000 75%)",
          backgroundSize: "56px 56px",
          backgroundPosition: "0 0, 28px 28px",
        }}
      />
      <div className="relative mx-auto grid max-w-screen-xl items-center gap-12 px-5 py-16 md:grid-cols-[1.05fr_1fr] md:gap-16 md:px-8 md:py-24 lg:py-28">
        {/* copy */}
        <div>
          <div className="inline-flex animate-fade-up items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
            </span>
            For chess coaches &amp; clubs
          </div>

          <h1
            className="mt-5 animate-fade-up font-display text-[2.6rem] font-bold leading-[1.02] tracking-[-0.03em] md:text-[4.25rem]"
            style={{ animationDelay: "0.08s" }}
          >
            Coach smarter.
            <br />
            See every game{" "}
            <span className="relative inline-block">
              clearly.
              <svg
                className="absolute -bottom-1 left-0 w-full"
                height="10"
                viewBox="0 0 200 10"
                fill="none"
                preserveAspectRatio="none"
                aria-hidden
              >
                <path
                  d="M2 7C40 3 120 2 198 5"
                  stroke="oklch(0.56 0.19 38)"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          </h1>

          <p
            className="mt-7 max-w-xl animate-fade-up text-[17px] leading-relaxed text-muted"
            style={{ animationDelay: "0.16s" }}
          >
            Strategem pulls your students&rsquo; Lichess and Chess.com games,
            runs grandmaster-grade analysis, and tells you exactly what to fix
            next — drills included.
          </p>

          <div
            className="mt-8 flex animate-fade-up flex-wrap items-center gap-3"
            style={{ animationDelay: "0.24s" }}
          >
            <PrimaryCta>Start free — 1 student</PrimaryCta>
            <SecondaryCta>See a sample report</SecondaryCta>
          </div>

          <div
            className="mt-8 flex animate-fade-up flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted"
            style={{ animationDelay: "0.32s" }}
          >
            <span className="flex items-center gap-1.5">
              <Check size={14} className="text-positive" /> No card required
            </span>
            <span className="flex items-center gap-1.5">
              <Check size={14} className="text-positive" /> Students keep their
              accounts
            </span>
          </div>
        </div>

        {/* board */}
        <div
          className="animate-fade-up"
          style={{ animationDelay: "0.2s" }}
        >
          <HeroBoard />
        </div>
      </div>
    </section>
  );
};
