import type { RatingPoint } from "../types";
import { politeFetch } from "../guardrails";

// Thin client over the public Lichess API. No auth required for public data,
// and CORS is open, so this runs unchanged in the browser or in Node.
// All requests go through politeFetch → backs off on 429/5xx so a rate limit
// slows us down gracefully instead of crashing the page.
//
// Docs: https://lichess.org/api

const BASE = "https://lichess.org";

/** One ply of Lichess server-side Stockfish analysis. */
export interface LichessEvalNode {
  /** Centipawns from White's POV. Present unless `mate` is. */
  eval?: number;
  /** Mate-in-N from White's POV (positive = White mates). */
  mate?: number;
  /** Engine's best move in UCI, when this move was sub-optimal. */
  best?: string;
  /** PV after the best move (SAN, space-separated). */
  variation?: string;
  judgment?: {
    name: "Inaccuracy" | "Mistake" | "Blunder";
    comment: string;
  };
}

export interface LichessPlayerAnalysis {
  inaccuracy: number;
  mistake: number;
  blunder: number;
  acpl: number;
  accuracy: number;
}

export interface LichessPlayer {
  user?: { name: string; id: string };
  rating?: number;
  ratingDiff?: number;
  analysis?: LichessPlayerAnalysis;
}

export interface LichessGame {
  id: string;
  rated: boolean;
  variant: string;
  speed: string;
  perf: string;
  createdAt: number;
  lastMoveAt: number;
  status: string;
  winner?: "white" | "black";
  players: { white: LichessPlayer; black: LichessPlayer };
  opening?: { eco: string; name: string; ply: number };
  /** SAN moves, space-separated. */
  moves: string;
  /** Per-ply analysis, aligned with `moves`. Absent if game wasn't analyzed. */
  analysis?: LichessEvalNode[];
}

export interface LichessUser {
  id: string;
  username: string;
  perfs?: Record<string, { rating?: number; games?: number }>;
  profile?: { firstName?: string; lastName?: string };
}

async function getJson<T>(path: string): Promise<T> {
  const res = await politeFetch(`${BASE}${path}`);
  if (!res.ok) {
    throw new Error(`Lichess ${path} → ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchUser(username: string): Promise<LichessUser> {
  return getJson<LichessUser>(`/api/user/${encodeURIComponent(username)}`);
}

interface RatingHistoryEntry {
  name: string;
  points: [number, number, number, number][]; // [year, month(0-idx), day, rating]
}

/**
 * Rating history for a given perf (defaults to the most active standard speed).
 * Returns chronological points, newest last.
 */
export async function fetchRatingHistory(
  username: string,
  perf = "Blitz",
): Promise<RatingPoint[]> {
  const data = await getJson<RatingHistoryEntry[]>(
    `/api/user/${encodeURIComponent(username)}/rating-history`,
  );
  const entry =
    data.find((d) => d.name.toLowerCase() === perf.toLowerCase()) ??
    // fall back to whichever standard perf has the most points
    [...data]
      .filter((d) => ["Bullet", "Blitz", "Rapid", "Classical"].includes(d.name))
      .sort((a, b) => b.points.length - a.points.length)[0];

  if (!entry) return [];
  return entry.points.map(([y, m, d, rating]) => ({
    date: Date.UTC(y, m, d),
    rating,
  }));
}

/** The two usernames in a game, for resolving a pasted game URL. */
export async function fetchGamePlayers(gameId: string): Promise<string[]> {
  const res = await politeFetch(
    `${BASE}/game/export/${encodeURIComponent(gameId)}?moves=false&tags=false`,
    { headers: { Accept: "application/json" } },
  );
  if (!res.ok) throw new Error(`Lichess game ${gameId} → ${res.status}`);
  const game = (await res.json()) as LichessGame;
  return [game.players.white.user?.name, game.players.black.user?.name].filter(
    (n): n is string => Boolean(n),
  );
}

/**
 * The timestamp of a player's most recent game — *any* game, analysed or not.
 * Used for an accurate "last game N ago" (the analysis fetch only sees analysed
 * games, so a fresh casual/bullet game would otherwise look days old).
 */
export async function fetchLastGameAt(
  username: string,
  perfType?: string,
): Promise<number | null> {
  const params = new URLSearchParams({ max: "1", sort: "dateDesc" });
  if (perfType) params.set("perfType", perfType);
  try {
    const res = await politeFetch(
      `${BASE}/api/games/user/${encodeURIComponent(username)}?${params}`,
      { headers: { Accept: "application/x-ndjson" } },
    );
    if (!res.ok) return null;
    const text = (await res.text()).trim();
    if (!text) return null;
    const g = JSON.parse(text.split("\n")[0]) as {
      lastMoveAt?: number;
      createdAt?: number;
    };
    return g.lastMoveAt ?? g.createdAt ?? null;
  } catch {
    return null;
  }
}

export interface FetchGamesOptions {
  max?: number;
  /** Only return games that already have engine analysis. */
  onlyAnalysed?: boolean;
  perfType?: string; // e.g. "blitz,rapid"
}

/**
 * Fetch a user's recent games as parsed JSON, including per-move evals and
 * per-game accuracy when available.
 */
export async function fetchGames(
  username: string,
  opts: FetchGamesOptions = {},
): Promise<LichessGame[]> {
  const { max = 50, onlyAnalysed = true, perfType } = opts;
  const params = new URLSearchParams({
    max: String(max),
    evals: "true",
    accuracy: "true",
    opening: "true",
    sort: "dateDesc",
  });
  if (onlyAnalysed) params.set("analysed", "true");
  if (perfType) params.set("perfType", perfType);

  const res = await politeFetch(
    `${BASE}/api/games/user/${encodeURIComponent(username)}?${params}`,
    { headers: { Accept: "application/x-ndjson" } },
  );
  if (!res.ok) {
    throw new Error(`Lichess games → ${res.status} ${res.statusText}`);
  }
  const text = await res.text();
  return text
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as LichessGame);
}
