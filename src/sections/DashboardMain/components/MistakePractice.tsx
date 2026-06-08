import { useEffect, useMemo, useState } from "react";
import { Target, CheckCircle2 } from "lucide-react";
import { useStudent } from "@/lib/StudentContext";
import { useAuth } from "@/lib/AuthContext";
import { timeUntil } from "@/lib/format";
import {
  syncMistakes,
  buildQueue,
  nextDueAt,
  recordReview,
  pullLibrary,
  pushLibrary,
  type Library,
} from "@/lib/srsStore";
import type { Grade } from "@/lib/fsrs";
import { MistakeTrainer } from "@/sections/Trainer/MistakeTrainer";

// Spaced-repetition review of the student's OWN mistakes. Every position where
// a stronger move existed becomes a flashcard, scheduled by FSRS to resurface
// right before they'd forget it — the retention loop, not a one-shot drill.

export const MistakePractice = () => {
  const { report, reportLoading } = useStudent();
  const { user } = useAuth();
  const uid = user?.uid;
  const [open, setOpen] = useState(false);
  const [lib, setLib] = useState<Library>({});

  // Fold the latest mistakes into the library whenever the report changes, and
  // (signed in) merge the cross-device schedule from Firestore first.
  useEffect(() => {
    if (!report) {
      setLib({});
      return;
    }
    let cancelled = false;
    const username = report.username;
    // Instant: local cache + any new mistakes from this report.
    setLib(syncMistakes(report));
    // Then reconcile with the cloud and push the merged result back.
    (async () => {
      await pullLibrary(uid, username); // merges remote into local cache
      const merged = syncMistakes(report); // re-fold mistakes over the merge
      if (cancelled) return;
      setLib(merged);
      void pushLibrary(uid, username);
    })();
    return () => {
      cancelled = true;
    };
  }, [report, uid]);

  const queue = useMemo(() => buildQueue(lib), [lib]);
  const upcoming = useMemo(() => nextDueAt(lib), [lib]);

  // Snapshot the session at open so it stays stable while the trainer is up.
  const [session, setSession] = useState(queue.session);

  if (reportLoading || !report || Object.keys(lib).length === 0) return null;

  const firstName = report.displayName.split(/\s+/)[0];
  const dueCount = queue.due.length;
  const newCount = queue.fresh.length;
  const nothingToReview = queue.session.length === 0;

  function startReview() {
    setSession(queue.session);
    setOpen(true);
  }

  function handleGrade(index: number, grade: Grade) {
    const card = session[index];
    if (!card || !report) return;
    const updated = recordReview(report.username, card.id, grade);
    if (updated) setLib((prev) => ({ ...prev, [updated.id]: updated }));
  }

  function endReview() {
    setOpen(false);
    if (report) void pushLibrary(uid, report.username); // sync the session's reviews
  }

  // All caught up — nothing due, no new cards. Show a calm "come back later" state.
  if (nothingToReview) {
    return (
      <section className="rounded-2xl border border-line bg-paper p-7">
        <div className="flex items-start gap-4">
          <span className="mt-0.5 grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-positive/15 text-positive">
            <CheckCircle2 size={20} />
          </span>
          <div>
            <h3 className="font-display text-xl font-bold tracking-tight">
              {firstName} is all caught up
            </h3>
            <p className="mt-1 max-w-md text-sm leading-relaxed text-muted">
              Every mistake position is reviewed for now.{" "}
              {upcoming
                ? `Next review ${timeUntil(upcoming)}.`
                : "New mistakes will appear here after their next games."}
            </p>
          </div>
        </div>
      </section>
    );
  }

  const parts = [
    dueCount > 0 ? `${dueCount} due` : null,
    newCount > 0 ? `${newCount} new` : null,
  ].filter(Boolean);

  return (
    <section className="overflow-hidden rounded-2xl bg-accent text-paper">
      <div className="flex flex-col items-start justify-between gap-5 p-7 sm:flex-row sm:items-center">
        <div className="flex items-start gap-4">
          <span className="mt-0.5 grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-paper/15">
            <Target size={20} />
          </span>
          <div>
            <h3 className="font-display text-xl font-bold tracking-tight">
              Review {firstName}’s mistakes
            </h3>
            <p className="mt-1 max-w-md text-sm leading-relaxed text-paper/85">
              {parts.join(" · ")} — positions from {firstName}’s real games,
              resurfaced right before they’d slip. Re-solving the exact moments
              they got wrong is the most effective way to improve.
            </p>
          </div>
        </div>
        <button
          onClick={startReview}
          className="shrink-0 rounded-lg bg-paper px-5 py-2.5 text-sm font-bold text-ink transition-transform hover:-translate-y-px active:scale-[0.99]"
        >
          Start review →
        </button>
      </div>

      {open && (
        <MistakeTrainer
          items={session.map((c) => c.ev)}
          studentName={firstName}
          srsMode
          onGrade={handleGrade}
          onClose={endReview}
        />
      )}
    </section>
  );
};
