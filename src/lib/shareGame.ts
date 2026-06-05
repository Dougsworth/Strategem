import { firebaseEnabled, getFirebase } from "./firebase";

// Share links for scanned games. When Firebase is on we store the game and hand
// out a clean short link (`?g=Xa3kP9q`); otherwise the whole game travels inside
// the URL (base64url of {w,b,p}) so it still works with no backend. Produced by
// the viewer's Share button; resolved on load by ScannedGamesProvider.

export interface SharedGame {
  white: string;
  black: string;
  pgn: string;
}

const PARAM = "g";

// URL-safe base64 of UTF-8 text (handles names like "White – Black").
function toB64Url(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromB64Url(s: string): string {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

export function encodeShare(g: SharedGame): string {
  return toB64Url(JSON.stringify({ w: g.white, b: g.black, p: g.pgn }));
}

export function decodeShare(param: string): SharedGame | null {
  try {
    const o = JSON.parse(fromB64Url(param)) as { w?: unknown; b?: unknown; p?: unknown };
    if (typeof o.p !== "string" || !o.p.trim()) return null;
    return {
      white: typeof o.w === "string" && o.w ? o.w : "White",
      black: typeof o.b === "string" && o.b ? o.b : "Black",
      pgn: o.p,
    };
  } catch {
    return null;
  }
}

// ---- Short links backed by Firestore (the clean path) ----------------------

const ID_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
function shortId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(9));
  let s = "";
  for (const b of bytes) s += ID_CHARS[b % ID_CHARS.length];
  return s;
}
// A short Firestore id, vs a long self-contained base64 blob (always ≥ ~40 chars).
const SHORT_ID = /^[A-Za-z0-9]{6,16}$/;

async function putShared(g: SharedGame): Promise<string> {
  const { db } = await getFirebase();
  const { doc, setDoc, serverTimestamp } = await import("firebase/firestore");
  const id = shortId();
  await setDoc(doc(db, "sharedGames", id), {
    w: g.white,
    b: g.black,
    p: g.pgn,
    createdAt: serverTimestamp(),
  });
  return id;
}

async function getShared(id: string): Promise<SharedGame | null> {
  const { db } = await getFirebase();
  const { doc, getDoc } = await import("firebase/firestore");
  const snap = await getDoc(doc(db, "sharedGames", id));
  if (!snap.exists()) return null;
  const d = snap.data() as { w?: string; b?: string; p?: string };
  if (typeof d.p !== "string" || !d.p.trim()) return null;
  return { white: d.w || "White", black: d.b || "Black", pgn: d.p };
}

/** Build a shareable link — a clean short link when Firebase is on, else a
 *  self-contained (long) link that needs no backend. */
export async function createShareUrl(g: SharedGame): Promise<string> {
  const { origin, pathname } = window.location;
  if (firebaseEnabled) {
    try {
      const id = await putShared(g);
      return `${origin}${pathname}?${PARAM}=${id}`;
    } catch {
      /* storage failed — fall back to the self-contained link below */
    }
  }
  return `${origin}${pathname}?${PARAM}=${encodeShare(g)}`;
}

/** Resolve a shared game from the URL (and clear the param). Async because a
 *  short id is fetched from Firestore; a long blob decodes locally. */
export async function resolveSharedFromUrl(): Promise<SharedGame | null> {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get(PARAM);
  if (!raw) return null;
  // Clear the param immediately so a refresh / re-render doesn't re-trigger.
  params.delete(PARAM);
  const qs = params.toString();
  window.history.replaceState(
    {},
    "",
    window.location.pathname + (qs ? `?${qs}` : "") + window.location.hash,
  );
  if (SHORT_ID.test(raw) && firebaseEnabled) {
    try {
      return await getShared(raw);
    } catch {
      return null;
    }
  }
  return decodeShare(raw); // self-contained (long) link
}
