import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "./AuthContext";
import {
  loadScannedGames,
  makeGame,
  persistScannedGames,
  SCANNED_GAMES_CAP,
  type ScannedGame,
} from "./scannedGames";

interface ScannedGamesValue {
  games: ScannedGame[];
  /** Save a scanned PGN. Returns the saved (or already-existing) game. */
  saveScan: (pgn: string) => ScannedGame | null;
  removeGame: (id: string) => void;
  /** The game currently open in the full-screen viewer, if any. */
  openGame: ScannedGame | null;
  open: (game: ScannedGame) => void;
  close: () => void;
}

const Ctx = createContext<ScannedGamesValue | null>(null);

export function ScannedGamesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const uid = user?.uid;
  const [games, setGames] = useState<ScannedGame[]>([]);
  const [openGame, setOpenGame] = useState<ScannedGame | null>(null);

  // Load the library whenever the signed-in coach changes.
  useEffect(() => {
    let cancelled = false;
    loadScannedGames(uid).then((g) => {
      if (!cancelled) setGames(g);
    });
    return () => {
      cancelled = true;
    };
  }, [uid]);

  const saveScan = useCallback(
    (pgn: string) => {
      const trimmed = pgn.trim();
      const existing = games.find((x) => x.pgn === trimmed);
      if (existing) return existing;
      const g = makeGame(trimmed, Date.now());
      if (!g.moveCount) return null; // nothing legible to save
      setGames((prev) => {
        if (prev.some((x) => x.pgn === trimmed)) return prev;
        const next = [g, ...prev].slice(0, SCANNED_GAMES_CAP);
        void persistScannedGames(uid, next);
        return next;
      });
      return g;
    },
    [games, uid],
  );

  const removeGame = useCallback(
    (id: string) => {
      setGames((prev) => {
        const next = prev.filter((x) => x.id !== id);
        void persistScannedGames(uid, next);
        return next;
      });
      setOpenGame((o) => (o?.id === id ? null : o));
    },
    [uid],
  );

  const value = useMemo<ScannedGamesValue>(
    () => ({
      games,
      saveScan,
      removeGame,
      openGame,
      open: setOpenGame,
      close: () => setOpenGame(null),
    }),
    [games, saveScan, removeGame, openGame],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useScannedGames(): ScannedGamesValue {
  const c = useContext(Ctx);
  if (!c) throw new Error("useScannedGames must be used within ScannedGamesProvider");
  return c;
}
