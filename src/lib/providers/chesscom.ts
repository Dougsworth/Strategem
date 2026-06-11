import { Chess } from "chess.js";
import type { RatingPoint } from "../types";
import { politeFetch } from "../guardrails";
import type {
  FetchGamesOptions,
  LichessGame,
  LichessPlayer,
  LichessUser,
} from "./lichess";

// Thin client over the public Chess.com API, mapped into the SAME shapes the
// Lichess provider returns, so the report pipeline is platform-agnostic.
// CORS is open and no auth is needed. Note: Chess.com's public API exposes PGN
// + game-level accuracy, but NO per-move engine evals — so the deep eval report
// (blunder deck, phase accuracy, tactical motifs) isn't available from here yet;
// identity, rating trend, openings and results are.
//
// Docs: https://www.chess.com/news/view/published-data-api

const BASE = "https://api.chess.com/pub";

// Our perf keys (shared with Lichess) → Chess.com time classes.
const PERF_TO_TC: Record<string, string> = {
  bullet: "bullet",
  blitz: "blitz",
  rapid: "rapid",
  classical: "daily",
};
const TC_TO_PERF: Record<string, string> = {
  bullet: "bullet",
  blitz: "blitz",
  rapid: "rapid",
  daily: "classical",
};

async function getJson<T>(path: string): Promise<T> {
  const res = await politeFetch(`${BASE}${path}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Chess.com ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

// ── Profile + stats → LichessUser shape ──────────────────────────────────────

interface CcStatsBlock {
  last?: { rating?: number };
  record?: { win?: number; loss?: number; draw?: number };
}
type CcStats = Record<string, CcStatsBlock>;
interface CcProfile {
  username: string;
  name?: string;
}

export async function fetchUser(username: string): Promise<LichessUser> {
  const [profile, stats] = await Promise.all([
    getJson<CcProfile>(`/player/${encodeURIComponent(username)}`),
    getJson<CcStats>(`/player/${encodeURIComponent(username)}/stats`).catch(
      () => ({}) as CcStats,
    ),
  ]);

  const perfs: LichessUser["perfs"] = {};
  for (const [perf, tc] of Object.entries(PERF_TO_TC)) {
    const block = stats[`chess_${tc}`];
    if (!block) continue;
    const rec = block.record ?? {};
    const games = (rec.win ?? 0) + (rec.loss ?? 0) + (rec.draw ?? 0);
    if (block.last?.rating || games) {
      perfs[perf] = { rating: block.last?.rating, games };
    }
  }

  const [firstName, ...rest] = (profile.name ?? "").trim().split(/\s+/);
  return {
    id: profile.username,
    username: profile.username,
    perfs,
    profile: profile.name
      ? { firstName: firstName || undefined, lastName: rest.join(" ") || undefined }
      : undefined,
  };
}

// ── Archives → games / rating history ────────────────────────────────────────

interface CcGame {
  url?: string;
  uuid?: string;
  pgn?: string;
  rated?: boolean;
  rules?: string;
  time_class?: string;
  end_time?: number;
  eco?: string;
  white: { rating?: number; username?: string; result?: string };
  black: { rating?: number; username?: string; result?: string };
  accuracies?: { white?: number; black?: number };
}

const archiveCache = new Map<string, CcGame[]>();

async function listArchives(username: string): Promise<string[]> {
  const data = await getJson<{ archives: string[] }>(
    `/player/${encodeURIComponent(username)}/games/archives`,
  );
  return data.archives ?? [];
}

async function fetchArchive(url: string): Promise<CcGame[]> {
  const cached = archiveCache.get(url);
  if (cached) return cached;
  const res = await politeFetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) return [];
  const data = (await res.json()) as { games?: CcGame[] };
  const games = data.games ?? [];
  archiveCache.set(url, games);
  return games;
}

/** Walk archives newest→oldest, collecting games (optionally of one perf). */
async function collectGames(
  username: string,
  perf: string | undefined,
  max: number,
  maxArchives = 6,
): Promise<CcGame[]> {
  const archives = await listArchives(username);
  const tc = perf ? PERF_TO_TC[perf] : undefined;
  const out: CcGame[] = [];
  for (const url of archives.slice(-maxArchives).reverse()) {
    const games = await fetchArchive(url);
    for (const g of [...games].reverse()) {
      if (g.rules && g.rules !== "chess") continue;
      if (tc && g.time_class !== tc) continue;
      out.push(g);
      if (out.length >= max) return out;
    }
  }
  return out;
}

function readableOpening(eco?: string): string | undefined {
  if (!eco) return undefined;
  // eco is a URL like .../openings/Slav-Defense-Modern-Geller-Gambit
  const slug = eco.split("/").pop();
  return slug ? slug.replace(/-/g, " ") : undefined;
}

function toLichessGame(g: CcGame): LichessGame | null {
  if (!g.pgn) return null;
  let moves = "";
  let ecoTag = "";
  try {
    const c = new Chess();
    c.loadPgn(g.pgn);
    moves = c.history().join(" ");
    ecoTag = (c.header().ECO as string) ?? "";
  } catch {
    return null;
  }
  if (!moves) return null;

  const at = (g.end_time ?? 0) * 1000;
  const winner =
    g.white.result === "win" ? "white" : g.black.result === "win" ? "black" : undefined;

  const player = (
    side: { rating?: number; username?: string },
    acc?: number,
  ): LichessPlayer => ({
    user: side.username ? { name: side.username, id: side.username } : undefined,
    rating: side.rating,
    // Game-level accuracy when Chess.com reviewed the game (no per-move evals).
    analysis:
      acc != null
        ? { accuracy: acc, inaccuracy: 0, mistake: 0, blunder: 0, acpl: 0 }
        : undefined,
  });

  const id = g.uuid ?? g.url?.split("/").pop() ?? `${at}`;
  const speed = g.time_class ?? "blitz";
  return {
    id,
    rated: g.rated ?? true,
    variant: "standard",
    speed,
    perf: speed,
    createdAt: at,
    lastMoveAt: at,
    status: winner ? "mate" : "draw",
    winner: winner as LichessGame["winner"],
    players: {
      white: player(g.white, g.accuracies?.white),
      black: player(g.black, g.accuracies?.black),
    },
    opening: ecoTag
      ? { eco: ecoTag, name: readableOpening(g.eco) ?? ecoTag, ply: 0 }
      : undefined,
    moves,
    // No per-move analysis available from Chess.com's public API.
  };
}

export async function fetchGames(
  username: string,
  opts: FetchGamesOptions = {},
): Promise<LichessGame[]> {
  const { max = 50, perfType } = opts;
  const raw = await collectGames(username, perfType, max);
  return raw.map(toLichessGame).filter((g): g is LichessGame => g !== null);
}

export async function fetchRatingHistory(
  username: string,
  perf = "blitz",
): Promise<RatingPoint[]> {
  // No history endpoint — derive a curve from recent games' ratings over time.
  const perfKey = TC_TO_PERF[PERF_TO_TC[perf.toLowerCase()] ?? "blitz"]
    ? perf.toLowerCase()
    : "blitz";
  const games = await collectGames(username, perfKey, 120, 3).catch(() => []);
  const points: RatingPoint[] = [];
  for (const g of games) {
    const r = g.white.username?.toLowerCase() === username.toLowerCase()
      ? g.white.rating
      : g.black.rating;
    if (r && g.end_time) points.push({ date: g.end_time * 1000, rating: r });
  }
  // collectGames returns newest-first; rating history wants chronological.
  return points.reverse();
}

export async function fetchLastGameAt(
  username: string,
  perfType?: string,
): Promise<number | null> {
  try {
    const games = await collectGames(username, perfType, 1, 1);
    return games[0]?.end_time ? games[0].end_time * 1000 : null;
  } catch {
    return null;
  }
}

/** Chess.com game-URL import isn't supported yet — username only. */
export async function fetchGamePlayers(_gameId: string): Promise<string[]> {
  return [];
}
