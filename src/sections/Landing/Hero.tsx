import { Check } from "lucide-react";
import { PrimaryCta, SecondaryCta } from "./ui";
import { HeroBoard } from "./HeroBoard";

export const Hero = () => {
  return (
    <section className="relative overflow-hidden">
      <div className="relative mx-auto grid max-w-screen-xl grid-cols-1 items-center gap-12 px-5 py-16 md:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] md:gap-16 md:px-8 md:py-24 lg:py-28">
        {/* copy */}
        <div>
          <p className="animate-fade-up text-sm text-muted">
            For chess coaches &amp; clubs
          </p>

          <h1
            className="mt-5 animate-fade-up font-display text-[2.6rem] font-semibold leading-[1.02] tracking-[-0.03em] md:text-[4.25rem]"
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
            runs Stockfish analysis, and tells you exactly what to fix
            next, drills included.
          </p>

          <div
            className="mt-8 flex animate-fade-up flex-wrap items-center gap-3"
            style={{ animationDelay: "0.24s" }}
          >
            <PrimaryCta>Start free with 1 student</PrimaryCta>
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
          className="min-w-0 animate-fade-up"
          style={{ animationDelay: "0.2s" }}
        >
          <HeroBoard />
        </div>
      </div>
    </section>
  );
};
