import { getFirebase } from "./firebase";
import type { AuthUser, Plan } from "./AuthContext";

// Real auth + coach-record persistence on Firebase, behind the same shape the
// mock uses. Each coach is a Firestore doc at `coaches/{uid}` holding their
// plan (and, later, roster/snapshots — same doc). Everything is dynamically
// imported so Firebase only loads when configured.

function nameFromEmail(email: string | null): string {
  const handle = (email ?? "coach").split("@")[0];
  return handle.charAt(0).toUpperCase() + handle.slice(1);
}

interface CoachDoc {
  plan: Plan;
  name: string;
  createdAt: number;
  branding?: { studioName?: string; logoUrl?: string };
  /** Set when this coach belongs to a club (shared roster). Server-controlled. */
  clubId?: string;
}

// Call a callable Cloud Function and return its data payload.
async function callFn<T = unknown>(name: string, data?: unknown): Promise<T> {
  const { getApps } = await import("firebase/app");
  const { getFunctions, httpsCallable } = await import("firebase/functions");
  await getFirebase();
  const fns = getFunctions(getApps()[0]);
  const res = await httpsCallable(fns, name)(data);
  return res.data as T;
}

export async function fbCreateClub(): Promise<{ clubId: string; inviteCode: string }> {
  return callFn("createClub");
}
export async function fbJoinClub(code: string): Promise<{ clubId: string }> {
  return callFn("joinClub", { code });
}
export async function fbLeaveClub(): Promise<void> {
  await callFn("leaveClub");
}

export interface ClubInfo {
  name: string;
  inviteCode: string;
  ownerUid: string;
  memberUids: string[];
}

export async function fbGetClub(clubId: string): Promise<ClubInfo | null> {
  const { db } = await getFirebase();
  const { doc, getDoc } = await import("firebase/firestore");
  const snap = await getDoc(doc(db, "clubs", clubId));
  return snap.exists() ? (snap.data() as ClubInfo) : null;
}

export interface Branding {
  studioName?: string;
  logoUrl?: string;
}

// Save studio branding (Academy/Club). Allowed by the rules — branding isn't
// a server-only field like plan/usage.
export async function fbSetBranding(uid: string, branding: Branding): Promise<void> {
  const { db } = await getFirebase();
  const { doc, setDoc } = await import("firebase/firestore");
  await setDoc(doc(db, "coaches", uid), { branding }, { merge: true });
}

async function loadOrCreateCoach(
  uid: string,
  fallbackName: string,
): Promise<CoachDoc> {
  const { db } = await getFirebase();
  const { doc, getDoc, setDoc } = await import("firebase/firestore");
  const ref = doc(db, "coaches", uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return snap.data() as CoachDoc;
  const fresh: CoachDoc = { plan: "free", name: fallbackName, createdAt: Date.now() };
  await setDoc(ref, fresh);
  return fresh;
}

export async function fbSignInGoogle(): Promise<void> {
  const { auth, googleProvider } = await getFirebase();
  const { signInWithPopup } = await import("firebase/auth");
  await signInWithPopup(auth, googleProvider);
}

export async function fbSignInEmail(email: string, password: string): Promise<void> {
  const { auth } = await getFirebase();
  const { signInWithEmailAndPassword } = await import("firebase/auth");
  await signInWithEmailAndPassword(auth, email, password);
}

export async function fbSignUpEmail(
  name: string,
  email: string,
  password: string,
): Promise<void> {
  const { auth } = await getFirebase();
  const { createUserWithEmailAndPassword, updateProfile } = await import("firebase/auth");
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  if (name.trim()) await updateProfile(cred.user, { displayName: name.trim() });
  await loadOrCreateCoach(cred.user.uid, name.trim() || nameFromEmail(email));
}

export async function fbSignOut(): Promise<void> {
  const { auth } = await getFirebase();
  const { signOut } = await import("firebase/auth");
  await signOut(auth);
}

// Downgrade to free. Plan is server-only (Firestore rules block client plan
// writes), so this goes through the selfDowngrade callable. Upgrades happen via
// paid checkout, never here.
export async function fbSelfDowngrade(): Promise<void> {
  await callFn("selfDowngrade");
}

/**
 * Subscribe to auth state. Resolves with an unsubscribe function. The callback
 * receives a mapped AuthUser (with plan loaded from Firestore) or null.
 *
 * The coach doc is LIVE-LISTENED (onSnapshot), not read once — so when the
 * payment webhook flips `coaches/{uid}.plan` to "pro"/"team", the change lands
 * in the running app within a second, no reload needed.
 */
export async function fbSubscribe(
  cb: (user: AuthUser | null) => void,
): Promise<() => void> {
  const { auth, db } = await getFirebase();
  const { onAuthStateChanged } = await import("firebase/auth");
  const { doc, onSnapshot, getDoc, setDoc } = await import("firebase/firestore");

  let unsubDoc = () => {};

  const unsubAuth = onAuthStateChanged(auth, async (fbUser) => {
    unsubDoc(); // tear down any previous coach-doc listener
    unsubDoc = () => {};

    if (!fbUser) {
      cb(null);
      return;
    }
    const name = fbUser.displayName ?? nameFromEmail(fbUser.email);
    const ref = doc(db, "coaches", fbUser.uid);

    // Ensure the coach doc exists on first sign-in, then live-listen to it.
    try {
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        await setDoc(ref, { plan: "free", name, createdAt: Date.now() });
      }
    } catch {
      /* offline / rules — the listener below still drives the UI */
    }

    unsubDoc = onSnapshot(
      ref,
      (snap) => {
        const coach = (snap.data() as Partial<CoachDoc> | undefined) ?? {};
        cb({
          uid: fbUser.uid,
          name: coach.name || name,
          email: fbUser.email ?? "",
          plan: coach.plan ?? "free",
          since: coach.createdAt ?? Date.now(),
          studioName: coach.branding?.studioName,
          logoUrl: coach.branding?.logoUrl,
          clubId: coach.clubId,
        });
      },
      () => {
        // Listener error → still surface a usable (free) user so the app loads.
        cb({
          uid: fbUser.uid,
          name,
          email: fbUser.email ?? "",
          plan: "free",
          since: Date.now(),
        });
      },
    );
  });

  return () => {
    unsubDoc();
    unsubAuth();
  };
}
