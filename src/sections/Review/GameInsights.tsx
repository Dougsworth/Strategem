import { useRef, useState } from "react";
import { AlertTriangle, Cpu, Crown, Loader2, Sparkles } from "lucide-react";
import type { GameInsights as Insights, KeyMoment } from "@/lib/analysis/gameInsights";
import { engineAvailable } from "@/lib/engine/stockfish";
import {
  analyzeWithEngine,
  type EngineAnalysis,
  type EngineMove,
  type MoveClass,
} from "@/lib/engine/analyzeWithEngine";

// Per-game analysis for a scanned game. Instant heuristic layer (material curve,
// tactics, loose material) plus an opt-in real-engine layer (Stockfish in a
// worker → win% eval curve, accuracy %, classified mistakes) using the same
// accuracy model as the student report. Clicking anything seeks the board.
export function GameInsights({
  insights,
  moves,
  white,
  black,
  ply,
  total,
  onSeek,
}: {
  insights: Insights;
  moves: string[];
  white: string;
  black: string;
  ply: number;
  total: number;
  onSeek: (ply: number) => void;
}) {
  const { material, phases, captures, checks, keyMoments, result } = insights;

  const [engine, setEngine] = useState<EngineAnalysis | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [engineErr, setEngineErr] = useState<string | null>(null);
  const abortRef = useRef({ aborted: false });

  if (material.length === 0) return null;

  async function runEngine() {
    setEngineErr(null);
    setEngine(null);
    abortRef.current = { aborted: false };
    setProgress({ done: 0, total: moves.length + 1 });
    try {
      const a = await analyzeWithEngine(moves, {
        movetime: 80,
        onProgress: (done, t) => setProgress({ done, total: t }),
        signal: abortRef.current,
      });
      if (!abortRef.current.aborted) setEngine(a);
    } catch {
      if (!abortRef.current.aborted) setEngineErr("Engine analysis failed — try again.");
    } finally {
      setProgress(null);
    }
  }

  const resultLabel =
    result === "1-0" ? `${white} won`
    : result === "0-1" ? `${black} won`
    : result === "1/2-1/2" ? "Draw"
    : "Unfinished";

  const mistakes = engine
    ? engine.moves
        .filter((m) => m.classification !== "best" && m.classification !== "good")
        .sort((a, b) => b.cpLoss - a.cpLoss)
        .slice(0, 8)
    : [];

  return (
    <section className="rounded-2xl border border-line bg-card p-5 sm:p-6">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Game insights</p>
          <h3 className="mt-0.5 text-lg font-semibold text-ink">{resultLabel}</h3>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-1.5 text-[11px] text-muted">
          {engine ? (
            <>
              <Stat label={`${white} acc`} value={`${engine.accuracyWhite}%`} />
              <Stat label={`${black} acc`} value={`${engine.accuracyBlack}%`} />
            </>
          ) : (
            <>
              <Stat label="moves" value={total} />
              <Stat label="captures" value={captures} />
              <Stat label="checks" value={checks} />
            </>
          )}
        </div>
      </div>

      {engine ? (
        <Curve
          values={engine.winWhite}
          mid={50}
          half={50}
          ply={ply}
          total={total}
          leftLabel={`${white} ▲`}
          rightLabel={`${black} ▼`}
          onSeek={onSeek}
        />
      ) : (
        <Curve
          values={material}
          mid={0}
          half={12}
          ply={ply}
          total={total}
          leftLabel={`${white} ▲`}
          rightLabel={`${black} ▼`}
          onSeek={onSeek}
        />
      )}

      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px]">
        <Phase label="Opening" n={phases.opening} />
        <Phase label="Middlegame" n={phases.middlegame} />
        <Phase label="Endgame" n={phases.endgame} />
        <span className="ml-auto" />
        {engineAvailable() && !engine && (
          <EngineButton onClick={runEngine} progress={progress} />
        )}
        {engine && (
          <span className="rounded-md bg-ink-soft px-2 py-0.5 text-muted">
            Stockfish · {engine.movetime}ms/move
          </span>
        )}
      </div>
      {engineErr && <p className="mt-2 text-xs text-accent">{engineErr}</p>}

      {/* Engine mistakes (precise) when analysed, else heuristic key moments. */}
      {engine ? (
        mistakes.length > 0 ? (
          <MomentList title="Biggest mistakes — click to jump there" onSeek={onSeek}>
            {mistakes.map((m, i) => (
              <EngineMoment key={i} m={m} onSeek={onSeek} />
            ))}
          </MomentList>
        ) : (
          <p className="mt-4 text-sm text-positive">Clean game — no clear mistakes found.</p>
        )
      ) : (
        keyMoments.length > 0 && (
          <MomentList title="Key moments — click to jump there" onSeek={onSeek}>
            {keyMoments.map((m, i) => (
              <HeuristicMoment key={i} m={m} onSeek={onSeek} />
            ))}
            <p className="mt-2 text-[11px] text-muted">
              Heuristic — “loose material” is a flag to check. Run the engine for verified accuracy.
            </p>
          </MomentList>
        )
      )}
    </section>
  );
}

function EngineButton({
  onClick,
  progress,
}: {
  onClick: () => void;
  progress: { done: number; total: number } | null;
}) {
  if (progress) {
    const pct = Math.round((progress.done / progress.total) * 100);
    return (
      <span className="flex items-center gap-2 rounded-md bg-ink-soft px-2 py-0.5 text-muted">
        <Loader2 size={12} className="animate-spin" />
        Analyzing… {progress.done}/{progress.total}
        <span className="h-1 w-16 overflow-hidden rounded-full bg-line">
          <span className="block h-full bg-ink" style={{ width: `${pct}%` }} />
        </span>
      </span>
    );
  }
  return (
    <button
      onClick={onClick}
      title="Run Stockfish on every move (in your browser) for real accuracy"
      className="flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1 text-xs font-medium transition-colors hover:bg-ink-soft"
    >
      <Cpu size={13} />
      Analyze with engine
    </button>
  );
}

function MomentList({
  title,
  children,
}: {
  title: string;
  onSeek: (ply: number) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-4">
      <p className="mb-2 text-xs font-medium text-muted">{title}</p>
      <div className="flex max-h-56 flex-col gap-1 overflow-y-auto pr-1">{children}</div>
    </div>
  );
}

const CLASS_TINT: Record<MoveClass, string> = {
  blunder: "text-accent",
  mistake: "text-accent/70",
  inaccuracy: "text-muted",
  good: "text-muted",
  best: "text-positive",
};
const CLASS_LABEL: Record<MoveClass, string> = {
  blunder: "Blunder",
  mistake: "Mistake",
  inaccuracy: "Inaccuracy",
  good: "Good",
  best: "Best",
};

function EngineMoment({ m, onSeek }: { m: EngineMove; onSeek: (ply: number) => void }) {
  const no = `${Math.floor(m.ply / 2) + 1}${m.side === "w" ? "." : "…"}`;
  return (
    <button
      onClick={() => onSeek(m.ply + 1)}
      className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-ink-soft"
    >
      <AlertTriangle size={15} className={`shrink-0 ${CLASS_TINT[m.classification]}`} />
      <span className="font-mono text-xs text-muted">{no}</span>
      <span className="font-mono font-semibold text-ink">{m.san}</span>
      <span className={`text-xs font-medium ${CLASS_TINT[m.classification]}`}>
        {CLASS_LABEL[m.classification]}
      </span>
      <span className="ml-auto font-mono text-[11px] text-muted">−{(m.cpLoss / 100).toFixed(1)}</span>
    </button>
  );
}

const MOMENT_ICON = { tactic: Sparkles, loose: AlertTriangle, mate: Crown } as const;
const MOMENT_TINT: Record<KeyMoment["kind"], string> = {
  tactic: "text-ink",
  loose: "text-accent",
  mate: "text-positive",
};

function HeuristicMoment({ m, onSeek }: { m: KeyMoment; onSeek: (ply: number) => void }) {
  const Icon = MOMENT_ICON[m.kind];
  const no = `${Math.floor(m.ply / 2) + 1}${m.side === "w" ? "." : "…"}`;
  return (
    <button
      onClick={() => onSeek(m.ply + 1)}
      className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-ink-soft"
    >
      <Icon size={15} className={`shrink-0 ${MOMENT_TINT[m.kind]}`} />
      <span className="font-mono text-xs text-muted">{no}</span>
      <span className="font-mono font-semibold text-ink">{m.san}</span>
      <span className="truncate text-muted">— {m.label}</span>
    </button>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <span className="rounded-md bg-ink-soft px-2 py-0.5">
      <span className="font-mono font-semibold text-ink">{value}</span> {label}
    </span>
  );
}

function Phase({ label, n }: { label: string; n: number }) {
  if (n === 0) return null;
  return (
    <span className="rounded-md bg-ink-soft px-2 py-0.5 text-muted">
      {label} <span className="font-mono text-ink">{n}</span>
    </span>
  );
}

// Generic advantage curve: a symmetric series around `mid` (± `half`), drawn as
// a stroke + zero baseline + a cursor at the current ply. Clicking seeks.
function Curve({
  values,
  mid,
  half,
  ply,
  total,
  leftLabel,
  rightLabel,
  onSeek,
}: {
  values: number[];
  mid: number;
  half: number;
  ply: number;
  total: number;
  leftLabel: string;
  rightLabel: string;
  onSeek: (ply: number) => void;
}) {
  const n = values.length;
  const W = 100;
  const H = 44;
  const midY = H / 2;
  const x = (i: number) => (n <= 1 ? 0 : (i / (n - 1)) * W);
  const y = (v: number) => midY - (Math.max(-half, Math.min(half, v - mid)) / half) * (midY - 3);
  const pts = values.map((v, i) => `${x(i).toFixed(2)},${y(v).toFixed(2)}`).join(" ");
  const cursorX = (total <= 0 ? 0 : Math.min(1, ply / total)) * W;

  return (
    <div className="relative">
      <div className="mb-1 flex justify-between text-[10px] uppercase tracking-wide text-muted">
        <span>{leftLabel}</span>
        <span>{rightLabel}</span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="h-16 w-full cursor-pointer rounded-lg bg-ink-soft/40"
        onClick={(e) => {
          const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
          const frac = (e.clientX - rect.left) / rect.width;
          onSeek(Math.round(frac * total));
        }}
      >
        <line x1="0" y1={midY} x2={W} y2={midY} stroke="currentColor" strokeWidth="0.3" className="text-line" strokeDasharray="1.5 1.5" />
        <polygon points={`0,${midY} ${pts} ${W},${midY}`} className="fill-accent/15" />
        <polyline points={pts} fill="none" className="stroke-ink" strokeWidth="0.8" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        <line x1={cursorX} y1="0" x2={cursorX} y2={H} stroke="currentColor" strokeWidth="0.5" className="text-accent" />
      </svg>
    </div>
  );
}
