import { getFirebase } from "./firebase";

// Sends a scoresheet photo to the transcribeScoresheet Cloud Function (which
// calls Claude vision) and returns PGN move text.
export async function transcribeScoresheet(
  imageBase64: string,
  mimeType: string,
): Promise<string> {
  await getFirebase();
  const { getApps } = await import("firebase/app");
  const { getFunctions, httpsCallable } = await import("firebase/functions");
  const app = getApps()[0];
  const fns = getFunctions(app);
  const call = httpsCallable<
    { imageBase64: string; mimeType: string },
    { pgn?: string; error?: string }
  >(fns, "transcribeScoresheet");
  const res = await call({ imageBase64, mimeType });
  if (!res.data?.pgn) {
    throw new Error(res.data?.error || "Couldn’t read the scoresheet.");
  }
  return res.data.pgn;
}

/** Import PGN into Lichess and return the game/analysis-board URL (no auth). */
export async function importToLichess(pgn: string): Promise<string> {
  const res = await fetch("https://lichess.org/api/import", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({ pgn }),
  });
  if (!res.ok) throw new Error("Couldn’t send this game to Lichess.");
  const data = (await res.json()) as { url?: string };
  if (!data.url) throw new Error("Lichess didn’t return a game link.");
  return data.url;
}

/** Read a File into { base64, mimeType } for upload. */
export function fileToBase64(
  file: File,
): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string; // "data:image/jpeg;base64,XXXX"
      const base64 = result.split(",")[1] ?? "";
      resolve({ base64, mimeType: file.type || "image/jpeg" });
    };
    reader.onerror = () => reject(new Error("Couldn’t read that file."));
    reader.readAsDataURL(file);
  });
}
