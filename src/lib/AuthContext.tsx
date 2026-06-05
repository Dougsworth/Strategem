import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { firebaseEnabled } from "./firebase";
import {
  fbSignInEmail,
  fbSignInGoogle,
  fbSignOut,
  fbSignUpEmail,
  fbSelfDowngrade,
  fbSetBranding,
  fbCreateClub,
  fbJoinClub,
  fbLeaveClub,
  fbSubscribe,
  type Branding,
} from "./firebaseAuth";

// Front-end auth + membership. Currently a LOCAL MOCK (persisted to
// localStorage) so the whole flow is clickable at $0 — no backend, no provider.
// Swap signIn/signUp/signOut for Clerk or Supabase Auth later without touching
// the UI: they consume this same context shape.

export type Plan = "free" | "pro" | "team" | "club";

export interface AuthUser {
  /** Firebase uid when signed in for real; absent in local mock mode. */
  uid?: string;
  name: string;
  email: string;
  plan: Plan;
  since: number;
  /** Studio branding (Academy/Club) shown on report cards. */
  studioName?: string;
  logoUrl?: string;
  /** The club this coach belongs to (shared roster), if any. */
  clubId?: string;
}

interface AuthValue {
  user: AuthUser | null;
  ready: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  /** OAuth sign-in. Mock today; maps to Firebase/Supabase Google provider later. */
  signInWithGoogle: () => Promise<void>;
  signOut: () => void;
  setPlan: (plan: Plan) => void;
  /** Update studio branding (name / logo URL). */
  setBranding: (branding: Branding) => void;
  /** Club (shared roster) actions — real-Firebase only. */
  createClub: () => Promise<{ clubId: string; inviteCode: string }>;
  joinClub: (code: string) => Promise<void>;
  leaveClub: () => Promise<void>;
  membershipOpen: boolean;
  openMembership: () => void;
  closeMembership: () => void;
}

const KEY = "strategem.auth.v1";
const AuthContext = createContext<AuthValue | null>(null);

function nameFromEmail(email: string): string {
  const handle = email.split("@")[0] ?? "Coach";
  return handle.charAt(0).toUpperCase() + handle.slice(1);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);
  const [membershipOpen, setMembershipOpen] = useState(false);

  // REAL MODE: subscribe to Firebase auth. MOCK MODE: hydrate from localStorage.
  useEffect(() => {
    if (firebaseEnabled) {
      let unsub = () => {};
      let cancelled = false;
      fbSubscribe((u) => {
        setUser(u);
        setReady(true);
      })
        .then((fn) => {
          if (cancelled) fn();
          else unsub = fn;
        })
        .catch(() => setReady(true));
      return () => {
        cancelled = true;
        unsub();
      };
    }
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setUser(JSON.parse(raw) as AuthUser);
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  // Mock-only persistence (Firebase manages its own session).
  const persist = useCallback((u: AuthUser | null) => {
    setUser(u);
    try {
      if (u) localStorage.setItem(KEY, JSON.stringify(u));
      else localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const validate = (email: string, password: string) => {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
      throw new Error("Enter a valid email address.");
    if (password.length < 6)
      throw new Error("Password must be at least 6 characters.");
  };

  const signIn = useCallback(
    async (email: string, password: string) => {
      validate(email, password);
      if (firebaseEnabled) {
        await fbSignInEmail(email, password); // onAuthStateChanged sets the user
        return;
      }
      persist({ name: nameFromEmail(email), email, plan: "free", since: Date.now() });
    },
    [persist],
  );

  const signUp = useCallback(
    async (name: string, email: string, password: string) => {
      validate(email, password);
      if (firebaseEnabled) {
        await fbSignUpEmail(name, email, password);
        return;
      }
      persist({
        name: name.trim() || nameFromEmail(email),
        email,
        plan: "free",
        since: Date.now(),
      });
    },
    [persist],
  );

  const signInWithGoogle = useCallback(async () => {
    if (firebaseEnabled) {
      await fbSignInGoogle(); // real Google OAuth popup
      return;
    }
    // MOCK: simulate a Google result; same shape, so the UI is identical.
    persist({
      name: "Demo Coach",
      email: "coach@gmail.com",
      plan: "free",
      since: Date.now(),
    });
  }, [persist]);

  const signOut = useCallback(() => {
    if (firebaseEnabled) {
      void fbSignOut();
      return;
    }
    persist(null);
  }, [persist]);

  const setPlan = useCallback(
    (plan: Plan) =>
      setUser((u) => {
        if (!u) return u;
        const next = { ...u, plan };
        if (firebaseEnabled && u.uid) {
          // Real mode: plan is server-controlled. Only self-downgrade to free is
          // allowed here; the coach-doc listener confirms it. Upgrades go through
          // paid checkout + webhook, never this path.
          if (plan === "free") void fbSelfDowngrade();
        } else {
          try {
            localStorage.setItem(KEY, JSON.stringify(next));
          } catch {
            /* ignore */
          }
        }
        return next;
      }),
    [],
  );

  const setBranding = useCallback(
    (branding: Branding) =>
      setUser((u) => {
        if (!u) return u;
        const next = { ...u, studioName: branding.studioName, logoUrl: branding.logoUrl };
        if (firebaseEnabled && u.uid) {
          void fbSetBranding(u.uid, branding); // listener confirms it
        } else {
          try {
            localStorage.setItem(KEY, JSON.stringify(next));
          } catch {
            /* ignore */
          }
        }
        return next;
      }),
    [],
  );

  const requireReal = () => {
    if (!firebaseEnabled) throw new Error("Clubs need an account — sign in first.");
  };
  const createClub = useCallback(async () => {
    requireReal();
    return fbCreateClub(); // the coach-doc listener picks up clubId
  }, []);
  const joinClub = useCallback(async (code: string) => {
    requireReal();
    await fbJoinClub(code);
  }, []);
  const leaveClub = useCallback(async () => {
    requireReal();
    await fbLeaveClub();
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      user,
      ready,
      signIn,
      signUp,
      signInWithGoogle,
      signOut,
      setPlan,
      setBranding,
      createClub,
      joinClub,
      leaveClub,
      membershipOpen,
      openMembership: () => setMembershipOpen(true),
      closeMembership: () => setMembershipOpen(false),
    }),
    [user, ready, signIn, signUp, signInWithGoogle, signOut, setPlan, setBranding, createClub, joinClub, leaveClub, membershipOpen],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
