import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  ExternalLink,
  FlipVertical2,
  SkipBack,
  SkipForward,
} from "lucide-react";
import { Chess } from "chess.js";
import type { Color } from "chess.js";
import { InteractiveBoard } from "@/components/InteractiveBoard";
import { useBoardSize } from "@/components/useBoardSize";
import { importToLichess } from "@/lib/scoresheet";
import { snapMove } from "@/lib/chess/snapMove";

interface ParsedGame {
  moves: string[];
  headers: Record<string, string>;
  ok: boolean;
  /** Set when even the smart matcher couldn't place a move — we keep the legal prefix. */
  truncated: { atMoveNo: number; token: string } | null;
  /** Misreads we auto-corrected to a legal move, e.g. "c4" → "e4". */
  corrections: { from: string; to: string }[];
}

// Lenient PGN reader. Handwriting OCR is never perfect, so we replay token-by-
// token and SNAP each one to the most plausible legal move (snapMove) — pawns
// when there's no piece letter, nearest legal move otherwise — instead of
// rejecting the game on the first imperfect token.
function parseGame(pgn: string): ParsedGame {
  const headers: Record<string, string> = {};
  for (const m of pgn.matchAll(/\[(\w+)\s+"([^"]*)"\]/g)) headers[m[1]] = m[2];

  // Fast path: a fully-legal game loads cleanly (no corrections needed).
  try {
    const c = new Chess();
    c.loadPgn(pgn);
    const moves = c.history();
    if (moves.length > 0) {
      return {
        moves,
        headers: { ...c.header(), ...headers },
        ok: true,
        truncated: null,
        corrections: [],
      };
    }
  } catch {
    /* fall through to the smart token-by-token replay */
  }

  const c = new Chess();
  const body = pgn
    .replace(/\[[^\]]*\]/g, " ") // headers
    .replace(/\{[^}]*\}/g, " ") // comments
    .replace(/\$\d+/g, " ") // NAGs
    .replace(/\b(1-0|0-1|1\/2-1\/2|\*)\b/g, " ") // results
    .replace(/\d+\.(\.\.)?/g, " "); // move numbers "12." / "12..."
  const tokens = body.split(/\s+/).filter(Boolean);

  const moves: string[] = [];
  const corrections: { from: string; to: string }[] = [];
  let truncated: ParsedGame["truncated"] = null;
  for (const raw of tokens) {
    const snapped = snapMove(c, raw);
    if (!snapped) {
      truncated = { atMoveNo: Math.floor(moves.length / 2) + 1, token: raw };
      break;
    }
    moves.push(snapped.san);
    if (snapped.corrected) corrections.push({ from: raw, to: snapped.san });
  }
  return { moves, headers, ok: moves.length > 0, truncated, corrections };
}

// Step through a game from PGN move text. Read-only board + clickable move list.
export function GameViewer({ pgn }: { pgn: string }) {
  const parsed = useMemo(() => parseGame(pgn), [pgn]);

  const [ply, setPly] = useState(parsed.moves.length); // start at final position
  const [lichessBusy, setLichessBusy] = useState(false);
  const [lichessErr, setLichessErr] = useState<string | null>(null);
  const [orientation, setOrientation] = useState<Color>("w");
  const [copied, setCopied] = useState(false);
  const boardSize = useBoardSize(520);

  const total = parsed.moves.length;
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLDivElement>(null);
  const parallaxRef = useRef<HTMLDivElement>(null);

  // Arrow keys step through the game (ignored while typing in the edit box).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = document.activeElement;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) return;
      if (e.key === "ArrowLeft") { setPly((p) => Math.max(0, p - 1)); e.preventDefault(); }
      else if (e.key === "ArrowRight") { setPly((p) => Math.min(total, p + 1)); e.preventDefault(); }
      else if (e.key === "Home") { setPly(0); e.preventDefault(); }
      else if (e.key === "End") { setPly(total); e.preventDefault(); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [total]);

  // Keep the live move in view as you step.
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [ply]);

  // Subtle parallax: the ruled-paper backdrop drifts slower than the moves.
  function onScroll() {
    const s = scrollRef.current;
    const bg = parallaxRef.current;
    if (s && bg) bg.style.transform = `translateY(${-s.scrollTop * 0.35}px)`;
  }

  async function copyPgn() {
    try {
      await navigator.clipboard.writeText(pgn.trim());
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — no-op */
    }
  }

  function downloadPgn() {
    const blob = new Blob([pgn.trim() + "\n"], { type: "application/x-chess-pgn" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "game.pgn";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function openInLichess() {
    setLichessBusy(true);
    setLichessErr(null);
    try {
      const url = await importToLichess(pgn);
      window.open(url, "_blank", "noopener");
    } catch (e) {
      setLichessErr(e instanceof Error ? e.message : "Couldn’t open on Lichess.");
    } finally {
      setLichessBusy(false);
    }
  }

  const { fen, lastMove } = useMemo(() => {
    const c = new Chess();
    let last: { from: string; to: string } | null = null;
    for (let i = 0; i < ply; i++) {
      try {
        const m = c.move(parsed.moves[i]);
        last = m ? { from: m.from, to: m.to } : last;
      } catch {
        break;
      }
    }
    return { fen: c.fen(), lastMove: last };
  }, [ply, parsed.moves]);

  if (!parsed.ok) {
    return (
      <div className="grid place-items-center rounded-xl bg-ink-soft p-8 text-center text-sm text-muted">
        Couldn’t read the very first move. Check the notation in{" "}
        <span className="font-medium text-ink">Edit the moves</span> and try again.
      </div>
    );
  }

  const white = parsed.headers.White || "White";
  const black = parsed.headers.Black || "Black";
  const rows = Array.from({ length: Math.ceil(total / 2) }, (_, i) => ({
    n: i + 1,
    w: parsed.moves[i * 2],
    wPly: i * 2 + 1,
    b: parsed.moves[i * 2 + 1] as string | undefined,
    bPly: i * 2 + 2,
  }));

  return (
    <div className="flex flex-col gap-3">
      {parsed.corrections.length > 0 && (
        <div className="rounded-xl border border-positive/30 bg-positive/10 px-4 py-3 text-sm">
          <p className="font-semibold text-ink">
            Auto-fixed {parsed.corrections.length}{" "}
            {parsed.corrections.length === 1 ? "move" : "moves"} that looked misread.
          </p>
          <p className="mt-0.5 text-muted">
            Snapped to the nearest legal move:{" "}
            {parsed.corrections.slice(0, 6).map((c, i) => (
              <span key={i} className="font-mono text-xs">
                {i > 0 ? " · " : ""}
                {c.from}→<span className="font-semibold text-ink">{c.to}</span>
              </span>
            ))}
            {parsed.corrections.length > 6 ? " …" : ""}. Double-check them in{" "}
            <span className="font-medium text-ink">Edit the moves</span> if needed.
          </p>
        </div>
      )}
      {parsed.truncated && (
        <div className="rounded-xl border border-accent/30 bg-accent-soft px-4 py-3 text-sm">
          <p className="font-semibold text-ink">
            Got the first {total} {total === 1 ? "move" : "moves"} — then one didn’t add up.
          </p>
          <p className="mt-0.5 text-muted">
            Around move {parsed.truncated.atMoveNo}, “{parsed.truncated.token}” isn’t a
            legal move here — usually a handwriting mix-up (a “c” vs “e”, a “d” vs “b”,
            or a wrong rank). Everything up to there is below; fix it in{" "}
            <span className="font-medium text-ink">Edit the moves</span> to read the rest.
          </p>
        </div>
      )}
      <div className="flex flex-col gap-5 sm:flex-row">
        <div className="shrink-0">
          <InteractiveBoard
            fen={fen}
            orientation={orientation}
            interactive={false}
            lastMove={lastMove}
            onMove={() => {}}
            size={boardSize}
          />
          <div className="mt-3 flex items-center justify-center gap-1">
            <StepBtn onClick={() => setPly(0)} disabled={ply === 0}><SkipBack size={16} /></StepBtn>
            <StepBtn onClick={() => setPly((p) => Math.max(0, p - 1))} disabled={ply === 0}><ChevronLeft size={16} /></StepBtn>
            <span className="min-w-[70px] text-center font-mono text-xs text-muted">
              {ply} / {total}
            </span>
            <StepBtn onClick={() => setPly((p) => Math.min(total, p + 1))} disabled={ply === total}><ChevronRight size={16} /></StepBtn>
            <StepBtn onClick={() => setPly(total)} disabled={ply === total}><SkipForward size={16} /></StepBtn>
            <span className="mx-1 h-5 w-px bg-line" />
            <StepBtn onClick={() => setOrientation((o) => (o === "w" ? "b" : "w"))} title="Flip board"><FlipVertical2 size={16} /></StepBtn>
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="truncate font-mono text-xs text-muted">
              {white} – {black}
            </p>
            <div className="flex items-center gap-1.5">
              <ActionBtn onClick={copyPgn} title="Copy PGN">
                {copied ? <Check size={13} className="text-positive" /> : <Copy size={13} />}
                {copied ? "Copied" : "PGN"}
              </ActionBtn>
              <ActionBtn onClick={downloadPgn} title="Download .pgn">
                <Download size={13} />
                Save
              </ActionBtn>
              <ActionBtn onClick={openInLichess} disabled={lichessBusy} title="Open in Lichess">
                <ExternalLink size={13} />
                {lichessBusy ? "Opening…" : "Lichess"}
              </ActionBtn>
            </div>
          </div>
          {lichessErr && <p className="mb-2 text-xs text-accent">{lichessErr}</p>}

          {/* Scoresheet — vertical, two columns like the paper sheet, ruled rows,
              a sticky header, soft parallax backdrop, and the live move kept in view. */}
          <div className="relative overflow-hidden rounded-xl bg-card ring-1 ring-line">
            <div
              ref={parallaxRef}
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-[2600px] will-change-transform"
              style={{
                background:
                  "radial-gradient(60% 22% at 50% 6%, rgba(126,154,100,0.13), transparent 72%)",
              }}
            />
            <div className="relative z-20 grid grid-cols-[2.75rem_1fr_1fr] border-b border-line bg-card/85 px-3 py-2 font-mono text-[10px] uppercase tracking-wide text-muted backdrop-blur-sm">
              <span>#</span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-paper ring-1 ring-line" />
                White
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-ink" />
                Black
              </span>
            </div>

            <div
              ref={scrollRef}
              onScroll={onScroll}
              className="relative z-10 max-h-[440px] overflow-y-auto scroll-smooth"
            >
              {rows.map((r) => {
                const wActive = ply === r.wPly;
                const bActive = ply === r.bPly;
                return (
                  <div
                    key={r.n}
                    ref={wActive || bActive ? activeRef : undefined}
                    className="grid grid-cols-[2.75rem_1fr_1fr] border-b border-line/60"
                  >
                    <span className="flex items-center justify-center font-mono text-[11px] text-muted/70">
                      {r.n}
                    </span>
                    <ScoreCell san={r.w} active={wActive} onClick={() => setPly(r.wPly)} />
                    {r.b ? (
                      <ScoreCell san={r.b} active={bActive} onClick={() => setPly(r.bPly)} />
                    ) : (
                      <span />
                    )}
                  </div>
                );
              })}
            </div>

            <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-6 bg-gradient-to-t from-card to-transparent" />
          </div>
          <p className="mt-2 text-center font-mono text-[10px] uppercase tracking-wide text-muted/50">
            ← → step · Home / End jump · flip with the ⇅ button
          </p>
        </div>
      </div>
    </div>
  );
}

function ScoreCell({
  san,
  active,
  onClick,
}: {
  san: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-2 text-left font-medium transition-colors ${
        active ? "bg-accent text-paper" : "text-ink hover:bg-ink-soft"
      }`}
    >
      {san}
    </button>
  );
}

function ActionBtn({
  children,
  onClick,
  disabled,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="flex shrink-0 items-center gap-1.5 rounded-lg border border-line px-2.5 py-1 text-xs font-medium transition-colors hover:bg-ink-soft disabled:opacity-50"
    >
      {children}
    </button>
  );
}

function StepBtn({ children, onClick, disabled, title }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; title?: string }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="grid h-8 w-8 place-items-center rounded-lg border border-line transition-colors hover:bg-ink-soft disabled:opacity-30"
    >
      {children}
    </button>
  );
}
