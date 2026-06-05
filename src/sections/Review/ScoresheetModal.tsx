import { useRef, useState } from "react";
import { Upload, Check } from "lucide-react";
import { GameViewer } from "@/sections/Review/GameViewer";
import { transcribeScoresheet, fileToBase64 } from "@/lib/scoresheet";
import { useScannedGames } from "@/lib/ScannedGamesContext";
import { useAuth } from "@/lib/AuthContext";
import { entitlements } from "@/lib/entitlements";
import { dailyQuota } from "@/lib/guardrails";
import { compressImage, saveScanImage } from "@/lib/scanImages";
import { ScanQuota } from "@/components/ScanQuota";

type Stage = "input" | "reading" | "view";

export const ScoresheetModal = ({ onClose }: { onClose: () => void }) => {
  const [stage, setStage] = useState<Stage>("input");
  const [pgn, setPgn] = useState("");
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [sessionImage, setSessionImage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { saveScan, updateGame } = useScannedGames();
  const { user } = useAuth();

  // Keep a scanned/loaded game in the coach's library so it's there later.
  function showGame(text: string) {
    setPgn(text);
    setDraft(text);
    setStage("view");
    setSessionImage(null); // paste path has no image; the scan path sets it after
    const g = saveScan(text);
    setSaved(Boolean(g));
    setSavedId(g?.id ?? null);
    return g;
  }

  async function onFile(file: File) {
    setError(null);
    // Cost guard: each scan calls the paid Claude vision endpoint, so cap how
    // many a single coach can run per day, by plan. (Server-side enforcement is
    // the real protection — this is the friendly first line.)
    const q = dailyQuota("scan", entitlements(user?.plan).scanPerDay);
    if (q.remaining <= 0) {
      setError(
        `You've used your ${q.limit} scans for today. ${
          user?.plan === "free" ? "Upgrade to Coach for more." : "Resets tomorrow."
        }`,
      );
      return;
    }
    q.take(); // count the attempt up front — a call is a call, success or not
    setStage("reading");
    try {
      const { base64, mimeType } = await fileToBase64(file);
      const result = await transcribeScoresheet(base64, mimeType);
      const g = showGame(result);
      // Keep the original photo (compressed) so it can be compared later.
      const img = await compressImage(file);
      setSessionImage(img);
      if (g) saveScanImage(g.id, img);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Couldn’t read that scoresheet.",
      );
      setStage("input");
    }
  }

  return (
    <div className="fixed inset-0 z-[120] flex animate-fade-in flex-col bg-paper">
      <header className="flex items-center justify-between border-b border-line px-6 py-3">
        <div>
          <p className="eyebrow">Scan a game</p>
          <h2 className="mt-0.5 font-display text-lg font-bold tracking-tight">
            {stage === "view" ? "Review the game" : "Upload a scoresheet"}
          </h2>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-paper transition-opacity hover:opacity-90"
        >
          Close
        </button>
      </header>

      <div
        className={`mx-auto w-full flex-1 overflow-y-auto p-6 ${
          stage === "view" ? "max-w-6xl" : "max-w-xl"
        }`}
      >

        {stage === "reading" && (
          <div className="grid place-items-center py-16 text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-accent" />
            <p className="mt-4 text-sm text-muted">Reading the moves…</p>
          </div>
        )}

        {stage === "input" && (
          <div className="space-y-5">
            {/* Photo upload */}
            <div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void onFile(f);
                }}
              />
              <button
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  const f = e.dataTransfer.files?.[0];
                  if (f && f.type.startsWith("image/")) void onFile(f);
                }}
                className={`flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed py-10 transition-colors ${
                  dragging
                    ? "border-accent bg-accent-soft"
                    : "border-line hover:bg-ink-soft"
                }`}
              >
                <Upload size={22} className={dragging ? "text-accent" : "text-muted"} />
                <span className="text-sm font-medium">
                  {dragging ? "Drop it here" : "Drag & drop, take, or upload a photo"}
                </span>
                <span className="text-xs text-muted">
                  A photo of the scoresheet — we’ll read the moves
                </span>
              </button>
              <div className="mt-2 flex justify-center">
                <ScanQuota />
              </div>
            </div>

            {error && <p className="text-center text-xs text-accent">{error}</p>}

            {/* Or paste */}
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-line" />
              <span className="font-mono text-[10px] uppercase tracking-wide text-muted/60">
                or paste the moves
              </span>
              <div className="h-px flex-1 bg-line" />
            </div>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 …"
              rows={4}
              className="w-full rounded-lg border border-line bg-card px-3 py-2 text-sm outline-none ring-accent/30 focus:ring-2"
            />
            <button
              onClick={() => {
                if (!draft.trim()) return;
                showGame(draft);
              }}
              className="w-full rounded-lg bg-ink py-2.5 text-sm font-semibold text-paper transition-opacity hover:opacity-90"
            >
              Load game
            </button>
          </div>
        )}

        {stage === "view" && (
          <div className="space-y-4">
            {saved && (
              <div className="flex items-center gap-2 rounded-lg bg-positive/10 px-3 py-2 text-sm text-ink">
                <Check size={15} className="text-positive" />
                Saved to your library — find it under{" "}
                <span className="font-semibold">Scanned Games</span> in the sidebar.
              </div>
            )}
            {/* Edit-the-moves now lives inside the viewer; edits persist to the
                saved library copy. */}
            <GameViewer
              pgn={pgn}
              imageUrl={sessionImage}
              onPgnChange={(p) => {
                setPgn(p);
                if (savedId) updateGame(savedId, p);
              }}
            />
            <button
              onClick={() => {
                setStage("input");
                setError(null);
              }}
              className="text-sm font-semibold text-ink hover:underline"
            >
              ← Scan another
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
