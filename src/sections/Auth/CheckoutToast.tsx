import { useEffect, useState } from "react";
import { CheckCircle2, X } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { planName } from "@/lib/plans";
import { confirmPendingCheckout } from "@/lib/checkout";

// Handles the return from Polar's hosted checkout (`?checkout=success|cancel`).
// The plan itself updates live via the coach-doc listener once the webhook
// flips it — this is just the human-facing confirmation. We strip the query
// param so a refresh doesn't re-show it.
type Kind = "success" | "cancel" | null;

export function CheckoutToast() {
  const { user } = useAuth();
  const [kind, setKind] = useState<Kind>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const c = params.get("checkout");
    if (c === "success" || c === "cancel") {
      setKind(c);
      // Clean the URL without reloading.
      params.delete("checkout");
      const qs = params.toString();
      window.history.replaceState(
        {},
        "",
        window.location.pathname + (qs ? `?${qs}` : "") + window.location.hash,
      );
      // Verify the payment ourselves right away — don't wait on the webhook.
      // The coach-doc listener flips the UI to upgraded as soon as this lands.
      if (c === "success") void confirmPendingCheckout();
    }
  }, []);

  // Auto-dismiss the cancel notice; keep success until plan confirms or dismissed.
  useEffect(() => {
    if (kind === "cancel") {
      const t = setTimeout(() => setKind(null), 5000);
      return () => clearTimeout(t);
    }
  }, [kind]);

  if (!kind) return null;

  const upgraded = Boolean(user) && user?.plan !== "free";

  return (
    <div className="fixed bottom-5 left-1/2 z-[200] -translate-x-1/2 animate-fade-in">
      {kind === "success" ? (
        <div className="flex items-center gap-3 rounded-xl border border-positive/30 bg-card px-4 py-3 shadow-lg">
          {upgraded ? (
            <CheckCircle2 className="text-positive" size={20} />
          ) : (
            <span className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-line border-t-positive" />
          )}
          <div>
            <p className="text-sm font-bold">
              {upgraded ? "You’re upgraded 🎉" : "Finishing checkout…"}
            </p>
            <p className="text-xs text-muted">
              {upgraded
                ? `Your ${planName(user!.plan)} plan is active.`
                : "Your plan activates automatically once the payment clears."}
            </p>
          </div>
          <button
            onClick={() => setKind(null)}
            className="ml-2 rounded-md p-1 text-muted transition-colors hover:bg-ink-soft"
            aria-label="Dismiss"
          >
            <X size={15} />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-xl border border-line bg-card px-4 py-3 shadow-lg">
          <p className="text-sm text-muted">Checkout canceled — no charge made.</p>
          <button
            onClick={() => setKind(null)}
            className="rounded-md p-1 text-muted transition-colors hover:bg-ink-soft"
            aria-label="Dismiss"
          >
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
