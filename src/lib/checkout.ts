import { getFirebase } from "./firebase";
import type { Plan } from "./AuthContext";

// Calls the createCheckout Cloud Function, then redirects the browser to the
// LuniPay hosted checkout page. The secret key + charging all happen server-
// side; the client only ever receives a URL to send the coach to.
export async function startCheckout(plan: Plan, origin: string): Promise<void> {
  await getFirebase(); // ensures the Firebase app is initialized
  const { getApps } = await import("firebase/app");
  const { getFunctions, httpsCallable } = await import("firebase/functions");
  const app = getApps()[0];
  const fns = getFunctions(app);
  const call = httpsCallable<
    { plan: Plan; origin: string },
    { url?: string }
  >(fns, "createCheckout");
  const res = await call({ plan, origin });
  const url = res.data?.url;
  if (!url) throw new Error("Checkout could not be started.");
  window.location.href = url;
}
