// Parse whatever a coach pastes — a profile URL, a game URL, or a bare
// username — into something we can act on. No hardcoded names anywhere.

export type LichessInput =
  | { kind: "user"; username: string }
  | { kind: "game"; gameId: string };

const USER_URL = /lichess\.org\/@\/([\w-]+)/i;
// Game ids are 8 chars; a full move id is 12. Accept either, optional /white.
const GAME_URL = /lichess\.org\/([\w]{8,12})(?:\/(?:white|black))?/i;
const BARE_USER = /^@?([\w-]{2,30})$/;

export function parseLichessInput(raw: string): LichessInput | null {
  const input = raw.trim();
  if (!input) return null;

  const userUrl = input.match(USER_URL);
  if (userUrl) return { kind: "user", username: userUrl[1] };

  // Only treat as a game URL when it actually contains the lichess domain,
  // so a bare username like "abcdefgh" isn't mistaken for a game id.
  if (/lichess\.org/i.test(input)) {
    const gameUrl = input.match(GAME_URL);
    if (gameUrl) return { kind: "game", gameId: gameUrl[1].slice(0, 8) };
  }

  const bare = input.match(BARE_USER);
  if (bare) return { kind: "user", username: bare[1] };

  return null;
}
