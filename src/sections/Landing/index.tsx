import { useEffect, useState, type MouseEvent } from "react";
import { ArrowRight } from "lucide-react";
import { Reveal } from "./Reveal";
import { PrimaryCta } from "./ui";
import { Hero } from "./Hero";
import { Logos, Features, HowItWorks, Pricing, Faq } from "./Sections";
import { LegalPage, type LegalDoc } from "../Legal/LegalPage";

// Public marketing page. Every CTA is an <a href="#start"> / #signin; click
// delegation here routes those into the auth flow, smooth-scrolls the in-page
// anchors (#features, #pricing, #faq, #sample→#how), and opens the static legal
// pages (#privacy, #terms, #contact) — so all links work without wiring a
// handler into every nested component.

const AUTH_HASHES = new Set(["#start", "#signin"]);
const LEGAL_HASHES: Record<string, LegalDoc> = {
  "#privacy": "privacy",
  "#terms": "terms",
  "#contact": "contact",
};

const BrandMark = () => (
  <a href="#top" className="flex items-center gap-2">
    <span className="grid h-7 w-7 grid-cols-2 grid-rows-2 overflow-hidden rounded-md bg-ink">
      <span className="bg-paper" />
      <span />
      <span />
      <span className="bg-paper" />
    </span>
    <span className="font-display text-lg font-bold tracking-tight">
      STRATEGEM
    </span>
  </a>
);

const Nav = () => (
  <header className="sticky top-0 z-40 border-b border-line bg-paper/75 backdrop-blur-md">
    <div className="mx-auto flex h-16 max-w-screen-xl items-center justify-between px-5 md:px-8">
      <BrandMark />
      <nav className="hidden items-center gap-8 md:flex">
        {[
          ["Features", "#features"],
          ["Pricing", "#pricing"],
          ["FAQ", "#faq"],
          ["Sign in", "#signin"],
        ].map(([label, href]) => (
          <a
            key={href}
            href={href}
            className="text-sm text-muted transition-colors hover:text-ink"
          >
            {label}
          </a>
        ))}
      </nav>
      <a
        href="#start"
        className="group inline-flex h-9 items-center gap-1.5 rounded-full bg-accent px-4 text-[13px] font-semibold text-paper transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_28px_-10px_oklch(0.56_0.19_38_/_0.6)]"
      >
        Start free
        <ArrowRight
          size={14}
          className="transition-transform group-hover:translate-x-0.5"
        />
      </a>
    </div>
  </header>
);

const CtaBand = () => (
  <section className="mx-auto max-w-screen-xl px-5 pb-16 sm:pb-24 md:px-8 md:pb-32">
    <Reveal className="relative overflow-hidden rounded-[24px] bg-ink px-6 py-14 text-paper sm:rounded-[28px] sm:px-8 sm:py-20 md:px-16 md:py-28">
      {/* glows + grid */}
      <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-accent/40 blur-[80px]" />
      <div className="pointer-events-none absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-positive/20 blur-[80px]" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(#fff 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />
      <div className="relative max-w-2xl">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[11px] text-accent">§ 05</span>
          <span className="h-px w-8 bg-paper/30" />
          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-paper/60">
            Ready when you are
          </span>
        </div>
        <h2 className="mt-5 font-display text-[2rem] font-bold leading-[1.05] tracking-[-0.02em] md:text-[3.5rem]">
          See every game clearly.{" "}
          <span className="text-accent">Start free.</span>
        </h2>
        <p className="mt-5 max-w-lg leading-relaxed text-paper/70">
          Add one student. Pull their last 20 games. See what Strategem surfaces
          in the next ten minutes — then decide.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <PrimaryCta>Start free — 1 student</PrimaryCta>
          <a
            href="#sample"
            className="inline-flex h-12 items-center gap-2 rounded-full border border-paper/20 px-6 text-sm font-semibold text-paper transition-all hover:-translate-y-0.5 hover:bg-paper/10"
          >
            See a sample report
          </a>
        </div>
      </div>
    </Reveal>
  </section>
);

const Footer = () => (
  <footer className="border-t border-line">
    <div className="mx-auto grid max-w-screen-xl gap-10 px-5 py-14 md:grid-cols-[1.5fr_1fr_1fr] md:px-8">
      <div>
        <BrandMark />
        <p className="mt-4 max-w-xs text-sm text-muted">
          Your students&rsquo; games, decoded. The coaching workspace built
          around analyze, assign, retest.
        </p>
      </div>
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
          Product
        </p>
        <ul className="mt-4 space-y-2.5 text-sm">
          {[
            ["Features", "#features"],
            ["Pricing", "#pricing"],
            ["FAQ", "#faq"],
            ["Sign in", "#signin"],
          ].map(([l, h]) => (
            <li key={h}>
              <a href={h} className="text-muted transition-colors hover:text-ink">
                {l}
              </a>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
          Company
        </p>
        <ul className="mt-4 space-y-2.5 text-sm">
          {[
            ["Contact", "#contact"],
            ["Privacy", "#privacy"],
            ["Terms", "#terms"],
          ].map(([l, h], i) => (
            <li key={`${h}-${i}`}>
              <a href={h} className="text-muted transition-colors hover:text-ink">
                {l}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
    <div className="border-t border-line">
      <div className="mx-auto flex max-w-screen-xl flex-col items-center justify-between gap-2 px-5 py-6 text-xs text-muted md:flex-row md:px-8">
        <span>© {2026} Strategem. All rights reserved.</span>
        <span className="font-mono uppercase tracking-[0.18em]">
          Your students&rsquo; games, decoded
        </span>
      </div>
    </div>
  </footer>
);

export const LandingPage = ({
  onGetStarted,
}: {
  onGetStarted: (mode: "in" | "up") => void;
}) => {
  // Static legal/contact pages render in place of the marketing page; the URL
  // hash drives them so they're deep-linkable and the browser Back button works.
  const [legal, setLegal] = useState<LegalDoc | null>(
    () => LEGAL_HASHES[window.location.hash] ?? null,
  );

  useEffect(() => {
    const onHash = () => setLegal(LEGAL_HASHES[window.location.hash] ?? null);
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  function closeLegal() {
    if (window.location.hash) {
      // drop the hash without adding a history entry, then sync state
      history.replaceState(null, "", window.location.pathname + window.location.search);
    }
    setLegal(null);
    window.scrollTo({ top: 0 });
  }

  function handleClick(e: MouseEvent<HTMLDivElement>) {
    const anchor = (e.target as HTMLElement).closest("a[href]");
    if (!anchor) return;
    const href = anchor.getAttribute("href") ?? "";
    if (!href.startsWith("#")) return;
    e.preventDefault();
    if (AUTH_HASHES.has(href)) {
      // "Sign in" opens the sign-in form; every other CTA opens sign-up.
      onGetStarted(href === "#signin" ? "in" : "up");
      return;
    }
    if (LEGAL_HASHES[href]) {
      setLegal(LEGAL_HASHES[href]);
      window.scrollTo({ top: 0 });
      return;
    }
    if (href === "#top") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    // "See a sample report" → the How-it-works walkthrough (real product shots).
    const targetId = href === "#sample" ? "how" : href.slice(1);
    document
      .getElementById(targetId)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (legal) return <LegalPage doc={legal} onBack={closeLegal} />;

  return (
    <div id="top" onClick={handleClick} className="min-h-screen bg-paper text-ink">
      <Nav />
      <main>
        <Hero />
        <Logos />
        <Features />
        <HowItWorks />
        <Pricing />
        <Faq />
        <CtaBand />
      </main>
      <Footer />
    </div>
  );
};
