import { useState } from "react";
import { X, ClipboardList, GraduationCap, LineChart } from "lucide-react";
import { useView, type View } from "@/lib/ViewContext";

const KEY = "strategem.guide.dismissed.v1";

// A friendly, dismissible map of the page so a first-time coach knows where to
// go. The three cards jump straight to the tab they describe.
export const QuickStartGuide = () => {
  const { setView } = useView();
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(KEY) === "1";
    } catch {
      return false;
    }
  });

  if (dismissed) return null;

  function close() {
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      /* ignore */
    }
    setDismissed(true);
  }

  const cards: {
    icon: typeof ClipboardList;
    label: string;
    tab: View | "report";
    body: string;
  }[] = [
    {
      icon: ClipboardList,
      label: "Roster",
      tab: "roster",
      body: "This page — the snapshot. Strengths by phase, the mistakes they repeat, and their rating trend.",
    },
    {
      icon: GraduationCap,
      label: "Curriculum",
      tab: "curriculum",
      body: "Their personalized training plan: what to fix first, drills on their real blunders, and targeted puzzles.",
    },
    {
      icon: LineChart,
      label: "Analytics",
      tab: "analytics",
      body: "The deep dive — growth curve, how consistent they are, and the mindset behind their mistakes.",
    },
  ];

  return (
    <div className="relative rounded-2xl border border-line bg-card p-5">
      <button
        onClick={close}
        className="absolute right-3 top-3 rounded-md p-1 text-muted transition-colors hover:bg-ink-soft"
        aria-label="Dismiss guide"
      >
        <X size={16} />
      </button>
      <p className="eyebrow">New here?</p>
      <h3 className="mt-0.5 font-display text-lg font-bold tracking-tight">
        Where everything lives
      </h3>
      <p className="mt-1 text-sm text-muted">
        Three tabs up top, each with a job. Tap one to jump there — or hit{" "}
        <span className="font-semibold text-ink">Report Card</span> (top-right) for
        a shareable summary.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {cards.map((c) => (
          <button
            key={c.label}
            onClick={() => c.tab !== "report" && setView(c.tab)}
            className="rounded-xl bg-ink-soft/60 p-4 text-left transition-colors hover:bg-ink-soft"
          >
            <div className="flex items-center gap-2">
              <c.icon size={16} className="text-accent" />
              <span className="font-semibold">{c.label}</span>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted">{c.body}</p>
          </button>
        ))}
      </div>
    </div>
  );
};
