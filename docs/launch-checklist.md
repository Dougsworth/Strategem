# Strategem — go-live checklist

Status as of 2026-06-11. The app is deployed and functional; this tracks the
remaining items before a wide public launch. Items are split into **done in
code** vs **needs you** (external access I can't reach: dashboards, real
browsers, live cards).

---

## ✅ Done in code (this branch)

- **Legal pages** — real Privacy Policy, Terms of Service, and Contact pages
  (`src/sections/Legal/LegalPage.tsx`), reachable from the footer via
  `#privacy` / `#terms` / `#contact`, deep-linkable and Back-button aware.
  `#sample` ("See a sample report") now scrolls to the How-it-works walkthrough
  instead of dumping users into signup.
  - ⚠️ Before launch, edit the three constants at the top of `LegalPage.tsx`:
    `CONTACT_EMAIL` (currently `support@strategem.app` — set a real inbox),
    `COMPANY_LOCATION` (governing-law jurisdiction), and `EFFECTIVE_DATE`.
- **Chess.com provider** — complete and behind the shared provider interface.
  Honestly gated: Chess.com has no per-move evals, so the deep report is
  marked "deep analysis coming soon" in the roster UI. Identity, ratings,
  openings, and results work.
- **Stockfish (browser engine)** — `stockfish.wasm` is wired, not just bundled:
  `src/lib/engine/stockfish.ts` (lazy Web Worker) → `analyzeWithEngine.ts` →
  `Review/GameInsights.tsx` as an opt-in "Run Stockfish on every move" layer.
  Engine files ship to `dist/engine/` via Vite's `publicDir`.
- Build is clean (`npm run build`) and `tsc --noEmit` passes.

---

## ⚠️ Needs you — go-live blockers

### 1. Payments are one-time charges, not subscriptions
`functions/index.js` → `createCheckout` posts a one-time `amount` / `line_items`
payload to LuniPay. There is **no `mode: "subscription"` / recurring interval**,
so when a coach pays, their plan flips to paid and **never renews or expires**.

Pick one before charging the public:
- **(a) Confirm LuniPay supports recurring billing** and switch the payload to a
  subscription/recurring session, then handle renewal + cancellation webhooks.
- **(b) Keep one-time and reframe the pricing** as a one-time/period pass rather
  than "$19/mo", or add a manual renewal reminder + re-checkout flow.
- **(c) Treat current paid plans as lifetime/grandfathered** for the beta and
  revisit before scaling.

Until this is decided, marketing "$19/mo" while billing once is misleading.

### 2. Run one clean end-to-end live payment test
Session-16 history shows a live-mode LuniPay reconciliation defect (card charged,
session stayed `unpaid`, webhook never fired); a later session says a live
payment did go through. Before inviting strangers to pay:
- Set `LUNIPAY_SECRET_KEY` to the **live** `sk_live_` key, redeploy
  `createCheckout` + `lunipayWebhook`, register the webhook URL in **both** test
  and live modes in the LuniPay dashboard.
- Do one real purchase with a real card; confirm the plan flips (the instant
  `confirmCheckout` path should flip it in ~1–2s without waiting on the webhook).
- Revert to `sk_test_` for normal development afterward.

### 3. Verify Google sign-in
Email/password is confirmed live. The Google OAuth code path exists
(`signInWithGoogle` → Firebase), but the **provider toggle in the Firebase
console** and the popup flow have not been tested in a real browser (headless
can't complete the OAuth popup).
- Firebase console → Authentication → Sign-in method → enable **Google**.
- Open the deployed app in a real browser and complete a Google sign-in.

---

## 🟢 Non-blocking, post-launch

- **Node 20 functions runtime** is deprecated (decommission 2026-10-30) — bump
  the runtime well before then.
- **Bundle weight** — `KingPiece3D` (~805 KB) and the puzzle pool (~709 KB) are
  the heaviest chunks; both lazy-load, but the landing's 3D king is a candidate
  to trim for first-paint speed.
- **Legal links on the auth screen** — adding "By signing up you agree to Terms
  & Privacy" on `AuthScreen` is good practice; currently the legal pages are
  only linked from the marketing footer.
