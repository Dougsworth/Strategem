import { useEffect, useRef, useState } from "react";
import { Check, Link2, Mail, MoreHorizontal, Share2 } from "lucide-react";
import { createShareUrl, type SharedGame } from "@/lib/shareGame";

// Brand glyphs (lucide ships no brand icons) — SimpleIcons paths, 24px viewBox.
const Icon = ({ d, size = 15 }: { d: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d={d} />
  </svg>
);
const WHATSAPP =
  "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.149-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z";
const XCOM =
  "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.66l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z";
const TELEGRAM =
  "M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212-.07-.062-.174-.041-.249-.024-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z";

function go(target: string) {
  // <a> click handles mailto: (no page nav) and web intents (new tab) cleanly.
  const a = document.createElement("a");
  a.href = target;
  a.target = target.startsWith("mailto:") ? "_self" : "_blank";
  a.rel = "noopener noreferrer";
  a.click();
}

// Share menu for a scanned game: Copy link + WhatsApp / X / Telegram / Email,
// plus the native share sheet as "More…" where available (mobile). The short
// link is created lazily on open and reused for every option.
export function ShareMenu({ white, black, pgn }: SharedGame) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inflight = useRef<Promise<string> | null>(null);

  // A changed game invalidates the link so we don't share stale moves.
  useEffect(() => {
    setUrl(null);
    inflight.current = null;
  }, [white, black, pgn]);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function ensureUrl(): Promise<string> {
    if (url) return Promise.resolve(url);
    if (!inflight.current) {
      setLoading(true);
      inflight.current = createShareUrl({ white, black, pgn })
        .then((u) => {
          setUrl(u);
          return u;
        })
        .finally(() => setLoading(false));
    }
    return inflight.current;
  }

  const title = `${white} – ${black}`;
  const text = `Chess game on Strategem — ${title}`;

  async function copyLink() {
    const u = await ensureUrl();
    try {
      await navigator.clipboard.writeText(u);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked */
    }
  }

  async function openTarget(make: (u: string) => string) {
    const u = await ensureUrl();
    go(make(u));
    setOpen(false);
  }

  async function nativeShare() {
    const u = await ensureUrl();
    const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
    try {
      await nav.share?.({ title, text, url: u });
    } catch {
      /* cancelled */
    }
    setOpen(false);
  }

  const hasNative = typeof navigator !== "undefined" && "share" in navigator;

  return (
    <div ref={wrapRef} className="relative shrink-0">
      <button
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next) void ensureUrl();
        }}
        title="Share this game"
        className="flex shrink-0 items-center gap-1.5 rounded-lg border border-line px-2.5 py-1 text-xs font-medium transition-colors hover:bg-ink-soft"
      >
        <Share2 size={13} />
        Share
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-1.5 w-56 overflow-hidden rounded-xl border border-line bg-card shadow-lg">
          <p className="px-3 pb-1 pt-2 text-[11px] text-muted">
            {loading && !url ? "Creating link…" : "Share this game"}
          </p>
          <Row
            onClick={copyLink}
            icon={copied ? <Check size={15} className="text-positive" /> : <Link2 size={15} />}
            label={copied ? "Link copied" : "Copy link"}
          />
          <Row
            onClick={() => openTarget((u) => `https://wa.me/?text=${encodeURIComponent(`${text} ${u}`)}`)}
            icon={<Icon d={WHATSAPP} />}
            tint="#25D366"
            label="WhatsApp"
          />
          <Row
            onClick={() =>
              openTarget(
                (u) =>
                  `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(u)}`,
              )
            }
            icon={<Icon d={XCOM} />}
            label="X"
          />
          <Row
            onClick={() =>
              openTarget(
                (u) => `https://t.me/share/url?url=${encodeURIComponent(u)}&text=${encodeURIComponent(text)}`,
              )
            }
            icon={<Icon d={TELEGRAM} />}
            tint="#229ED9"
            label="Telegram"
          />
          <Row
            onClick={() =>
              openTarget(
                (u) =>
                  `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${text}\n\n${u}`)}`,
              )
            }
            icon={<Mail size={15} />}
            label="Email"
          />
          {hasNative && (
            <Row onClick={nativeShare} icon={<MoreHorizontal size={15} />} label="More…" />
          )}
        </div>
      )}
    </div>
  );
}

function Row({
  onClick,
  icon,
  label,
  tint,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  tint?: string;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors hover:bg-ink-soft"
    >
      <span className="grid h-5 w-5 shrink-0 place-items-center" style={tint ? { color: tint } : undefined}>
        {icon}
      </span>
      <span>{label}</span>
    </button>
  );
}
