import type { RatingPoint } from "@/lib/types";

// A big, detailed view of the rating curve: gridlines, min/max axis labels,
// every game as a point, and the key numbers (current / peak / low / change).
export const RatingTrendModal = ({
  history,
  drift,
  onClose,
}: {
  history: RatingPoint[];
  drift: number;
  onClose: () => void;
}) => {
  const ratings = history.map((h) => h.rating);
  const up = drift >= 0;

  // Chart geometry.
  const W = 820;
  const H = 320;
  const padL = 44;
  const padR = 16;
  const padT = 16;
  const padB = 28;
  const min = Math.min(...ratings);
  const max = Math.max(...ratings);
  const lo = min - 10;
  const hi = max + 10;
  const span = Math.max(1, hi - lo);
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const x = (i: number) =>
    padL + (ratings.length <= 1 ? 0 : (i / (ratings.length - 1)) * innerW);
  const y = (r: number) => padT + innerH - ((r - lo) / span) * innerH;

  const line = ratings.map((r, i) => `${x(i).toFixed(1)},${y(r).toFixed(1)}`).join(" ");
  const area = `${padL},${padT + innerH} ${line} ${(padL + innerW).toFixed(1)},${padT + innerH}`;

  // ~4 horizontal gridlines.
  const ticks = 4;
  const gridVals = Array.from({ length: ticks + 1 }, (_, i) =>
    Math.round(lo + (span * i) / ticks),
  );

  const stroke = up ? "#5f7d4f" : "#c0512b";
  const fmtDate = (ms: number) =>
    new Date(ms).toLocaleDateString(undefined, { month: "short", day: "numeric" });

  const current = ratings[ratings.length - 1];
  const stats = [
    { label: "Current", value: current },
    { label: "Peak", value: max },
    { label: "Low", value: min },
    { label: "Change", value: `${up ? "+" : ""}${drift}`, accent: true },
  ];

  return (
    <div
      className="fixed inset-0 z-[130] grid place-items-center bg-ink/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl animate-fade-in rounded-2xl bg-card p-7 shadow-2xl ring-1 ring-line"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="eyebrow">Rating Trend</p>
            <h2 className="mt-0.5 font-display text-xl font-bold tracking-tight">
              {history.length} games · {fmtDate(history[0].date)} –{" "}
              {fmtDate(history[history.length - 1].date)}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg bg-ink px-3 py-1.5 text-sm font-medium text-paper"
          >
            Close
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-xl bg-ink-soft/60 p-3">
              <p className="font-mono text-[10px] uppercase tracking-wide text-muted">
                {s.label}
              </p>
              <p
                className={`mt-0.5 font-display text-xl font-bold tracking-tight ${
                  s.accent ? (up ? "text-positive" : "text-accent") : ""
                }`}
              >
                {s.value}
              </p>
            </div>
          ))}
        </div>

        <svg viewBox={`0 0 ${W} ${H}`} className="mt-5 w-full">
          {gridVals.map((v) => {
            const gy = y(v);
            return (
              <g key={v}>
                <line
                  x1={padL}
                  x2={W - padR}
                  y1={gy}
                  y2={gy}
                  stroke="currentColor"
                  className="text-line"
                  strokeWidth={1}
                />
                <text
                  x={padL - 8}
                  y={gy + 3}
                  textAnchor="end"
                  className="fill-muted font-mono"
                  fontSize="10"
                >
                  {v}
                </text>
              </g>
            );
          })}

          <polygon points={area} fill={up ? "rgba(95,125,79,0.12)" : "rgba(192,81,43,0.12)"} />
          <polyline
            points={line}
            fill="none"
            stroke={stroke}
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {ratings.map((r, i) => (
            <circle key={i} cx={x(i)} cy={y(r)} r={2.5} fill={stroke} />
          ))}

          <text
            x={padL}
            y={H - 8}
            className="fill-muted font-mono"
            fontSize="10"
          >
            {fmtDate(history[0].date)}
          </text>
          <text
            x={W - padR}
            y={H - 8}
            textAnchor="end"
            className="fill-muted font-mono"
            fontSize="10"
          >
            {fmtDate(history[history.length - 1].date)}
          </text>
        </svg>

        <p className="mt-2 text-center font-mono text-[10px] uppercase tracking-wide text-muted/50">
          Each dot is a recorded rating point
        </p>
      </div>
    </div>
  );
};
