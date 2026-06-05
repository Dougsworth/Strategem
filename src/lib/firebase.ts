import type { Auth, GoogleAuthProvider as GP } from "firebase/auth";
import type { Firestore } from "firebase/firestore";

// Gated Firebase access. Firebase only initializes when the VITE_FIREBASE_*
// env vars are present, so the app runs as a $0 local mock until you add a
// (free) Firebase config. The SDK is dynamically imported, so none of it ships
// in the bundle until it's actually configured.

const cfg = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
};

export const firebaseEnabled = Boolean(cfg.apiKey && cfg.projectId && cfg.appId);

export interface FirebaseHandles {
  auth: Auth;
  db: Firestore;
  googleProvider: GP;
}

let cached: Promise<FirebaseHandles> | null = null;

/** Lazily initialize Firebase (auth + firestore). Throws if not configured. */
export function getFirebase(): Promise<FirebaseHandles> {
  if (!firebaseEnabled) {
    return Promise.reject(new Error("Firebase is not configured."));
  }
  if (!cached) {
    cached = (async () => {
      const { initializeApp, getApps } = await import("firebase/app");
      const { getAuth, GoogleAuthProvider } = await import("firebase/auth");
      const { getFirestore } = await import("firebase/firestore");
      const app = getApps()[0] ?? initializeApp(cfg as Record<string, string>);
      return {
        auth: getAuth(app),
        db: getFirestore(app),
        googleProvider: new GoogleAuthProvider(),
      };
    })();
  }
  return cached;
}
