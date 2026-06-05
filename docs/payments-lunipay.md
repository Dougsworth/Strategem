# Payments — LuniPay checkout (Firebase Cloud Functions)

## How it works
```
Coach clicks "Upgrade to Coach"
   → src/lib/checkout.ts calls the createCheckout Cloud Function
   → function (functions/index.js) POSTs LuniPay /v1/checkout/sessions
     with the SECRET key + metadata {uid, plan}
   → returns the hosted checkout URL → browser redirects there
   → coach pays on LuniPay's page
   → LuniPay calls lunipayWebhook → we RE-FETCH the session to confirm it's
     paid → set coaches/{uid}.plan in Firestore
   → coach returns to the app; their plan now reads as upgraded
```

The **secret key never touches the browser** — it lives only as a Firebase
secret. Verification re-fetches the session from LuniPay, so a forged webhook
can't grant a plan.

> Note: the `pk_test_…` **publishable** key you have is **not used** in this
> redirect flow (LuniPay's hosted page handles the card). What the backend needs
> is your **secret key** (`sk_test_…`), set as a Firebase secret (below).

## One-time setup (your side)

1. **Upgrade Firebase to Blaze** (pay-as-you-go) — Cloud Functions require it.
   Still ~$0 at low volume; you set a budget alert if you want.
   Firebase Console → ⚙️ → Usage and billing → Modify plan → Blaze.

2. **Store your LuniPay secret key as a Firebase secret** (never in code/.env):
   ```
   firebase functions:secrets:set LUNIPAY_SECRET_KEY
   # paste your sk_test_... when prompted
   ```

3. **Install deps & deploy the functions:**
   ```
   cd functions && npm install && cd ..
   firebase deploy --only functions
   ```

4. **Wire the webhook.** The deploy prints the `lunipayWebhook` URL, e.g.
   `https://lunipaywebhook-xxxxx-uc.a.run.app`. In the **LuniPay dashboard →
   Webhooks → Manage endpoints**, add that URL and subscribe to the
   session-completed event.

5. **Check the prices** in `functions/index.js` (`PRICES`) match `src/lib/plans.ts`
   (Coach 1900 = $19, Academy 4900 = $49, in cents).

## Test it
- In test mode (sk_test), the hosted page accepts **Stripe test cards** (e.g.
  `4242 4242 4242 4242`, any future expiry/CVC).
- Sign in → Upgrade → pay with a test card → you return to the app, and within a
  second or two `coaches/{uid}.plan` flips to `pro`/`team` (the navbar "Upgrade"
  nudge disappears and the menu shows the new plan).

## Important caveats
- **Recurring vs one-time:** LuniPay's documented checkout sessions are
  **one-time charges** (amount/currency). This bills the plan price **once**. For
  true auto-renewing monthly subscriptions, confirm whether LuniPay exposes a
  subscription/recurring mode and adjust the session payload — otherwise you'd
  re-bill monthly (e.g. a scheduled function + saved customer) or use their
  invoice "installments". Until then, treat an upgrade as "activate this plan."
- **Webhook hardening (optional):** we verify by re-fetching the session, which
  is already secure. If LuniPay provides a webhook **signing secret**
  (`/docs/webhooks/signature-verification`), add an HMAC check at the top of
  `lunipayWebhook` as defence-in-depth.
- **Downgrades / cancellation** aren't wired — "Downgrade to Starter" just sets
  the plan locally/Firestore with no proration or LuniPay-side cancel. Add that
  when you add real subscriptions.
