import { useStudent } from "@/lib/StudentContext";

export const LiveGamesStatus = () => {
  const { roster } = useStudent();
  const count = roster.length;

  return (
    <div className="flex items-center gap-2 py-1.5">
      <span className="text-xs font-medium text-accent">
        {count} {count === 1 ? "Student" : "Students"} Tracked
      </span>
    </div>
  );
};
