import { GameViewer } from "@/sections/Review/GameViewer";
import { useScannedGames } from "@/lib/ScannedGamesContext";
import { getScanImage } from "@/lib/scanImages";

// Re-opens a saved scanned game full-screen, reusing the same scoresheet viewer.
export const ScannedGameModal = () => {
  const { openGame, close, updateGame } = useScannedGames();
  if (!openGame) return null;

  return (
    <div className="fixed inset-0 z-[120] flex animate-fade-in flex-col bg-paper">
      <header className="flex items-center justify-between border-b border-line px-6 py-3">
        <div>
          <p className="eyebrow">Saved game</p>
          <h2 className="mt-0.5 font-display text-lg font-bold tracking-tight">
            {openGame.white} – {openGame.black}
          </h2>
        </div>
        <button
          onClick={close}
          className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-paper transition-opacity hover:opacity-90"
        >
          Close
        </button>
      </header>

      <div className="mx-auto w-full max-w-6xl flex-1 overflow-y-auto p-6">
        <GameViewer
          pgn={openGame.pgn}
          imageUrl={getScanImage(openGame.id)}
          onPgnChange={(p) => updateGame(openGame.id, p)}
        />
      </div>
    </div>
  );
};
