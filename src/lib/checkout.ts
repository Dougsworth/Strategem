import { getFirebase } from "./firebase";
import type { Plan } from "./AuthContext";

const PENDING_KEY = "strategem.pendingCheckout";

// Calls the createCheckout Cloud Function, then redirects the browser to the
// Polar hosted checkout page. The access token + charging all happen server-
// side; the client only ever receives a URL to send the coach to.
export async function startCheckout(plan: Plan, origin: string): Promise<void> {
  await getFirebase(); // ensures the Firebase app is initialized
  const { getApps } = await import("firebase/app");
  const { getFunctions, httpsCallable } = await import("firebase/functions");
  const app = getApps()[0];
  const fns = getFunctions(app);
  const call = httpsCallable<
    { plan: Plan; origin: string },
    { url?: string; id?: string }
  >(fns, "createCheckout");
  const res = await call({ plan, origin });
  const url = res.data?.url;
  if (!url) throw new Error("Checkout could not be started.");
  // Remember the session so we can confirm it instantly on return (no waiting
  // on the webhook). localStorage survives the round-trip (same origin).
  try {
    if (res.data?.id) localStorage.setItem(PENDING_KEY, res.data.id);
  } catch {
    /* ignore */
  }
  window.location.href = url;
}

// On return from Polar, verify the checkout server-side and flip the plan
// right away. Retries a few times in case the session is marked paid a beat
// late. Returns true once the plan is upgraded.
export async function confirmPendingCheckout(): Promise<boolean> {
  let sessionId = "";
  try {
    sessionId = localStorage.getItem(PENDING_KEY) ?? "";
  } catch {
    /* ignore */
  }
  if (!sessionId) return false;

  await getFirebase();
  const { getApps } = await import("firebase/app");
  const { getFunctions, httpsCallable } = await import("firebase/functions");
  const fns = getFunctions(getApps()[0]);
  const call = httpsCallable<
    { sessionId: string },
    { paid?: boolean; plan?: string }
  >(fns, "confirmCheckout");

  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await call({ sessionId });
      if (res.data?.paid && res.data?.plan) {
        try {
          localStorage.removeItem(PENDING_KEY);
        } catch {
          /* ignore */
        }
        return true;
      }
    } catch {
      /* transient — retry */
    }
    await new Promise((r) => setTimeout(r, 1200));
  }
  return false;
}
