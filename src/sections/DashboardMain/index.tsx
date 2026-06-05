import { ActiveRoster } from "@/sections/DashboardMain/components/ActiveRoster";
import { QuickStartGuide } from "@/sections/DashboardMain/components/QuickStartGuide";
import { PlayerOverview } from "@/sections/DashboardMain/components/PlayerOverview";
import { LastGameCard } from "@/sections/DashboardMain/components/LastGameCard";
import { InsightCards } from "@/sections/DashboardMain/components/InsightCards";
import { TacticalDiagnostic } from "@/sections/DashboardMain/components/TacticalDiagnostic";
import { MistakePractice } from "@/sections/DashboardMain/components/MistakePractice";
import { CurationEngine } from "@/sections/DashboardMain/components/CurationEngine";
import { TrainingPlan } from "@/sections/DashboardMain/components/TrainingPlan";
import { AnalyticsView } from "@/sections/DashboardMain/components/AnalyticsView";
import { Upsell } from "@/sections/DashboardMain/components/Upsell";
import { LabView } from "@/sections/Lab/LabView";
import { Loader } from "@/components/Loader";
import { useStudent } from "@/lib/StudentContext";
import { useView } from "@/lib/ViewContext";
import { useAuth } from "@/lib/AuthContext";
import { entitlements } from "@/lib/entitlements";

export const DashboardMain = () => {
  const { selected, rosterLoading, report, reportLoading, profile } = useStudent();
  const { view } = useView();
  const { user } = useAuth();
  const ent = entitlements(user?.plan);
  const firstName = profile?.displayName?.split(/\s+/)[0];

  return (
    <main className="mx-auto grid max-w-[1600px] grid-cols-12 gap-8 px-6 py-8">
      <ActiveRoster />
      <div className="col-span-12 md:col-span-9">
        {view === "lab" ? (
          <LabView />
        ) : selected ? (
          <div className="space-y-8">
            {view === "roster" && (
              <>
                <QuickStartGuide />
                <PlayerOverview />
                {report ? (
                  <>
                    <LastGameCard />
                    <InsightCards />
                    <TacticalDiagnostic />
                  </>
                ) : (
                  reportLoading && (
                    <Loader
                      label={`Analyzing ${firstName ?? "their"}’s games`}
                    />
                  )
                )}
              </>
            )}

            {view === "curriculum" &&
              (ent.curriculum ? (
                <>
                  <TrainingPlan />
                  <MistakePractice />
                  <CurationEngine />
                </>
              ) : (
                <Upsell
                  title="Curriculum"
                  blurb="Turn the analysis into a plan. Strategem builds each student a personalized training roadmap from their real weaknesses."
                  bullets={[
                    "Prioritized focus areas — what to fix first, and why",
                    "Drills on their actual blunders + targeted puzzle sets",
                    "A realistic weekly training routine",
                  ]}
                />
              ))}

            {view === "analytics" &&
              (ent.analytics ? (
                <AnalyticsView />
              ) : (
                <Upsell
                  title="Analytics"
                  blurb="The deep dive coaches pay for — how a student is trending, how steady they are, and the mindset behind their mistakes."
                  bullets={[
                    "Game-by-game growth curve",
                    "Consistency score — a real focus & tilt signal",
                    "Mindset signals: each mistake + the habit that fixes it",
                  ]}
                />
              ))}
          </div>
        ) : (
          !rosterLoading && (
            <div className="grid min-h-[60vh] place-items-center rounded-2xl border border-dashed border-line">
              <div className="max-w-sm text-center">
                <h2 className="font-display text-2xl font-bold tracking-tight">
                  Analyze any Lichess player
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  Paste a profile or game URL in the roster to pull their recent
                  games, diagnose strengths and weaknesses, and generate a
                  targeted training plan.
                </p>
              </div>
            </div>
          )
        )}
      </div>
    </main>
  );
};
