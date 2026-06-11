const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

// Polar (merchant of record) subscriptions for Coach/Academy/Club. Polar gives
// us real auto-renewing subscriptions AND pays out to Jamaica (via Stripe
// Connect Express), and handles VAT/sales tax as the merchant of record.
//   createCheckout  — client calls this; we create a hosted Polar checkout for
//                     the plan's product and return the URL to redirect to.
//   confirmCheckout — on return, we read the checkout status and flip the plan
//                     instantly (fast path; the webhook is the source of truth).
//   polarWebhook    — Polar calls this on subscription/order events; we verify
//                     the Standard-Webhooks signature, then reconcile
//                     coaches/{uid}.plan (active/renewed → paid; revoked → free).
//
// Secrets never reach the browser — set them as Firebase secrets:
//   firebase functions:secrets:set POLAR_ACCESS_TOKEN
//   firebase functions:secrets:set POLAR_WEBHOOK_SECRET

initializeApp();
const db = getFirestore();

const POLAR_ACCESS_TOKEN = defineSecret("POLAR_ACCESS_TOKEN");
const POLAR_WEBHOOK_SECRET = defineSecret("POLAR_WEBHOOK_SECRET");

// "sandbox" while testing, "production" once Polar is live. Flip this and
// redeploy createCheckout + confirmCheckout to switch environments.
const POLAR_SERVER = "sandbox";

// Plan → Polar product id. Create one product per plan in the Polar dashboard
// (Coach $19/mo, Academy $39/mo, Club $99/mo) and paste their ids here.
// TODO(launch): replace the REPLACE_ME_* placeholders with real product ids.
const POLAR_PRODUCTS = {
  pro: "REPLACE_ME_COACH_PRODUCT_ID",
  team: "REPLACE_ME_ACADEMY_PRODUCT_ID",
  club: "REPLACE_ME_CLUB_PRODUCT_ID",
};

// Reverse map (product id → plan) so a webhook can resolve the plan even if the
// event metadata is ever missing.
const PLAN_BY_PRODUCT = Object.fromEntries(
  Object.entries(POLAR_PRODUCTS).map(([plan, pid]) => [pid, plan]),
);

// Lazy Polar client — so the non-payment functions in this file don't pay the
// SDK import cost on cold start.
function polarClient() {
  const { Polar } = require("@polar-sh/sdk");
  return new Polar({
    accessToken: POLAR_ACCESS_TOKEN.value(),
    server: POLAR_SERVER,
  });
}

// Claude (Anthropic) API key for reading scoresheet photos. Set with:
//   firebase functions:secrets:set ANTHROPIC_API_KEY
const ANTHROPIC_KEY = defineSecret("ANTHROPIC_API_KEY");

const DEFAULT_ORIGIN = "https://chesssage-f5370.web.app";

// Server-side daily scan quota — the REAL enforcement (the client quota is just
// fast UX feedback). Mirror of scanPerDay in src/lib/entitlements.ts. The
// counter lives at coaches/{uid}.usage and is writable ONLY by this admin SDK
// (Firestore rules forbid the client from touching plan/usage), so clearing
// localStorage can't bypass it.
const PLAN_SCANS = { free: 1, pro: 8, team: 20, club: 60 };

async function enforceScanQuota(uid) {
  const ref = db.doc(`coaches/${uid}`);
  const today = new Date().toISOString().slice(0, 10);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.exists ? snap.data() : {};
    const plan = data.plan || "free";
    const limit = PLAN_SCANS[plan] != null ? PLAN_SCANS[plan] : PLAN_SCANS.free;
    const usage = data.usage || {};
    const used = usage.scanDate === today ? usage.scanCount || 0 : 0;
    if (used >= limit) {
      throw new HttpsError(
        "resource-exhausted",
        `You've used your ${limit} scan${limit === 1 ? "" : "s"} for today.` +
          (plan === "free" ? " Upgrade for more." : " Resets tomorrow."),
      );
    }
    tx.set(ref, { usage: { scanDate: today, scanCount: used + 1 } }, { merge: true });
  });
}

// maxInstances caps concurrency → caps the blast radius of any bug, so a
// runaway can't rack up a surprise bill. Plenty for a coaching-app's volume.
exports.createCheckout = onCall(
  { secrets: [POLAR_ACCESS_TOKEN], cors: true, maxInstances: 5 },
  async (req) => {
    if (!req.auth) {
      throw new HttpsError("unauthenticated", "Please sign in first.");
    }
    const plan = req.data && req.data.plan;
    const origin = (req.data && req.data.origin) || DEFAULT_ORIGIN;
    const product = POLAR_PRODUCTS[plan];
    if (!product) {
      throw new HttpsError("invalid-argument", `Unknown plan: ${plan}`);
    }
    if (product.startsWith("REPLACE_ME")) {
      throw new HttpsError(
        "failed-precondition",
        "Billing isn't configured yet (missing Polar product id).",
      );
    }

    let checkout;
    try {
      checkout = await polarClient().checkouts.create({
        products: [product],
        successUrl: `${origin}/?checkout=success`,
        customerEmail: req.auth.token.email || undefined,
        // Reconciliation: the webhook + confirm path read these back to know
        // who/what to flip. Polar copies checkout metadata onto the resulting
        // order and subscription.
        metadata: { uid: req.auth.uid, plan },
      });
    } catch (err) {
      throw new HttpsError(
        "internal",
        `Polar checkout failed: ${(err && err.message) || err}`,
      );
    }
    return { url: checkout.url, id: checkout.id };
  },
);

// ── Clubs: multiple coaches sharing one roster (Club plan) ──────────────────
// All membership changes go through these functions (admin SDK), so a client
// can't forge membership or self-join. The shared roster itself lives at
// clubs/{clubId}.roster and members edit it directly (guarded by rules).

function genInviteCode() {
  // 6 chars, unambiguous (no 0/O/1/I), e.g. "K7QF3M".
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) {
    s += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return s;
}

// Create a club. Requires the Club plan. Seeds the shared roster from the
// owner's personal roster so they don't start empty.
exports.createClub = onCall({ maxInstances: 5 }, async (req) => {
  if (!req.auth) throw new HttpsError("unauthenticated", "Please sign in first.");
  const uid = req.auth.uid;
  const coachRef = db.doc(`coaches/${uid}`);
  const coachSnap = await coachRef.get();
  const coach = coachSnap.exists ? coachSnap.data() : {};
  if (coach.plan !== "club") {
    throw new HttpsError("permission-denied", "Creating a club needs the Club plan.");
  }
  if (coach.clubId) {
    const ex = await db.doc(`clubs/${coach.clubId}`).get();
    if (ex.exists) return { clubId: coach.clubId, inviteCode: ex.data().inviteCode };
  }
  const clubRef = db.collection("clubs").doc();
  const inviteCode = genInviteCode();
  await clubRef.set({
    ownerUid: uid,
    name: (coach.branding && coach.branding.studioName) || `${coach.name || "My"} Club`,
    inviteCode,
    memberUids: [uid],
    roster: Array.isArray(coach.roster) ? coach.roster : [],
    selected: coach.selected || null,
    createdAt: Date.now(),
  });
  await coachRef.set({ clubId: clubRef.id }, { merge: true });
  return { clubId: clubRef.id, inviteCode };
});

// Join a club with an invite code.
exports.joinClub = onCall({ maxInstances: 5 }, async (req) => {
  if (!req.auth) throw new HttpsError("unauthenticated", "Please sign in first.");
  const uid = req.auth.uid;
  const code = ((req.data && req.data.code) || "").trim().toUpperCase();
  if (!code) throw new HttpsError("invalid-argument", "Enter an invite code.");
  const q = await db.collection("clubs").where("inviteCode", "==", code).limit(1).get();
  if (q.empty) throw new HttpsError("not-found", "That code didn't match a club.");
  const clubRef = q.docs[0].ref;
  await clubRef.update({ memberUids: FieldValue.arrayUnion(uid) });
  await db.doc(`coaches/${uid}`).set({ clubId: clubRef.id }, { merge: true });
  return { clubId: clubRef.id };
});

// Leave a club. The owner leaving disbands it (and detaches every member).
exports.leaveClub = onCall({ maxInstances: 5 }, async (req) => {
  if (!req.auth) throw new HttpsError("unauthenticated", "Please sign in first.");
  const uid = req.auth.uid;
  const coachSnap = await db.doc(`coaches/${uid}`).get();
  const clubId = coachSnap.exists ? coachSnap.data().clubId : null;
  if (!clubId) return { ok: true };
  const clubRef = db.doc(`clubs/${clubId}`);
  const clubSnap = await clubRef.get();
  if (clubSnap.exists && clubSnap.data().ownerUid === uid) {
    // Owner disbands: clear clubId for all members, then delete the club.
    const batch = db.batch();
    for (const m of clubSnap.data().memberUids || []) {
      batch.set(db.doc(`coaches/${m}`), { clubId: FieldValue.delete() }, { merge: true });
    }
    batch.delete(clubRef);
    await batch.commit();
  } else {
    if (clubSnap.exists) {
      await clubRef.update({ memberUids: FieldValue.arrayRemove(uid) });
    }
    await db.doc(`coaches/${uid}`).set({ clubId: FieldValue.delete() }, { merge: true });
  }
  return { ok: true };
});

// Confirm a checkout immediately on return from Polar — so the plan activates
// without waiting on the webhook. Reads the checkout, verifies it succeeded AND
// belongs to the caller, then flips their plan. The webhook stays the source of
// truth (and handles renewals + cancellations).
exports.confirmCheckout = onCall(
  { secrets: [POLAR_ACCESS_TOKEN], maxInstances: 5 },
  async (req) => {
    if (!req.auth) {
      throw new HttpsError("unauthenticated", "Please sign in first.");
    }
    const sessionId = req.data && req.data.sessionId;
    if (!sessionId) {
      throw new HttpsError("invalid-argument", "No session id.");
    }
    let checkout;
    try {
      checkout = await polarClient().checkouts.get({ id: sessionId });
    } catch {
      return { paid: false };
    }
    // Polar checkout status goes open → confirmed → succeeded. Either of the
    // latter two means the payment is captured and the subscription is being
    // provisioned, so it's safe to grant access.
    const paid =
      checkout.status === "succeeded" || checkout.status === "confirmed";
    const md = checkout.metadata || {};
    // Only ever flip the caller's OWN checkout.
    if (paid && md.uid === req.auth.uid && md.plan) {
      await db.doc(`coaches/${req.auth.uid}`).set(
        {
          plan: md.plan,
          billing: { lastCheckout: sessionId, updatedAt: Date.now() },
        },
        { merge: true },
      );
      return { paid: true, plan: md.plan };
    }
    return { paid };
  },
);

// Self-service downgrade to free. Plan is server-only now (rules block client
// plan writes), so the "downgrade" button calls this. It can ONLY set free —
// upgrades always go through paid checkout + the webhook.
exports.selfDowngrade = onCall({ maxInstances: 5 }, async (req) => {
  if (!req.auth) {
    throw new HttpsError("unauthenticated", "Please sign in first.");
  }
  await db.doc(`coaches/${req.auth.uid}`).set({ plan: "free" }, { merge: true });
  return { ok: true };
});

// Polar calls this on subscription/order events. We verify the Standard-Webhooks
// signature with our endpoint secret (so a forged request can't grant a plan),
// then reconcile coaches/{uid}.plan:
//   active / created / updated / order.paid → set the paid plan (covers renewals)
//   revoked (access actually ended)         → downgrade to free
// A cancel that's still inside the paid period, and past_due (Polar dunning),
// keep the plan until Polar ultimately revokes it.
exports.polarWebhook = onRequest(
  { secrets: [POLAR_WEBHOOK_SECRET], maxInstances: 5 },
  async (req, res) => {
    let event;
    try {
      const { validateEvent } = require("@polar-sh/sdk/webhooks");
      event = validateEvent(
        req.rawBody,
        req.headers,
        POLAR_WEBHOOK_SECRET.value(),
      );
    } catch (err) {
      console.error("polar webhook signature invalid", err && err.message);
      res.status(403).send("invalid signature");
      return;
    }

    try {
      const data = event.data || {};
      const md = data.metadata || {};
      const uid = md.uid;
      // Plan from metadata, falling back to the product-id mapping.
      const plan =
        md.plan || PLAN_BY_PRODUCT[data.productId || data.product_id] || null;

      const setPlan = async (p) => {
        if (!uid) return;
        await db.doc(`coaches/${uid}`).set(
          {
            plan: p,
            billing: {
              subscriptionId: data.id || data.subscriptionId || null,
              status: data.status || event.type,
              updatedAt: Date.now(),
            },
          },
          { merge: true },
        );
      };

      switch (event.type) {
        case "subscription.active":
        case "subscription.created":
        case "subscription.updated":
        case "order.paid":
          if (plan) await setPlan(plan);
          break;
        case "subscription.revoked":
          await setPlan("free");
          break;
        // subscription.canceled / uncanceled / past_due → no plan change yet.
        default:
          break;
      }
      res.status(200).send("ok");
    } catch (err) {
      console.error("polar webhook error", err);
      res.status(200).send("ok"); // ack so Polar doesn't hammer retries
    }
  },
);

// AI report-card narrative (Coach+). Cheap (Haiku, cached client-side per report
// version). Plan is checked server-side so only paid coaches can spend tokens.
const NARRATIVE_SYSTEM =
  "You are an experienced, encouraging chess coach writing a short report-card " +
  "summary about a student, for their coach to read. You are given ONLY structured " +
  "analysis data as JSON. Hard rules: use ONLY the numbers and facts provided — " +
  "NEVER invent ratings, percentages, opponents, move names, or game details. Write " +
  "2 short paragraphs (about 5–7 sentences total), warm but honest. Refer to their " +
  "concrete patterns by name (the recurring mistakes, weakest phase, and last game). " +
  "Finish with the single most important thing to work on next. Plain prose only — " +
  "no markdown, headings, or bullet points.";

exports.generateNarrative = onCall(
  { secrets: [ANTHROPIC_KEY], maxInstances: 5, timeoutSeconds: 30 },
  async (req) => {
    if (!req.auth) {
      throw new HttpsError("unauthenticated", "Please sign in first.");
    }
    // Coach plan or higher only — this is the gate that protects token spend.
    const coachSnap = await db.doc(`coaches/${req.auth.uid}`).get();
    const plan = coachSnap.exists ? coachSnap.data().plan : "free";
    if (!plan || plan === "free") {
      throw new HttpsError(
        "permission-denied",
        "AI coach summaries are part of the Coach plan.",
      );
    }
    const summary = req.data && req.data.summary;
    if (!summary) {
      throw new HttpsError("invalid-argument", "No analysis data was provided.");
    }

    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_KEY.value(),
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 500,
        system: NARRATIVE_SYSTEM,
        messages: [
          {
            role: "user",
            content: "Student analysis data (JSON):\n" + JSON.stringify(summary),
          },
        ],
      }),
    });
    if (!resp.ok) {
      const text = await resp.text();
      throw new HttpsError("internal", `Narrative failed: ${resp.status} ${text.slice(0, 200)}`);
    }
    const data = await resp.json();
    const narrative = (data.content || []).map((c) => c.text || "").join("").trim();
    return { narrative };
  },
);

const SCORESHEET_PROMPT =
  "This image is one or MORE chess scoresheets (the paper players fill in during a game). " +
  "Transcribe the ENTIRE game as ONE continuous sequence of standard algebraic notation, " +
  "PGN movetext only, e.g. '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6'.\n\n" +
  "READING ORDER (follow the move numbers):\n" +
  "• A sheet has several numbered columns (e.g. moves 1–20, then 21–40, then 41–60). Read each " +
  "column TOP-TO-BOTTOM, columns LEFT-TO-RIGHT. In each numbered row the WHITE move is the left " +
  "cell, the BLACK move the right cell.\n" +
  "• The image may contain MULTIPLE sheets placed side by side — a long game continued onto a " +
  "second (or third) sheet. The sheet(s) to the RIGHT CONTINUE THE SAME GAME. Keep transcribing " +
  "in order onto the end of the sequence. Continuation sheets often RESTART numbering at 1 — " +
  "IGNORE the restart; do NOT begin a new game, just keep appending moves. Use the same two " +
  "players throughout (read the names once).\n\n" +
  "CRITICAL — replay the game in your head as you read, and only ever output a move that " +
  "is LEGAL in the current position. Use these rules to resolve messy handwriting:\n" +
  "• No leading piece letter = a PAWN move (e4, exd5, e8=Q). A leading capital K/Q/R/B/N " +
  "is that piece. Files are a–h, ranks 1–8.\n" +
  "• Castling is O-O (kingside) or O-O-O (queenside) — letter O, not zero.\n" +
  "• Captures use x (exd5, Nxe4), checks +, checkmate #, promotion =Q/=R/=B/=N, en passant " +
  "is written like a normal pawn capture.\n" +
  "• Handwritten look-alikes are common — c/e, b/d/h, a/o, g/q, n/h, 1/7, 3/8, 5/6, 6/8, 0/O. " +
  "When a letter or digit is ambiguous, pick the reading that yields a LEGAL move in that " +
  "position; if two readings are both legal, prefer the one closest to the handwriting.\n" +
  "• If a move is truly illegible, infer the most likely LEGAL move that keeps the game " +
  "consistent rather than emitting an illegal one.\n" +
  "• IGNORE crossed-out, struck-through, scribbled-over, or rewritten moves — a player " +
  "who changes their mind strikes a line through the wrong move and writes the real one. " +
  "Transcribe ONLY the final intended move in each cell, never the cancelled one.\n\n" +
  "Output ONLY the movetext — no headers, no result, no commentary, no code fences. " +
  "Do NOT write any sentence, explanation, or preamble: your reply MUST start with '1.'.";

function cleanPgn(text) {
  let t = text
    .replace(/```[a-z]*/gi, "")
    .replace(/^\s*PGN[:\s]*/i, "")
    .trim();
  // Models sometimes add a preamble ("I'll reconstruct…") before the moves.
  // Cut everything before the first numbered move ("1." + a move).
  const m = t.match(/\b1\s*\.\s*[a-hKQRBNO0]/);
  if (m && m.index > 0) t = t.slice(m.index);
  return t.trim();
}

exports.transcribeScoresheet = onCall(
  { secrets: [ANTHROPIC_KEY], maxInstances: 5, memory: "512MiB", timeoutSeconds: 60 },
  async (req) => {
    if (!req.auth) {
      throw new HttpsError("unauthenticated", "Please sign in first.");
    }
    const imageBase64 = req.data && req.data.imageBase64;
    const mimeType = (req.data && req.data.mimeType) || "image/jpeg";
    if (!imageBase64) {
      throw new HttpsError("invalid-argument", "No image was provided.");
    }

    // Enforce the per-plan daily scan limit BEFORE spending money on Claude.
    await enforceScanQuota(req.auth.uid);

    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_KEY.value(),
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 2048, // multi-sheet games can run 100+ moves
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: { type: "base64", media_type: mimeType, data: imageBase64 },
              },
              { type: "text", text: SCORESHEET_PROMPT },
            ],
          },
        ],
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new HttpsError("internal", `Vision read failed: ${resp.status} ${text.slice(0, 200)}`);
    }
    const data = await resp.json();
    const text = (data.content || []).map((c) => c.text || "").join("").trim();
    return { pgn: cleanPgn(text) };
  },
);
