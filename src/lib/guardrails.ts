// Client-side guard rails: keep a single user from hammering the app, our paid
// endpoints (Claude scan), and Lichess's shared rate limit. This is the first
// line of defense for UX and cost — REAL abuse protection is enforced
// server-side (Firebase App Check + per-user quotas; see docs/guardrails.md).

/** Min-interval throttle. Returns true (and stamps "now") if it may run. */
export function cooldownOk(key: string, minMs: number): boolean {
  const k = `strategem.cd.${key}`;
  try {
    const last = Number(localStorage.getItem(k) ?? 0);
    if (Date.now() - last < minMs) return false;
    localStorage.setItem(k, String(Date.now()));
    return true;
  } catch {
    return true; // storage off → don't block the user
  }
}

export interface QuotaState {
  used: number;
  limit: number;
  remaining: number;
  /** Increment if there's room; returns whether it was allowed. */
  take: () => boolean;
}

/** A per-UTC-day counter (resets at midnight UTC). */
export function dailyQuota(key: string, limit: number): QuotaState {
  const day = new Date().toISOString().slice(0, 10);
  const k = `strategem.q.${key}.${day}`;
  let used = 0;
  try {
    used = Number(localStorage.getItem(k) ?? 0);
  } catch {
    /* ignore */
  }
  return {
    used,
    limit,
    remaining: Math.max(0, limit - used),
    take() {
      if (used >= limit) return false;
      used += 1;
      try {
        localStorage.setItem(k, String(used));
      } catch {
        /* ignore */
      }
      return true;
    },
  };
}

/**
 * fetch() with polite backoff on 429 (rate limit) and 5xx. Retries a couple of
 * times with exponential backoff + jitter, then throws a friendly error — so a
 * Lichess rate-limit slows us down instead of crashing the page.
 */
export async function politeFetch(
  url: string,
  init?: RequestInit,
  opts: { retries?: number; baseDelayMs?: number } = {},
): Promise<Response> {
  const retries = opts.retries ?? 2;
  const base = opts.baseDelayMs ?? 800;
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, init);
    if (res.status !== 429 && res.status < 500) return res;
    if (attempt >= retries) {
      throw new Error(
        res.status === 429
          ? "Lichess is rate-limiting us — give it a few seconds and try again."
          : `Lichess is having trouble (${res.status}). Try again shortly.`,
      );
    }
    // Exponential backoff with jitter (attempt 0 → ~0.8s, 1 → ~1.6s …).
    const wait = base * 2 ** attempt + Math.floor(((attempt * 137) % 200));
    await new Promise((r) => setTimeout(r, wait));
  }
}
