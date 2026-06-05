const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

// LuniPay (Stripe-based) checkout for Coach/Academy subscriptions.
//   createCheckout  — client calls this; we create a hosted checkout session
//                     with our SECRET key and return the URL to redirect to.
//   lunipayWebhook  — LuniPay calls this when a session completes; we RE-FETCH
//                     the session from LuniPay (source of truth) to verify it's
//                     paid, then flip coaches/{uid}.plan in Firestore.
//
// The secret key never reaches the browser — it's a Firebase secret:
//   firebase functions:secrets:set LUNIPAY_SECRET_KEY

initializeApp();
const db = getFirestore();

const LUNIPAY_SECRET = defineSecret("LUNIPAY_SECRET_KEY");
const LUNI_BASE = "https://www.lunipay.io/api/v1";

// Claude (Anthropic) API key for reading scoresheet photos. Set with:
//   firebase functions:secrets:set ANTHROPIC_API_KEY
const ANTHROPIC_KEY = defineSecret("ANTHROPIC_API_KEY");

// Plan → price in the smallest currency unit (cents). Keep in sync with
// src/lib/plans.ts.
const PRICES = {
  pro: { amount: 1900, name: "Strategem Coach (monthly)" },
  team: { amount: 3900, name: "Strategem Academy (monthly)" },
  club: { amount: 9900, name: "Strategem Club (monthly)" },
};

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
  { secrets: [LUNIPAY_SECRET], cors: true, maxInstances: 5 },
  async (req) => {
    if (!req.auth) {
      throw new HttpsError("unauthenticated", "Please sign in first.");
    }
    const plan = req.data && req.data.plan;
    const origin = (req.data && req.data.origin) || DEFAULT_ORIGIN;
    const price = PRICES[plan];
    if (!price) {
      throw new HttpsError("invalid-argument", `Unknown plan: ${plan}`);
    }

    const resp = await fetch(`${LUNI_BASE}/checkout/sessions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LUNIPAY_SECRET.value()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: price.amount,
        currency: "usd",
        line_items: [{ name: price.name, quantity: 1, amount: price.amount }],
        success_url: `${origin}/?checkout=success`,
        cancel_url: `${origin}/?checkout=cancel`,
        customer_email: req.auth.token.email || undefined,
        // Reconciliation: the webhook reads these back to know who/what to flip.
        metadata: { uid: req.auth.uid, plan },
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new HttpsError(
        "internal",
        `LuniPay create-session failed: ${resp.status} ${text.slice(0, 200)}`,
      );
    }
    const session = await resp.json();
    return { url: session.url, id: session.id };
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

// Confirm a checkout immediately on return from LuniPay — so the plan activates
// without waiting on the (flaky in test mode) webhook. Re-fetches the session,
// verifies it's paid AND belongs to the caller, then flips their plan. The
// webhook stays as a backup; this is the fast path.
exports.confirmCheckout = onCall(
  { secrets: [LUNIPAY_SECRET], maxInstances: 5 },
  async (req) => {
    if (!req.auth) {
      throw new HttpsError("unauthenticated", "Please sign in first.");
    }
    const sessionId = req.data && req.data.sessionId;
    if (!sessionId) {
      throw new HttpsError("invalid-argument", "No session id.");
    }
    const r = await fetch(`${LUNI_BASE}/checkout/sessions/${sessionId}`, {
      headers: { Authorization: `Bearer ${LUNIPAY_SECRET.value()}` },
    });
    if (!r.ok) return { paid: false };
    const session = await r.json();
    const paid =
      session.payment_status === "paid" || session.status === "COMPLETE";
    const uid = session.metadata && session.metadata.uid;
    const plan = session.metadata && session.metadata.plan;
    // Only ever flip the caller's OWN session.
    if (paid && uid === req.auth.uid && plan) {
      await db.doc(`coaches/${req.auth.uid}`).set(
        { plan, billing: { lastSession: sessionId, updatedAt: Date.now() } },
        { merge: true },
      );
      return { paid: true, plan };
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

exports.lunipayWebhook = onRequest(
  { secrets: [LUNIPAY_SECRET], maxInstances: 5 },
  async (req, res) => {
    try {
      const event = req.body || {};
      // Be defensive about the event shape; we only need the session id.
      const sessionId =
        (event.data && (event.data.id || (event.data.object && event.data.object.id))) ||
        event.id;
      if (!sessionId) {
        res.status(400).send("missing session id");
        return;
      }

      // Verify against LuniPay directly — safe even if the webhook were forged.
      const r = await fetch(`${LUNI_BASE}/checkout/sessions/${sessionId}`, {
        headers: { Authorization: `Bearer ${LUNIPAY_SECRET.value()}` },
      });
      if (!r.ok) {
        res.status(200).send("ignored");
        return;
      }
      const session = await r.json();
      const paid =
        session.payment_status === "paid" || session.status === "COMPLETE";
      const uid = session.metadata && session.metadata.uid;
      const plan = session.metadata && session.metadata.plan;

      if (paid && uid && plan) {
        await db.doc(`coaches/${uid}`).set(
          { plan, billing: { lastSession: sessionId, updatedAt: Date.now() } },
          { merge: true },
        );
      }
      res.status(200).send("ok");
    } catch (err) {
      console.error("webhook error", err);
      res.status(200).send("ok"); // ack so LuniPay doesn't hammer retries
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
  "This image is a chess scoresheet (the paper players fill in during a game). " +
  "Transcribe ALL the moves into standard algebraic notation as PGN movetext only, " +
  "e.g. '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6'. Read both columns (White then Black) row by row.\n\n" +
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
        max_tokens: 1024,
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
