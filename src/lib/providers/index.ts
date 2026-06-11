import type { Platform } from "../types";
import * as lichess from "./lichess";
import * as chesscom from "./chesscom";

// Platform dispatch. Both providers expose the same surface (fetchUser,
// fetchRatingHistory, fetchLastGameAt, fetchGames, fetchGamePlayers) and return
// the same shapes, so the report pipeline stays platform-agnostic.
const PROVIDERS = { lichess, chesscom } as const;

export function provider(platform: Platform = "lichess") {
  return PROVIDERS[platform] ?? lichess;
}
