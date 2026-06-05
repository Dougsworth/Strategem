import { useEffect, useRef, useState } from "react";
import { Check, FolderPlus, ScanLine } from "lucide-react";
import { GameViewer } from "@/sections/Review/GameViewer";
import { useScannedGames } from "@/lib/ScannedGamesContext";
import { getScanImage, saveScanImage, compressImage } from "@/lib/scanImages";
import { transcribeScoresheet, fileToBase64 } from "@/lib/scoresheet";
import { useAuth } from "@/lib/AuthContext";
import { entitlements } from "@/lib/entitlements";
import { dailyQuota } from "@/lib/guardrails";
import { ScanQuota } from "@/components/ScanQuota";

// Re-opens a saved scanned game full-screen, reusing the same scoresheet viewer.
export const ScannedGameModal = () => {
  const { openGame, close, updateGame, saveScan, open } = useScannedGames();
  const { user } = useAuth();
  const refreshed = useRef<Set<string>>(new Set());
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const id = openGame?.id;
  const pgn = openGame?.pgn;
  // Opened via a share link — transient, not yet in this coach's library.
  const isShared = !!id && id.startsWith("shared-");

  // Refresh the saved game's summary (move count / names) the first time it's
  // opened — but only for OWNED games (a shared game isn't in the library).
  useEffect(() => {
    if (id && pgn && !isShared && !refreshed.current.has(id)) {
      refreshed.current.add(id);
      updateGame(id, pgn);
    }
  }, [id, pgn, isShared, updateGame]);

  // Keep this shared game: add it to the library and re-open the owned copy
  // (so it stops being transient and gains Rescan / persistence).
  function saveToLibrary() {
    if (!openGame) return;
    const g = saveScan(openGame.pgn);
    if (g) {
      setSaved(true);
      open(g);
    } else {
      setError("Couldn’t save — nothing legible to keep.");
    }
  }

  // Re-scan: upload a (fresh) photo to re-transcribe this game with the latest
  // OCR + reconstruction, and attach the photo for comparison.
  async function rescan(file: File) {
    if (!id) return;
    setError(null);
    const q = dailyQuota("scan", entitlements(user?.plan).scanPerDay);
    if (q.remaining <= 0) {
      setError(
        `You've used your ${q.limit} scans for today. ${
          user?.plan === "free" ? "Upgrade to Coach for more." : "Resets tomorrow."
        }`,
      );
      return;
    }
    q.take();
    setBusy(true);
    try {
      const { base64, mimeType } = await fileToBase64(file);
      const result = await transcribeScoresheet(base64, mimeType);
      updateGame(id, result);
      const img = await compressImage(file);
      saveScanImage(id, img);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t read that scoresheet.");
    } finally {
      setBusy(false);
    }
  }

  if (!openGame) return null;

  return (
    <div className="fixed inset-0 z-[120] flex animate-fade-in flex-col bg-paper">
      <header className="flex items-center justify-between border-b border-line px-6 py-3">
        <div>
          <p className="eyebrow">{isShared ? "Shared game" : "Saved game"}</p>
          <h2 className="mt-0.5 font-display text-lg font-bold tracking-tight">
            {openGame.white} – {openGame.black}
          </h2>
        </div>
        <div className="flex items-center gap-3">
          {isShared ? (
            <button
              onClick={saveToLibrary}
              disabled={saved}
              className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-sm font-medium transition-colors hover:bg-ink-soft disabled:opacity-50"
            >
              {saved ? <Check size={14} className="text-positive" /> : <FolderPlus size={14} />}
              {saved ? "Saved" : "Save to my library"}
            </button>
          ) : (
            <>
              <ScanQuota className="hidden sm:inline-flex" />
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void rescan(f);
                  e.target.value = "";
                }}
              />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={busy}
                className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-sm font-medium transition-colors hover:bg-ink-soft disabled:opacity-50"
              >
                <ScanLine size={14} />
                {busy ? "Reading…" : "Rescan"}
              </button>
            </>
          )}
          <button
            onClick={close}
            className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-paper transition-opacity hover:opacity-90"
          >
            Close
          </button>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl flex-1 overflow-y-auto p-6">
        {error && <p className="mb-3 text-sm text-accent">{error}</p>}
        <GameViewer
          pgn={openGame.pgn}
          imageUrl={getScanImage(openGame.id)}
          onPgnChange={(p) => updateGame(openGame.id, p)}
        />
      </div>
    </div>
  );
};
