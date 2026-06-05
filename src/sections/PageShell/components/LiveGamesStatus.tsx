import { useStudent } from "@/lib/StudentContext";

export const LiveGamesStatus = () => {
  const { roster } = useStudent();
  const count = roster.length;

  return (
    <div className="flex items-center gap-2 rounded-full bg-accent-soft px-3 py-1.5 ring-1 ring-accent/20">
      <span className="h-2 w-2 animate-pulse rounded-full bg-accent" />
      <span className="font-mono text-[11px] font-medium uppercase tracking-wide text-accent">
        {count} {count === 1 ? "Student" : "Students"} Tracked
      </span>
    </div>
  );
};
