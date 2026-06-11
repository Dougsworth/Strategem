import type { Platform, RosterEntry, Trend } from "./types";
import { provider } from "./providers";

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function trendFromDrift(drift: number, points: number): Trend {
  if (drift >= 20) return "rising";
  if (drift <= -20) return "declining";
  if (points >= 8 && Math.abs(drift) <= 10) return "plateau";
  return "steady";
}

/** Light-weight roster summary (rating + trend) — no game analysis. */
export async function fetchRosterEntry(
  username: string,
  platform: Platform = "lichess",
): Promise<RosterEntry> {
  const { fetchUser, fetchRatingHistory } = provider(platform);
  const [user, history] = await Promise.all([
    fetchUser(username),
    fetchRatingHistory(username).catch(() => []),
  ]);
  const displayName =
    [user.profile?.firstName, user.profile?.lastName].filter(Boolean).join(" ") ||
    user.username;
  const rating =
    user.perfs?.blitz?.rating ??
    user.perfs?.rapid?.rating ??
    user.perfs?.bullet?.rating ??
    user.perfs?.classical?.rating ??
    null;
  const tail = history.slice(-20);
  const drift =
    tail.length >= 2 ? tail[tail.length - 1].rating - tail[0].rating : 0;
  return {
    platform,
    username: user.username,
    displayName,
    initials: initialsOf(displayName),
    rating,
    trend: trendFromDrift(drift, tail.length),
  };
}
