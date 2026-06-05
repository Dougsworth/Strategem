import { PhaseStrengthCard } from "@/sections/DashboardMain/components/PhaseStrengthCard";
import { RecurringErrorsCard } from "@/sections/DashboardMain/components/RecurringErrorsCard";
import { RatingDriftCard } from "@/sections/DashboardMain/components/RatingDriftCard";

export const InsightCards = () => {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      <PhaseStrengthCard />
      <RecurringErrorsCard />
      <RatingDriftCard />
    </div>
  );
};
