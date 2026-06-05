import { useState } from "react";
import { ArrowLeft, Lightbulb, Grid3x3, Route, Hash, Brain } from "lucide-react";
import { LightsOut } from "@/sections/Lab/LightsOut";
import { KnightsTour } from "@/sections/Lab/KnightsTour";
import { MazeRunner } from "@/sections/Lab/MazeRunner";
import { Game2048 } from "@/sections/Lab/Game2048";
import { MemoryMatch } from "@/sections/Lab/MemoryMatch";

type PuzzleId = "knight" | "lights" | "maze" | "2048" | "memory";

const PUZZLES: {
  id: PuzzleId;
  name: string;
  icon: typeof Grid3x3;
  tagline: string;
  trains: string;
  render: () => JSX.Element;
}[] = [
  {
    id: "knight",
    name: "Knight’s Tour",
    icon: Grid3x3,
    tagline: "Visit every square exactly once.",
    trains: "Knight vision · planning",
    render: () => <KnightsTour />,
  },
  {
    id: "lights",
    name: "Lights Out",
    icon: Lightbulb,
    tagline: "Switch off every light — but each tap flips its neighbours too.",
    trains: "Parity · side-effect thinking",
    render: () => <LightsOut />,
  },
  {
    id: "maze",
    name: "The Maze",
    icon: Route,
    tagline: "Find the exit — then beat the optimal path.",
    trains: "Efficiency · shortest-plan",
    render: () => <MazeRunner />,
  },
  {
    id: "2048",
    name: "2048",
    icon: Hash,
    tagline: "Slide and merge tiles to reach 2048 without locking yourself in.",
    trains: "Look-ahead · board management",
    render: () => <Game2048 />,
  },
  {
    id: "memory",
    name: "Memory Match",
    icon: Brain,
    tagline: "Flip the chess-piece cards two at a time and find every pair.",
    trains: "Visual memory · recall",
    render: () => <MemoryMatch />,
  },
];

// The Lab — a little arcade of thinking toys beyond chess. No student needed;
// pure brain training that sharpens the same muscles (calculation, planning,
// pattern-sight). Free for everyone — an engagement hook with real substance.
export const LabView = () => {
  const [active, setActive] = useState<PuzzleId | null>(null);
  const puzzle = PUZZLES.find((p) => p.id === active);

  if (puzzle) {
    return (
      <section>
        <button
          onClick={() => setActive(null)}
          className="mb-5 flex items-center gap-1.5 text-sm font-semibold text-muted transition-colors hover:text-ink"
        >
          <ArrowLeft size={15} />
          The Lab
        </button>
        <div className="rounded-2xl border border-line bg-card p-8">
          <div className="mb-6 text-center">
            <h2 className="font-display text-2xl font-bold tracking-tight">
              {puzzle.name}
            </h2>
            <p className="mt-1 text-sm text-muted">{puzzle.tagline}</p>
          </div>
          {puzzle.render()}
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="mb-6">
        <p className="eyebrow">The Lab</p>
        <h2 className="mt-0.5 font-display text-2xl font-bold tracking-tight">
          Brain toys
        </h2>
        <p className="mt-1 max-w-xl text-sm text-muted">
          Quick thinking puzzles beyond the board — they train the same muscles
          good chess needs: calculation, planning, and seeing patterns. Pick one.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PUZZLES.map((p) => (
          <button
            key={p.id}
            onClick={() => setActive(p.id)}
            className="group flex flex-col rounded-2xl border border-line bg-card p-6 text-left transition-shadow hover:shadow-md"
          >
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-ink-soft transition-colors group-hover:bg-accent-soft">
              <p.icon size={20} className="text-accent" />
            </span>
            <h3 className="mt-4 font-display text-lg font-bold tracking-tight">
              {p.name}
            </h3>
            <p className="mt-1 flex-1 text-sm leading-relaxed text-muted">
              {p.tagline}
            </p>
            <p className="mt-3 font-mono text-[10px] uppercase tracking-wide text-muted/70">
              {p.trains}
            </p>
          </button>
        ))}
      </div>
    </section>
  );
};
