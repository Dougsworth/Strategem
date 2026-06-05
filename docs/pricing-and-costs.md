# Strategem — Cost & Pricing Analysis

_Prices verified 2026-06-04 against official pricing pages (sources at the bottom)._

## TL;DR — the one number that matters

**The expensive part of a chess analytics tool is free for us.** All the heavy
lifting — game analysis, accuracy, phase strength, tactics, puzzles — runs
**client-side** (chess.js + stockfish.wasm) against the **free Lichess API**.
That's **$0 marginal cost per student**.

The only thing that costs money per use is **AI prose** (report-card narratives,
lesson plans) — and that's **fractions of a cent**. So:

> Charge for AI-written coaching output and time saved. It costs ~1¢ to serve
> and is worth $1+ of a coach's time. Margins are ~99%.

Your real cost at small scale isn't usage — it's the **fixed ~$45/mo platform
floor** (hosting + auth/db). AI only becomes a line item at thousands of
students/month.

---

## 1. What each AI action actually costs

Claude API pricing (per million tokens):

| Model | Input | Output | Cache read (90% off input) |
|---|---|---|---|
| **Haiku 4.5** | $1 | $5 | $0.10 |
| **Sonnet 4.6** | $3 | $15 | $0.30 |
| **Opus 4.8** | $5 | $25 | $0.50 |

Per call (report card ≈ 1,500 in + 450 out; lesson plan ≈ 1,500 in + 1,200 out):

| Action | Haiku | Sonnet | Opus |
|---|---|---|---|
| **Report-card narrative** | **0.38¢** | 1.13¢ | 1.88¢ |
| …with prompt caching | **0.24¢** | 0.72¢ | 1.20¢ |
| **Lesson plan** | **0.75¢** | 2.25¢ | 3.75¢ |
| **Full deliverable** (card + plan) | **~1.1¢** | ~3.4¢ | ~5.6¢ |

Two levers that cut this further:
- **Prompt caching** — our system prompt + the stats schema are identical on
  every call, so cache them. ~35–40% off the input-heavy report card.
- **Batch API** — 50% off, if we pre-generate (e.g. weekly lesson plans
  overnight). Async only, so not for live "Draft now" clicks.

**Reality check:** 1,000 students generating a card **and** a plan each month =
**~$34/mo** in AI on Sonnet, **~$11/mo** on Haiku. Trivial.

### Recommended model strategy
- **Haiku 4.5** for the routine report-card narrative — sub-half-cent, fast,
  plenty good for "turn these numbers into a paragraph."
- **Sonnet 4.6** for lesson plans, where reasoning/structure matters.
- **Opus 4.8** only as a premium toggle — 5× Haiku's cost (plus a tokenizer that
  emits more tokens), not worth it for everyday output.
- Always cache the system prompt. **Never** let the model invent numbers — it
  only writes prose around figures we compute deterministically.

---

## 2. Fixed platform costs (and their free tiers)

| Need | Free tier | First paid | Notes |
|---|---|---|---|
| **Auth** (Clerk) | 50,000 MRU | $25/mo, then $0.02/MRU | Covers you well past launch |
| **Auth+DB+storage** (Supabase) | 50K MAU, 500 MB DB | **$25/mo** (8 GB DB, 100K MAU) | One vendor for auth+db+storage |
| **DB only** (Neon) | 0.5 GB | $5/mo floor | Cheaper if you bring your own auth |
| **Hosting** (Vercel) | Hobby (non-commercial) | **$20/seat/mo** | Commercial use ⇒ Pro is the floor |
| **Payments** (Stripe) | — | **2.9% + $0.30**/charge | No monthly fee |

**Realistic starting stack:** Vercel Pro ($20) + Supabase Pro ($25, gives
auth + db + storage in one) = **~$45/mo fixed**, plus ~3% of revenue to Stripe,
plus pennies of AI. You can launch on **all-free tiers ($0)** until you have
paying users — Vercel Hobby (technically non-commercial, fine for a private
beta), Supabase Free, Clerk Free.

Our data footprint is tiny (students, report snapshots, lesson-plan text — all
small structured text), so DB cost never bites.

---

## 3. What to charge for — and why it's cheap to serve

Anchor the paid tiers on things that are **cheap for us but high-value to the
coach.** The product already ships these tiers (`src/lib/plans.ts`):

| Tier | Price | Gated on | Our cost to serve |
|---|---|---|---|
| **Starter** | $0 | 1 student, client-side analysis, rule-based summaries | **$0** (acquisition) |
| **Coach** | $19/mo | Unlimited students, **AI summaries + lesson plans**, PDFs, growth history | **~pennies** of AI + share of fixed |
| **Academy** | $49/mo | Multi-coach, shared roster, groups, branding | Mostly fixed; a little more DB |

**Margin at one paying Coach ($19/mo):**
- Stripe: −$0.85 (2.9% + $0.30)
- AI: a coach with ~30 students refreshing reports/plans monthly ≈ **−$0.30–$1.00**
- Net ≈ **$17+/mo per Coach** before fixed costs. The $45/mo floor is covered by
  **~3 Coach subscribers.** Everything after that is ~95% margin.

### Cheapest high-value things to charge for
1. **AI report-card narratives** — ~0.24¢ cached, feels like magic, saves the
   coach 10 minutes of writing. Best margin in the product.
2. **AI lesson plans** — ~2¢, a whole prep session in one click.
3. **Report-card PDFs / branding** — $0 to generate (client-side print), pure
   perceived value for Academy.
4. **Unlimited students + growth history** — costs only a few KB of DB rows.

### Things to NOT build paywalls around (they're free anyway)
- The core analysis, puzzle trainer, phase/tactics breakdown — keep generous in
  the free tier; they cost us nothing and they're the hook.

---

## 4. Principles to "charge without spending too much"

1. **Keep compute on the client.** stockfish.wasm + chess.js mean analysis scales
   for free — no per-student server cost, ever.
2. **AI writes prose, never numbers.** Cheap models (Haiku) + caching keep AI a
   rounding error; determinism keeps it trustworthy.
3. **Cache + batch the AI.** Cache the system prompt (−40%); batch any
   non-interactive generation (−50%).
4. **Stay on free tiers until you have revenue.** $0 to run a beta; flip to the
   ~$45/mo stack only when paying users cover it (≈3 subscribers).
5. **Sell time, not tokens.** A coach pays $19 to not spend an hour writing report
   cards — the 1¢ of AI behind it is irrelevant to them and to your margin.

---

## 5. Where this is wired today vs. next

- **Today:** auth + membership are a **front-end mock** (local, $0). No AI is
  called yet — the "Coach Summary" is the free rule-based generator.
- **To go live:** (a) swap the mock auth for Clerk/Supabase, (b) add Stripe
  Checkout for the Coach/Academy tiers, (c) add one serverless route that calls
  Claude (Haiku) behind the `generateNarrative()` seam, with the system prompt
  cached. That's the entire paid-path build.

---

### Sources (fetched 2026-06-04)
- Anthropic Claude API pricing — https://platform.claude.com/docs/en/about-claude/pricing
- Clerk pricing — https://clerk.com/pricing
- Supabase pricing — https://supabase.com/pricing
- Stripe pricing — https://stripe.com/pricing
- Vercel pricing — https://vercel.com/pricing
- Neon pricing — https://neon.com/pricing

_Anthropic / Clerk / Supabase figures pulled directly from their live pricing
pages; Stripe / Vercel / Neon from official-page search snippets — do a final
direct check before committing contractual pricing._
