# Guard rails — keeping the system up and the bill sane

## The honest risk map (what can actually cost us / break)

| Surface | Cost if abused | Why it's mostly fine | The guard |
|---|---|---|---|
| **Game analysis** (Stockfish evals + chess.js) | **$0** — runs in the user's browser in a Web Worker | It's the *user's* CPU, not ours | n/a |
| **Lichess API** | $0 but **shared rate limit** → 429s break the app | Cached aggressively | `politeFetch` backoff + report cache + refresh throttle |
| **Scoresheet scan** (Claude vision) | **real $** (~1–3¢/scan) | Only fires on explicit upload | **Per-plan daily quota** (free 3 / Coach 40 / Academy 150) |
| **createCheckout / webhook** | minimal | `maxInstances: 5` caps blast radius | concurrency cap + idempotent webhook |
| **Firestore** | tiny | per-coach docs, scales | security rules (`uid == coach`) |

**Key insight:** the heavy lifting (analysis) is *client-side and free*, so we mostly defend two things — **Lichess rate limits** (availability) and **the Claude scan** (cost).

## How big companies do it (and what we've shipped)

1. **Cache first.** Don't recompute or refetch what you already have. → report cache
   (session + localStorage, TTL); the **Last Game card reuses already-fetched games (0 extra calls)**.
2. **Rate limit per user.** Token-bucket / fixed-window. → `cooldownOk` (refresh ≤ 1 / 20s),
   `dailyQuota` (scans/day by plan).
3. **Debounce/throttle expensive UI actions.** → refresh throttle; button disables while loading.
4. **Back off, don't hammer.** Exponential backoff + jitter on 429/5xx. → `politeFetch`.
5. **Quotas tied to plan.** Usage limits are a feature of the tier, not an afterthought. → `entitlements`.
6. **Cap the blast radius.** A bug or attack can't run up an unbounded bill. → Functions `maxInstances: 5` + a budget alert.
7. **Idempotency** on money paths. → webhook re-fetches the session (safe to replay).
8. **Fail soft.** A rate limit shows "try again shortly," never a white screen. → friendly errors.

## What's client-side (UX) vs server-side (real enforcement)

`cooldownOk` / `dailyQuota` live in `localStorage` — they're the **friendly first line** and stop
accidental hammering, but a determined user can clear storage. The **real** enforcement, the way
big companies do it, is server-side:

- **Firebase App Check** (reCAPTCHA / device attestation) on the callable functions, so only *our*
  app can call `transcribeScoresheet` / `createCheckout` — blocks scripted abuse outright.
- **Per-user server quota**: before the Claude call, the function checks/increments a counter in
  Firestore (`coaches/{uid}.usage.scans.{yyyy-mm-dd}`) and rejects over the plan limit. The client
  quota and server quota use the same numbers from `entitlements`.
- **Cloud Armor / WAF + per-IP limits** at the edge for the truly hostile case.

### Recommended next step
Turn on **App Check** (Console → App Check → register the web app with reCAPTCHA v3) and add the
Firestore usage-counter check inside `transcribeScoresheet`. That moves the scan quota from
"polite" to "enforced" — the single highest-value hardening, since it's the only endpoint that
costs real money per call.
