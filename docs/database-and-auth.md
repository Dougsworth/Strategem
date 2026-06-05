# Database & Auth — how to do it cheap, the way real businesses do

## What we need
- **Google sign-in** (and email) — real OAuth, not a mock.
- A **database** to store: coaches, their roster of students, report snapshots,
  lesson plans, settings. (All small structured text — our data footprint is tiny.)
- **No fixed monthly bill** until we're actually big; pay only for what we use.
- Works with our **client-side app** (Vite SPA, no server) — ideally no backend
  to maintain.

## How "big businesses" actually do it

Three tiers of approach, cheapest-first:

1. **Managed BaaS (Backend-as-a-Service)** — Firebase, Supabase, Convex. The DB,
   auth, and Google sign-in are a hosted service you call from the browser with
   security rules controlling access. This is how the **majority of startups and
   consumer apps** ship — no servers, pay-as-you-go. **← where we should be.**
2. **Managed Postgres + an auth provider** — Neon/PlanetScale + Clerk/Auth0, with
   a thin API. More control, slightly more to wire. Common at Series-A+ scale.
3. **Self-run cloud databases** — AWS RDS/Aurora, Google Spanner, DynamoDB with
   dedicated platform teams. This is "FAANG-scale," costs real money, and is
   overkill for us. (And note: even they pay per usage — nobody escapes that.)

The honest truth: **nobody pays $0 forever** — the trick is a provider whose
**free tier has no monthly fee and doesn't pause**, then bills **per-use** so you
only pay once you have paying customers covering it.

## Recommendation: **Firebase (Auth + Firestore)**

Best fit for *our exact constraints*:

- **Google sign-in is native** — it's Google's own product; "Sign in with Google"
  is a few lines, no OAuth plumbing.
- **No monthly fee.** The free **Spark** plan has no bill and **doesn't pause**
  (unlike Supabase's free tier). You only move to pay-as-you-go (**Blaze**) when
  you exceed the free quotas — and the free quotas still apply on Blaze.
- **No backend needed** — the browser talks to Firestore directly; **Security
  Rules** enforce "a coach can only read/write their own data." Perfect for our
  SPA.
- Free quotas are generous for us: ~1 GiB stored + tens of thousands of
  reads/writes per day. Our per-coach data is a few KB, so realistically **$0 for
  a long time**, then cents.

**Trade-off:** Firestore is NoSQL (documents), not SQL. For our data (a coach
with a list of students, each with snapshots) that's actually a clean fit.

### Honest comparison

| Option | Google sign-in | Free tier | Monthly floor | Notes |
|---|---|---|---|---|
| **Firebase** (rec.) | ✅ native | No-pause, generous | **$0** → pay-as-you-go | NoSQL; no backend; best for client SPA |
| **Supabase** | ✅ built-in | Pauses after 1 wk idle | **$25/mo** at Pro | Real Postgres/SQL; one vendor for auth+db |
| **Clerk + Neon** | ✅ (Clerk) | Clerk 50K MRU free; Neon 0.5 GB free | **$0** → Neon $5 floor | Best-in-class auth + cheap Postgres; 2 vendors |
| **Convex** | ✅ | Generous free | $0 → usage | Reactive DB; great DX; newer/smaller ecosystem |

(Supabase/Neon/Clerk figures verified 2026-06-04 — see `pricing-and-costs.md`.
Firebase quota specifics: confirm current numbers on firebase.google.com/pricing
before committing.)

## What going live looks like (≈15 min of console setup — only you can do it)

I can't create your Firebase project or Google OAuth credentials (those live in
your Google account), but the app is built to plug them in:

1. Create a free Firebase project → add a Web App → copy the config object.
2. Authentication → enable **Google** (and Email/Password) providers.
3. Firestore → create database → paste these Security Rules so each coach only
   touches their own docs:
   ```
   match /coaches/{uid}/{document=**} {
     allow read, write: if request.auth != null && request.auth.uid == uid;
   }
   ```
4. Put the config in `.env` (`VITE_FIREBASE_*`).

Then the existing `AuthContext` swaps its mock methods for Firebase
(`signInWithPopup(googleProvider)`, `onAuthStateChanged`) **without any UI change**
— the screen you already have stays exactly the same. Roster + snapshots move
from `localStorage` to Firestore, keyed by `coaches/{uid}`.

## Cost reality
- **Today:** $0 — mock auth + localStorage.
- **Live on Firebase:** still **$0** until you have real traffic; then **cents**
  (our data is tiny). The only fixed cost is hosting (Vercel Pro ~$20/mo for
  commercial use), which ~3 paying coaches cover.
