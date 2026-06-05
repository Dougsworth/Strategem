import { useMemo } from "react";

// Minimal, dependency-free line chart for a series of numbers.
export const Sparkline = ({
  values,
  stroke = "oklch(0.56 0.19 38)",
  fill = true,
  width = 260,
  height = 80,
  className,
}: {
  values: number[];
  stroke?: string;
  fill?: boolean;
  width?: number;
  height?: number;
  className?: string;
}) => {
  const paths = useMemo(() => {
    if (values.length < 2) return null;
    const pad = 5;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1;
    const stepX = (width - pad * 2) / (values.length - 1);
    const pts = values.map((v, i) => {
      const x = pad + i * stepX;
      const y = pad + (1 - (v - min) / span) * (height - pad * 2);
      return [x, y] as const;
    });
    const line = pts.map(([x, y]) => `${x},${y}`).join(" ");
    const area = `M ${pts[0][0]},${height - pad} ${pts
      .map(([x, y]) => `L ${x},${y}`)
      .join(" ")} L ${pts[pts.length - 1][0]},${height - pad} Z`;
    return { line, area };
  }, [values, width, height]);

  if (!paths) {
    return (
      <div
        className={`grid place-items-center text-xs text-muted ${className ?? ""}`}
        style={{ height }}
      >
        Not enough data yet.
      </div>
    );
  }

  const gradId = `spark-${stroke.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={`w-full ${className ?? ""}`}
      preserveAspectRatio="none"
      style={{ height }}
    >
      {fill && (
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity="0.18" />
            <stop offset="100%" stopColor={stroke} stopOpacity="0" />
          </linearGradient>
        </defs>
      )}
      {fill && <path d={paths.area} fill={`url(#${gradId})`} />}
      <polyline
        points={paths.line}
        fill="none"
        stroke={stroke}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
};
