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
import { reconstructMoves } from "@/lib/chess/snapMove";

interface ParsedGame {
  moves: string[];
  headers: Record<string, string>;
  ok: boolean;
  /** Set when even the smart matcher couldn't place a move — we keep the legal prefix. */
  truncated: { atMoveNo: number; token: string } | null;
  /** Misreads we auto-corrected to a legal move, e.g. "c4" → "e4". */
  corrections: { from: string; to: string }[];
  /** Crossed-out / struck-through tokens we skipped. */
  ignored: string[];
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
        ignored: [],
      };
    }
  } catch {
    /* fall through to the smart token-by-token replay */
  }

  const body = pgn
    .replace(/\[[^\]]*\]/g, " ") // headers
    .replace(/\{[^}]*\}/g, " ") // comments
    .replace(/\$\d+/g, " ") // NAGs
    .replace(/\b(1-0|0-1|1\/2-1\/2|\*)\b/g, " ") // results
    .replace(/\d+\.(\.\.)?/g, " "); // move numbers "12." / "12..."
  const tokens = body.split(/\s+/).filter(Boolean);

  // Beam-search reconstruction — keeps multiple legal interpretations alive so a
  // single misread doesn't derail the whole game.
  const { sans, corrections, ignored, failedToken } = reconstructMoves(tokens);
  const truncated = failedToken
    ? { atMoveNo: Math.floor(sans.length / 2) + 1, token: failedToken }
    : null;
  return { moves: sans, headers, ok: sans.length > 0, truncated, corrections, ignored };
}

// Build clean, numbered PGN movetext from the reconstructed (legal) moves — this
// is what we hand to Lichess / copy / download, so they get the corrected game,
// not the raw OCR text (which Lichess's strict parser would truncate).
function pgnFromMoves(moves: string[]): string {
  let out = "";
  for (let i = 0; i < moves.length; i++) {
    if (i % 2 === 0) out += `${i / 2 + 1}. `;
    out += `${moves[i]} `;
  }
  return out.trim();
}

// Step through a game from PGN move text. Read-only board + clickable move list,
// plus an "Edit the moves" box so misreads can be fixed right here.
export function GameViewer({
  pgn,
  onPgnChange,
  imageUrl,
}: {
  pgn: string;
  /** Called when the user edits + applies the moves (so the parent can persist). */
  onPgnChange?: (pgn: string) => void;
  /** Original scoresheet photo, shown for side-by-side comparison. */
  imageUrl?: string | null;
}) {
  // Internal copy so the moves can be edited in place; re-syncs if the prop changes.
  const [pgnText, setPgnText] = useState(pgn);
  const [draft, setDraft] = useState(pgn);
  useEffect(() => {
    setPgnText(pgn);
    setDraft(pgn);
  }, [pgn]);

  const parsed = useMemo(() => parseGame(pgnText), [pgnText]);

  const [ply, setPly] = useState(parsed.moves.length); // start at final position
  const [lichessBusy, setLichessBusy] = useState(false);
  const [lichessErr, setLichessErr] = useState<string | null>(null);
  const [orientation, setOrientation] = useState<Color>("w");
  const [copied, setCopied] = useState(false);
  const boardSize = useBoardSize(520);

  function applyEdits() {
    setPgnText(draft);
    onPgnChange?.(draft);
  }

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

  // Exports use the reconstructed legal moves (what's on the board), so Lichess
  // / copy / download all get the corrected game — not the raw OCR text.
  const exportPgn = useMemo(() => pgnFromMoves(parsed.moves), [parsed.moves]);

  async function copyPgn() {
    try {
      await navigator.clipboard.writeText(exportPgn);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — no-op */
    }
  }

  function downloadPgn() {
    const blob = new Blob([exportPgn + "\n"], { type: "application/x-chess-pgn" });
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
      const url = await importToLichess(exportPgn);
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

  // Which move is currently on the board — so the scoresheet panel can point the
  // coach at the matching row on the paper.
  const curIdx = ply - 1;
  const current =
    ply > 0 && parsed.moves[curIdx]
      ? {
          no: Math.floor(curIdx / 2) + 1,
          side: curIdx % 2 === 0 ? "White" : "Black",
          san: parsed.moves[curIdx],
        }
      : null;

  if (!parsed.ok) {
    return (
      <div className="flex flex-col gap-3">
        {imageUrl && <ScoresheetPanel src={imageUrl} current={current} />}
        <div className="grid place-items-center rounded-xl bg-ink-soft p-8 text-center text-sm text-muted">
          Couldn’t read the moves. Fix the notation in{" "}
          <span className="font-medium text-ink">Edit the moves</span> below and apply.
        </div>
        <MovesEditor draft={draft} setDraft={setDraft} onApply={applyEdits} moveIndex={curIdx} onSeek={(i) => setPly(Math.max(0, Math.min(total, i + 1)))} />
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
      {imageUrl && <ScoresheetPanel src={imageUrl} current={current} />}
      {parsed.ignored.length > 0 && (
        <div className="rounded-xl border border-line bg-ink-soft/60 px-4 py-3 text-sm">
          <p className="font-semibold text-ink">
            Skipped {parsed.ignored.length} crossed-out{" "}
            {parsed.ignored.length === 1 ? "entry" : "entries"} on the sheet.
          </p>
          <p className="mt-0.5 text-muted">
            Ignored what looked struck-through / rewritten:{" "}
            <span className="font-mono text-xs">
              {parsed.ignored.slice(0, 8).join(" · ")}
              {parsed.ignored.length > 8 ? " …" : ""}
            </span>
          </p>
        </div>
      )}
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
      <MovesEditor draft={draft} setDraft={setDraft} onApply={applyEdits} moveIndex={curIdx} onSeek={(i) => setPly(Math.max(0, Math.min(total, i + 1)))} />
    </div>
  );
}

function ScoresheetPanel({
  src,
  current,
}: {
  src: string;
  current: { no: number; side: string; san: string } | null;
}) {
  const [zoom, setZoom] = useState(false);
  return (
    <>
      <details
        open
        className="rounded-xl border border-line bg-card px-4 py-3"
      >
        <summary className="flex cursor-pointer items-center justify-between gap-3 text-sm font-medium text-muted">
          <span>Original scoresheet</span>
          {current && (
            <span className="rounded-md bg-accent/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-accent">
              find move {current.no} · {current.side} · {current.san}
            </span>
          )}
        </summary>
        <img
          src={src}
          alt="Scanned scoresheet"
          onClick={() => setZoom(true)}
          className="mx-auto mt-3 max-h-[44vh] w-auto cursor-zoom-in rounded-lg object-contain ring-1 ring-line"
        />
        <p className="mt-1.5 text-center font-mono text-[10px] uppercase tracking-wide text-muted/50">
          {current
            ? `Compare move ${current.no} on the sheet with “${current.san}” on the board`
            : "Click to enlarge · compare with the moves"}
        </p>
      </details>
      {zoom && (
        <div
          onClick={() => setZoom(false)}
          className="fixed inset-0 z-[140] grid cursor-zoom-out place-items-center bg-ink/85 p-4"
        >
          <img
            src={src}
            alt="Scanned scoresheet"
            className="max-h-full max-w-full rounded-lg object-contain"
          />
        </div>
      )}
    </>
  );
}

// Character range of the move at index `idx` within raw PGN text (skips the
// move numbers / results, and any preamble before "1.") — so we can highlight
// it inside the edit box, in sync with the board + move list.
function findMoveTokenRange(text: string, idx: number): [number, number] | null {
  if (idx < 0) return null;
  const anchor = text.search(/\b1\s*\.\s*[a-hKQRBNO0]/);
  const re = /\S+/g;
  re.lastIndex = anchor >= 0 ? anchor : 0;
  let count = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const raw = m[0];
    if (/^\d+\.+$/.test(raw)) continue; // "12."
    if (/^(1-0|0-1|1\/2-1\/2|\*)$/.test(raw)) continue; // result
    let s = m.index;
    let tok = raw;
    const num = tok.match(/^\d+\.+/); // "12.e4" glued together
    if (num) {
      s += num[0].length;
      tok = tok.slice(num[0].length);
    }
    if (!tok) continue;
    if (count === idx) return [s, s + tok.length];
    count++;
  }
  return null;
}

// Inverse of findMoveTokenRange: the move index at (or just before) a caret
// offset — so clicking in the text can jump the board to that move.
function moveIndexAtOffset(text: string, offset: number): number {
  const anchor = text.search(/\b1\s*\.\s*[a-hKQRBNO0]/);
  const re = /\S+/g;
  re.lastIndex = anchor >= 0 ? anchor : 0;
  let count = 0;
  let result = -1;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const raw = m[0];
    if (/^\d+\.+$/.test(raw)) continue;
    if (/^(1-0|0-1|1\/2-1\/2|\*)$/.test(raw)) continue;
    let s = m.index;
    let tok = raw;
    const num = tok.match(/^\d+\.+/);
    if (num) {
      s += num[0].length;
      tok = tok.slice(num[0].length);
    }
    if (!tok) continue;
    if (s <= offset) result = count;
    count++;
  }
  return result;
}

// A textarea with a highlight band behind the active move. The backdrop mirrors
// the textarea's text/layout exactly; the textarea sits on top (transparent bg)
// so the caret + typing stay native while the highlight shows through. Clicking
// in the text seeks the board to that move.
function HighlightTextarea({
  value,
  onChange,
  range,
  onSeek,
}: {
  value: string;
  onChange: (s: string) => void;
  range: [number, number] | null;
  onSeek?: (moveIndex: number) => void;
}) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const markRef = useRef<HTMLSpanElement>(null);

  function sync() {
    if (taRef.current && bgRef.current) {
      bgRef.current.scrollTop = taRef.current.scrollTop;
      bgRef.current.scrollLeft = taRef.current.scrollLeft;
    }
  }

  // Bring the active move into view as you step.
  useEffect(() => {
    if (markRef.current && taRef.current) {
      const top = markRef.current.offsetTop - taRef.current.clientHeight / 2;
      taRef.current.scrollTop = Math.max(0, top);
      sync();
    }
  }, [range, value]);

  // Click (or arrow within) the text → jump the board to that move.
  function seekFromCaret() {
    if (!onSeek || !taRef.current) return;
    onSeek(moveIndexAtOffset(value, taRef.current.selectionStart ?? 0));
  }

  const shared =
    "whitespace-pre-wrap break-words px-3 py-2 font-mono text-sm leading-6";
  const before = range ? value.slice(0, range[0]) : value;
  const mid = range ? value.slice(range[0], range[1]) : "";
  const after = range ? value.slice(range[1]) : "";

  return (
    <div className="relative mt-3 h-40 overflow-hidden rounded-lg border border-line bg-paper ring-accent/30 focus-within:ring-2">
      <div
        ref={bgRef}
        aria-hidden
        className={`pointer-events-none absolute inset-0 overflow-auto text-transparent ${shared}`}
      >
        {before}
        {range && (
          <mark ref={markRef} className="rounded bg-accent/35 text-transparent">
            {mid}
          </mark>
        )}
        {after}
        {"\n"}
      </div>
      <textarea
        ref={taRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={sync}
        onClick={seekFromCaret}
        onKeyUp={(e) => {
          if (e.key.startsWith("Arrow") || e.key === "Home" || e.key === "End") {
            seekFromCaret();
          }
        }}
        spellCheck={false}
        className={`absolute inset-0 h-full w-full resize-none bg-transparent text-ink caret-ink outline-none ${shared}`}
      />
    </div>
  );
}

function MovesEditor({
  draft,
  setDraft,
  onApply,
  moveIndex,
  onSeek,
}: {
  draft: string;
  setDraft: (s: string) => void;
  onApply: () => void;
  /** Index of the move currently on the board, to highlight in the text. */
  moveIndex: number;
  /** Jump the board to a move index when the user clicks in the text. */
  onSeek?: (moveIndex: number) => void;
}) {
  const range = useMemo(
    () => findMoveTokenRange(draft, moveIndex),
    [draft, moveIndex],
  );
  return (
    <details open className="rounded-xl border border-line bg-card px-4 py-3">
      <summary className="cursor-pointer text-sm font-medium text-muted">
        Edit the moves (if anything was misread) · click a move to jump there
      </summary>
      <HighlightTextarea value={draft} onChange={setDraft} range={range} onSeek={onSeek} />
      <button
        onClick={onApply}
        className="mt-2 rounded-lg bg-ink px-3 py-1.5 text-sm font-medium text-paper transition-opacity hover:opacity-90"
      >
        Apply edits
      </button>
    </details>
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
