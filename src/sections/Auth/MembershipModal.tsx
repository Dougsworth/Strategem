import { useState } from "react";
import { Check } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { PLANS } from "@/lib/plans";
import { firebaseEnabled } from "@/lib/firebase";
import { startCheckout } from "@/lib/checkout";
import type { Plan } from "@/lib/AuthContext";

export const MembershipModal = () => {
  const { user, membershipOpen, closeMembership, setPlan } = useAuth();
  const [busy, setBusy] = useState<Plan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDowngrade, setConfirmDowngrade] = useState(false);

  if (!membershipOpen || !user) return null;

  // Friendly name of the plan they'd be leaving behind.
  const currentName = PLANS.find((p) => p.id === user.plan)?.name ?? "your plan";

  async function choose(plan: Plan, price: number) {
    setError(null);
    // Real payment only for paid upgrades when Firebase is configured.
    if (firebaseEnabled && price > 0) {
      setBusy(plan);
      try {
        await startCheckout(plan, window.location.origin); // redirects away
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "Couldn’t start checkout. Try again.",
        );
        setBusy(null);
      }
      return;
    }
    // Moving down to the free plan from a paid one — pause for a soft goodbye.
    if (plan === "free" && user && user.plan !== "free") {
      setConfirmDowngrade(true);
      return;
    }
    // Already free, or mock/demo mode → switch locally.
    setPlan(plan);
  }

  function doDowngrade() {
    setConfirmDowngrade(false);
    setPlan("free");
  }

  return (
    <div
      className="fixed inset-0 z-[120] grid place-items-start overflow-y-auto bg-ink/50 p-4 backdrop-blur-sm sm:p-8"
      onClick={closeMembership}
    >
      <div
        className="mx-auto w-full max-w-6xl animate-fade-in rounded-2xl bg-card p-8 shadow-2xl ring-1 ring-line"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight">
              Membership
            </h2>
            <p className="mt-1 text-sm text-muted">
              Choose the plan that fits your coaching.
            </p>
          </div>
          <button
            onClick={closeMembership}
            className="rounded-lg bg-ink px-3 py-1.5 text-sm font-medium text-paper"
          >
            Close
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((plan) => {
            const current = plan.id === user.plan;
            return (
              <div
                key={plan.id}
                className={`relative flex flex-col rounded-2xl p-6 ring-1 ${
                  plan.recommended
                    ? "bg-ink text-paper ring-ink"
                    : "bg-card ring-line"
                }`}
              >
                {plan.recommended && (
                  <span className="absolute right-4 top-4 rounded-full bg-accent px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide text-paper">
                    Popular
                  </span>
                )}
                <p
                  className={`font-mono text-[11px] uppercase tracking-wide ${plan.recommended ? "text-paper/60" : "text-muted"}`}
                >
                  {plan.name}
                </p>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="font-display text-3xl font-bold tracking-tight">
                    ${plan.price}
                  </span>
                  <span
                    className={`text-sm ${plan.recommended ? "text-paper/60" : "text-muted"}`}
                  >
                    /mo
                  </span>
                </div>
                <p
                  className={`mt-1 text-sm ${plan.recommended ? "text-paper/70" : "text-muted"}`}
                >
                  {plan.tagline}
                </p>

                <ul className="mt-5 flex-1 space-y-2.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check
                        size={15}
                        className={`mt-0.5 shrink-0 ${plan.recommended ? "text-accent" : "text-positive"}`}
                      />
                      <span className={plan.recommended ? "text-paper/85" : "text-ink"}>
                        {f}
                      </span>
                    </li>
                  ))}
                </ul>

                <button
                  disabled={current || busy !== null}
                  onClick={() => choose(plan.id, plan.price)}
                  className={`mt-6 rounded-lg py-2.5 text-sm font-semibold transition-opacity hover:opacity-90 disabled:cursor-default disabled:opacity-60 ${
                    current
                      ? plan.recommended
                        ? "bg-paper/15 text-paper"
                        : "bg-ink-soft text-muted"
                      : plan.recommended
                        ? "bg-accent text-paper"
                        : "bg-ink text-paper"
                  }`}
                >
                  {busy === plan.id
                    ? "Starting checkout…"
                    : current
                      ? "Current plan"
                      : plan.price === 0
                        ? "Downgrade"
                        : `Upgrade to ${plan.name}`}
                </button>
              </div>
            );
          })}
        </div>

        {error && (
          <p className="mt-4 text-center text-xs text-accent">{error}</p>
        )}

        <p className="mt-6 text-center font-mono text-[10px] uppercase tracking-wide text-muted/60">
          {firebaseEnabled
            ? "Secure checkout via LuniPay · cancel anytime"
            : "Demo — plan switches are local until LuniPay is connected"}
        </p>
      </div>

      {confirmDowngrade && (
        <div
          className="fixed inset-0 z-[130] grid place-items-center bg-ink/60 p-4 backdrop-blur-sm"
          onClick={(e) => {
            e.stopPropagation();
            setConfirmDowngrade(false);
          }}
        >
          <div
            className="w-full max-w-md animate-fade-in rounded-2xl bg-card p-7 shadow-2xl ring-1 ring-line"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display text-xl font-bold tracking-tight">
              Sorry to see you go 💔
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              No hard feelings — you can come back any time, and{" "}
              <span className="font-semibold text-ink">your students, history, and report cards stay exactly where they are.</span>{" "}
              Going back to Starter, you’ll lose access to:
            </p>
            <ul className="mt-4 space-y-2 text-sm">
              {[
                "AI coach summaries & lesson plans",
                "Report-card PDFs",
                "Growth tracking over time",
                "Unlimited students (back to 1)",
              ].map((f) => (
                <li key={f} className="flex items-start gap-2 text-muted">
                  <span className="mt-0.5 text-accent">—</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-muted">
              The change is immediate, and you won’t be billed again.
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <button
                onClick={() => setConfirmDowngrade(false)}
                className="rounded-lg bg-ink py-2.5 text-sm font-semibold text-paper transition-opacity hover:opacity-90"
              >
                Keep my {currentName} plan
              </button>
              <button
                onClick={doDowngrade}
                className="rounded-lg py-2.5 text-sm font-medium text-muted transition-colors hover:bg-ink-soft"
              >
                Downgrade to Starter anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
