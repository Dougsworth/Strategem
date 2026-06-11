import { ArrowLeft, Mail } from "lucide-react";

// Static legal + contact pages, rendered as full-page views from the public
// site (no auth required). Shares the landing's design tokens. The footer links
// (#privacy / #terms / #contact) open these; "Back" returns to the marketing
// page. Plain, honest copy that matches what the product actually does.

// ── Single source of truth for the values you may want to change ─────────────
// NOTE: replace CONTACT_EMAIL / COMPANY_LOCATION with your real support address
// and legal jurisdiction before a wide public launch.
const CONTACT_EMAIL = "support@strategem.app";
const COMPANY_LOCATION = "Jamaica";
const EFFECTIVE_DATE = "June 11, 2026";

export type LegalDoc = "privacy" | "terms" | "contact";

const BrandMark = ({ onBack }: { onBack: () => void }) => (
  <button onClick={onBack} className="flex items-center gap-2">
    <span className="grid h-7 w-7 grid-cols-2 grid-rows-2 overflow-hidden rounded-md bg-ink">
      <span className="bg-paper" />
      <span />
      <span />
      <span className="bg-paper" />
    </span>
    <span className="font-display text-lg font-bold tracking-tight">
      STRATEGEM
    </span>
  </button>
);

const H2 = ({ children }: { children: React.ReactNode }) => (
  <h2 className="mt-10 font-display text-xl font-bold tracking-tight text-ink">
    {children}
  </h2>
);

const P = ({ children }: { children: React.ReactNode }) => (
  <p className="mt-3 leading-relaxed text-muted">{children}</p>
);

const UL = ({ children }: { children: React.ReactNode }) => (
  <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed text-muted marker:text-accent">
    {children}
  </ul>
);

const Privacy = () => (
  <>
    <H2>1. Who we are</H2>
    <P>
      Strategem is a chess-coaching analytics tool that helps coaches analyze
      their students&rsquo; publicly available games, scan paper scoresheets, and
      track improvement over time. This policy explains what we collect, why, and
      what choices you have. It covers <strong>coaches</strong> (people who create
      an account) — not the chess players whose public games are analyzed.
    </P>

    <H2>2. Information we collect</H2>
    <UL>
      <li>
        <strong>Account details.</strong> When you sign up we store your email
        address and, if you use Google sign-in, your name and profile photo as
        provided by Google. Authentication is handled by Google Firebase.
      </li>
      <li>
        <strong>Roster &amp; coaching data.</strong> The public chess usernames
        you add (Lichess / Chess.com), the analysis we compute from their public
        games, your saved report-card snapshots, spaced-repetition progress, and
        any scoresheet images you upload.
      </li>
      <li>
        <strong>Payment data.</strong> If you subscribe, payments are processed by
        our payment provider (LuniPay). We receive a confirmation of your plan and
        status; <strong>we never see or store your full card number.</strong>
      </li>
      <li>
        <strong>Usage data.</strong> Basic operational data such as scan counts
        (to enforce plan limits) and error logs.
      </li>
    </UL>

    <H2>3. What we do NOT collect</H2>
    <P>
      Game analysis runs in your own browser. We do not sell your data, we do not
      run third-party advertising trackers, and we only analyze games that are
      already public on Lichess or Chess.com.
    </P>

    <H2>4. How we use your information</H2>
    <UL>
      <li>To provide the service — analysis, report cards, scanning, and training.</li>
      <li>To authenticate you and sync your data across your devices.</li>
      <li>To enforce plan limits and process subscriptions.</li>
      <li>To generate AI-written report summaries and transcribe scoresheets.</li>
      <li>To maintain security, debug, and improve the product.</li>
    </UL>

    <H2>5. Third-party services</H2>
    <P>We rely on a small set of trusted providers:</P>
    <UL>
      <li>
        <strong>Google Firebase</strong> — authentication, database, hosting, and
        serverless functions.
      </li>
      <li>
        <strong>LuniPay</strong> — payment processing for subscriptions.
      </li>
      <li>
        <strong>Anthropic (Claude)</strong> — to transcribe uploaded scoresheets
        and write report-card summaries. Only the data needed for that task is
        sent, and it is not used to train their models on your behalf.
      </li>
      <li>
        <strong>Lichess &amp; Chess.com</strong> — public APIs we read game data
        from. We send the usernames you add; we send no personal data of yours.
      </li>
    </UL>

    <H2>6. Data retention &amp; deletion</H2>
    <P>
      We keep your data while your account is active. You can remove students,
      delete scanned games, and clear data from within the app at any time. To
      delete your account and all associated data, email us at{" "}
      <a className="text-accent hover:underline" href={`mailto:${CONTACT_EMAIL}`}>
        {CONTACT_EMAIL}
      </a>
      .
    </P>

    <H2>7. Security</H2>
    <P>
      Access to your stored data is restricted to your own account through
      server-side security rules. Scoresheet images are stored on your device and,
      where synced, scoped to your account. No system is perfectly secure, but we
      take reasonable measures to protect your information.
    </P>

    <H2>8. Children</H2>
    <P>
      Strategem is built for coaches. If a student whose games you analyze is a
      minor, you are responsible for having the right to use their public game data
      for coaching. Account holders must be 13 or older.
    </P>

    <H2>9. Your rights</H2>
    <P>
      Depending on where you live, you may have the right to access, correct,
      export, or delete your personal data. Contact us and we will help.
    </P>

    <H2>10. Changes</H2>
    <P>
      We may update this policy as the product evolves. Material changes will be
      reflected by the effective date above.
    </P>
  </>
);

const Terms = () => (
  <>
    <H2>1. Agreement</H2>
    <P>
      By creating an account or using Strategem (&ldquo;the Service&rdquo;), you
      agree to these Terms. If you do not agree, do not use the Service.
    </P>

    <H2>2. What the Service does</H2>
    <P>
      Strategem analyzes publicly available chess games, transcribes scoresheet
      photos, generates coaching reports, and provides training tools. Analysis is
      a best-effort estimate produced by chess engines and heuristics — it is a
      coaching aid, not a guarantee of accuracy or results.
    </P>

    <H2>3. Your account</H2>
    <UL>
      <li>You are responsible for activity under your account and for keeping your login secure.</li>
      <li>You must provide accurate information and be at least 13 years old.</li>
      <li>You may only analyze games and scoresheets you have the right to use.</li>
    </UL>

    <H2>4. Acceptable use</H2>
    <P>You agree not to:</P>
    <UL>
      <li>Abuse, overload, scrape, or attempt to break the Service or its providers&rsquo; APIs.</li>
      <li>Reverse-engineer, resell, or redistribute the Service without permission.</li>
      <li>Upload unlawful content or infringe anyone&rsquo;s rights.</li>
      <li>Circumvent plan limits or security controls.</li>
    </UL>

    <H2>5. Plans, billing &amp; refunds</H2>
    <UL>
      <li>
        Paid plans are billed in advance at the price shown at checkout. The free
        Starter plan is available at no cost.
      </li>
      <li>
        Payments are handled by LuniPay. By subscribing you also agree to their
        terms.
      </li>
      <li>
        You can downgrade to the free plan at any time from within the app; access
        to paid features ends when your plan changes.
      </li>
      <li>
        Because the Service delivers value immediately and relies on metered
        third-party costs (AI scanning), fees are generally non-refundable except
        where required by law. If something goes wrong, contact us — we&rsquo;ll make
        it right.
      </li>
    </UL>

    <H2>6. Third-party data &amp; services</H2>
    <P>
      The Service reads public data from Lichess and Chess.com and uses Google,
      LuniPay, and Anthropic to operate. We are not responsible for the
      availability or accuracy of those third-party services.
    </P>

    <H2>7. Intellectual property</H2>
    <P>
      The Service, its design, and its code are owned by Strategem. Your data
      remains yours. You grant us the limited rights needed to operate the Service
      for you (for example, sending a scoresheet image to our transcription
      provider so we can return the moves).
    </P>

    <H2>8. Disclaimer &amp; limitation of liability</H2>
    <P>
      The Service is provided &ldquo;as is&rdquo; without warranties of any kind.
      To the fullest extent permitted by law, Strategem is not liable for indirect
      or consequential damages, and our total liability is limited to the amount
      you paid us in the prior twelve months.
    </P>

    <H2>9. Termination</H2>
    <P>
      You may stop using the Service at any time. We may suspend or terminate
      accounts that violate these Terms or that put the Service at risk.
    </P>

    <H2>10. Changes &amp; governing law</H2>
    <P>
      We may update these Terms; continued use after changes means you accept
      them. These Terms are governed by the laws of {COMPANY_LOCATION}, without
      regard to conflict-of-law rules.
    </P>
  </>
);

const Contact = () => (
  <>
    <P>
      Questions, feedback, a billing issue, or a data request? We read every
      message and try to respond within a couple of business days.
    </P>

    <a
      href={`mailto:${CONTACT_EMAIL}`}
      className="mt-8 inline-flex items-center gap-3 rounded-2xl border border-line bg-card px-6 py-5 transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-24px_rgba(0,0,0,0.35)]"
    >
      <span className="grid h-11 w-11 place-items-center rounded-xl bg-accent/12 text-accent">
        <Mail size={20} />
      </span>
      <span>
        <span className="block font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
          Email us
        </span>
        <span className="block font-display text-lg font-semibold text-ink">
          {CONTACT_EMAIL}
        </span>
      </span>
    </a>

    <H2>Common requests</H2>
    <UL>
      <li>
        <strong>Delete my account &amp; data</strong> — email us from your account
        address and we&rsquo;ll erase everything.
      </li>
      <li>
        <strong>Billing &amp; subscriptions</strong> — upgrades, downgrades, and
        receipts.
      </li>
      <li>
        <strong>A scan or report looks wrong</strong> — send the game and we&rsquo;ll
        take a look.
      </li>
      <li>
        <strong>Feature ideas</strong> — Strategem is built with coaches; we want
        to hear them.
      </li>
    </UL>
  </>
);

const META: Record<LegalDoc, { title: string; subtitle: string }> = {
  privacy: {
    title: "Privacy Policy",
    subtitle: `Effective ${EFFECTIVE_DATE}`,
  },
  terms: {
    title: "Terms of Service",
    subtitle: `Effective ${EFFECTIVE_DATE}`,
  },
  contact: {
    title: "Contact",
    subtitle: "We'd love to hear from you",
  },
};

export const LegalPage = ({
  doc,
  onBack,
}: {
  doc: LegalDoc;
  onBack: () => void;
}) => {
  const meta = META[doc];
  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="sticky top-0 z-40 border-b border-line bg-paper/75 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-screen-xl items-center justify-between px-5 md:px-8">
          <BrandMark onBack={onBack} />
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-ink"
          >
            <ArrowLeft size={15} />
            Back to home
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-14 md:px-8 md:py-20">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent">
          {meta.subtitle}
        </p>
        <h1 className="mt-3 font-display text-[2.25rem] font-bold leading-[1.05] tracking-[-0.02em] md:text-[3rem]">
          {meta.title}
        </h1>

        <div className="mt-8 text-[15px]">
          {doc === "privacy" && <Privacy />}
          {doc === "terms" && <Terms />}
          {doc === "contact" && <Contact />}
        </div>

        <div className="mt-16 border-t border-line pt-8">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:underline"
          >
            <ArrowLeft size={15} />
            Back to Strategem
          </button>
        </div>
      </main>
    </div>
  );
};
