import { useState } from "react";
import { Maximize2 } from "lucide-react";
import { useStudent } from "@/lib/StudentContext";
import { Sparkline } from "@/components/Sparkline";
import { RatingTrendModal } from "@/sections/DashboardMain/components/RatingTrendModal";

export const RatingDriftCard = () => {
  // Reads `profile` (not `report`) so the rating chart appears immediately,
  // before the heavy game analysis finishes.
  const { profile } = useStudent();
  const [open, setOpen] = useState(false);

  if (!profile) {
    return <div className="card h-full min-h-[220px] animate-pulse" />;
  }

  const up = profile.ratingDrift >= 0;
  const color = up ? "oklch(0.55 0.13 150)" : "oklch(0.56 0.19 38)";
  const hasData = profile.ratingHistory.length >= 2;

  return (
    <>
      <button
        type="button"
        onClick={() => hasData && setOpen(true)}
        disabled={!hasData}
        title={hasData ? "Click to enlarge" : undefined}
        className="card group flex h-full min-h-[220px] flex-col p-6 text-left transition-shadow hover:shadow-md disabled:cursor-default"
      >
        <div className="mb-3 flex items-center justify-between">
          <p className="eyebrow">Rating Trend</p>
          <div className="flex items-center gap-2">
            <span
              className={`font-mono text-xs font-bold ${up ? "text-positive" : "text-accent"}`}
            >
              {up ? "+" : ""}
              {profile.ratingDrift}
            </span>
            {hasData && (
              <Maximize2
                size={13}
                className="text-muted/50 transition-colors group-hover:text-muted"
              />
            )}
          </div>
        </div>
        <div className="flex flex-1 items-center">
          <Sparkline
            values={profile.ratingHistory.map((r) => r.rating)}
            stroke={color}
            height={96}
          />
        </div>
      </button>

      {open && (
        <RatingTrendModal
          history={profile.ratingHistory}
          drift={profile.ratingDrift}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
};
