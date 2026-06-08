import { Target, TrendingUp } from "lucide-react";

// A stylized board "being read" by Strategem — last-move highlight, a flagged
// blunder square, and floating analysis cards. Pure decoration; no chess logic.

const LIGHT = "#eceed4";
const DARK = "#7e9a64";

// A plausible middlegame snapshot (8 rows top→bottom, 8 files a→h).
const POSITION: (string | null)[][] = [
  ["♜", null, null, "♛", "♚", "♝", null, "♜"],
  ["♟", "♟", null, null, null, "♟", "♟", "♟"],
  [null, null, "♞", "♟", null, "♞", null, null],
  [null, null, null, null, "♟", null, null, null],
  [null, null, "♗", null, "♙", null, null, null],
  [null, null, null, null, null, "♘", null, null],
  ["♙", "♙", "♙", "♙", null, "♙", "♙", "♙"],
  ["♖", "♘", "♗", "♕", "♔", null, null, "♖"],
];

// r,c coordinates for highlights.
const LAST_MOVE = new Set(["4,2", "2,2"]); // bishop landing + origin tint
const BLUNDER = "3,4"; // the flagged square

export const HeroBoard = () => {
  return (
    <div className="relative mx-auto w-full max-w-md">
      {/* ambient glows */}
      <div className="pointer-events-none absolute -right-10 -top-10 h-56 w-56 animate-glow-pulse rounded-full bg-accent/30 blur-[90px]" />
      <div
        className="pointer-events-none absolute -bottom-12 -left-10 h-56 w-56 animate-float rounded-full bg-positive/20 blur-[90px]"
        style={{ animationDelay: "1.2s" }}
      />

      {/* the board */}
      <div className="relative animate-float rounded-[22px] border border-line bg-card p-3 shadow-[0_30px_70px_-28px_rgba(20,18,15,0.45)]">
        <div className="overflow-hidden rounded-xl">
          <div className="grid grid-cols-8">
            {POSITION.map((row, r) =>
              row.map((piece, c) => {
                const key = `${r},${c}`;
                const dark = (r + c) % 2 === 1;
                const isLast = LAST_MOVE.has(key);
                const isBlunder = key === BLUNDER;
                return (
                  <div
                    key={key}
                    className="relative grid aspect-square place-items-center"
                    style={{ backgroundColor: dark ? DARK : LIGHT }}
                  >
                    {isLast && (
                      <span className="absolute inset-0 bg-[oklch(0.56_0.19_38_/_0.28)]" />
                    )}
                    {isBlunder && (
                      <span className="absolute inset-1 animate-glow-pulse rounded-md ring-2 ring-accent" />
                    )}
                    {piece && (
                      <span
                        className="relative z-10 text-[26px] leading-none sm:text-[30px]"
                        style={{
                          color: "#1c1b18",
                          textShadow:
                            "0 1px 0 rgba(255,255,255,0.35), 0 2px 3px rgba(0,0,0,0.25)",
                        }}
                      >
                        {piece}
                      </span>
                    )}
                  </div>
                );
              }),
            )}
          </div>
        </div>
      </div>

      {/* floating accuracy card */}
      <div
        className="absolute -right-4 top-8 hidden animate-float rounded-2xl border border-line bg-card/95 p-3 shadow-[0_18px_40px_-18px_rgba(20,18,15,0.4)] backdrop-blur sm:block md:-right-8"
        style={{ animationDelay: "0.6s" }}
      >
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
          Accuracy
        </p>
        <div className="mt-0.5 flex items-end gap-2">
          <span className="font-display text-2xl font-bold tracking-tight">
            79%
          </span>
          <span className="mb-0.5 flex items-center gap-0.5 text-[11px] font-semibold text-positive">
            <TrendingUp size={12} /> +4
          </span>
        </div>
      </div>

      {/* floating next-focus card */}
      <div
        className="absolute -left-4 bottom-10 hidden animate-float rounded-2xl border border-line bg-card/95 p-3 shadow-[0_18px_40px_-18px_rgba(20,18,15,0.4)] backdrop-blur sm:block md:-left-10"
        style={{ animationDelay: "1.6s" }}
      >
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
          Next focus
        </p>
        <div className="mt-1 flex items-center gap-1.5">
          <span className="grid h-6 w-6 place-items-center rounded-lg bg-accent-soft text-accent">
            <Target size={13} />
          </span>
          <span className="text-sm font-semibold">Rook endgames</span>
        </div>
      </div>

      {/* blunder pill */}
      <div
        className="absolute right-6 -bottom-3 animate-float rounded-full bg-accent px-3 py-1 text-[11px] font-semibold text-paper shadow-[0_10px_24px_-8px_oklch(0.56_0.19_38_/_0.6)]"
        style={{ animationDelay: "0.9s" }}
      >
        Blunder · move 24
      </div>
    </div>
  );
};
