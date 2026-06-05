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
  summarize,
  countMoveTokens,
  SCANNED_GAMES_CAP,
  type ScannedGame,
} from "./scannedGames";
import { runParseInWorker } from "./chess/runParseInWorker";
import { resolveSharedFromUrl } from "./shareGame";

interface ScannedGamesValue {
  games: ScannedGame[];
  /** Save a scanned PGN. Returns the saved (or already-existing) game. */
  saveScan: (pgn: string) => ScannedGame | null;
  /** Replace a saved game's moves (e.g. after fixing a misread). */
  updateGame: (id: string, pgn: string) => void;
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

  // Opened via a share link (?g=...): drop the game straight into the viewer
  // (transient — not added to the coach's own library). Runs once on mount.
  useEffect(() => {
    let cancelled = false;
    resolveSharedFromUrl().then((s) => {
      if (cancelled || !s) return;
      setOpenGame({
        id: `shared-${s.pgn.length.toString(36)}`,
        pgn: s.pgn.trim(),
        white: s.white,
        black: s.black,
        moveCount: countMoveTokens(s.pgn),
        savedAt: 0,
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Replace the cheap provisional count with the exact reconstructed one, off the
  // main thread (reuses the viewer's worker + cache — instant if already parsed).
  const refineCount = useCallback(
    (id: string, pgn: string) => {
      runParseInWorker(pgn)
        .then((p) => {
          const exact = p.moves.length;
          setGames((prev) => {
            const g = prev.find((x) => x.id === id);
            if (!g || g.pgn !== pgn || g.moveCount === exact) return prev;
            const next = prev.map((x) => (x.id === id ? { ...x, moveCount: exact } : x));
            void persistScannedGames(uid, next);
            return next;
          });
          setOpenGame((o) =>
            o?.id === id && o.pgn === pgn && o.moveCount !== exact ? { ...o, moveCount: exact } : o,
          );
        })
        .catch(() => {});
    },
    [uid],
  );

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
      refineCount(g.id, trimmed);
      return g;
    },
    [games, uid, refineCount],
  );

  const updateGame = useCallback(
    (id: string, pgn: string) => {
      const trimmed = pgn.trim();
      setGames((prev) => {
        const next = prev.map((g) =>
          g.id === id ? { ...g, pgn: trimmed, ...summarize(trimmed) } : g,
        );
        void persistScannedGames(uid, next);
        return next;
      });
      setOpenGame((o) =>
        o?.id === id ? { ...o, pgn: trimmed, ...summarize(trimmed) } : o,
      );
      refineCount(id, trimmed);
    },
    [uid, refineCount],
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
      updateGame,
      removeGame,
      openGame,
      open: setOpenGame,
      close: () => setOpenGame(null),
    }),
    [games, saveScan, updateGame, removeGame, openGame],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useScannedGames(): ScannedGamesValue {
  const c = useContext(Ctx);
  if (!c) throw new Error("useScannedGames must be used within ScannedGamesProvider");
  return c;
}
