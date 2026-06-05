import { useEffect, useState } from "react";
import { Copy, Check, Users } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { entitlements } from "@/lib/entitlements";
import { fbGetClub, type ClubInfo } from "@/lib/firebaseAuth";

// Create / join / manage a club (shared roster across coaches). Creating needs
// the Club plan; joining just needs an invite code.
export const TeamModal = ({ onClose }: { onClose: () => void }) => {
  const { user, createClub, joinClub, leaveClub } = useAuth();
  const [club, setClub] = useState<ClubInfo | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const canCreate = entitlements(user?.plan).multiCoach;
  const inClub = Boolean(user?.clubId);
  const isOwner = club?.ownerUid === user?.uid;

  // Load club details whenever the coach's club changes.
  useEffect(() => {
    let cancelled = false;
    if (user?.clubId) {
      fbGetClub(user.clubId)
        .then((c) => !cancelled && setClub(c))
        .catch(() => !cancelled && setClub(null));
    } else {
      setClub(null);
    }
    return () => {
      cancelled = true;
    };
  }, [user?.clubId]);

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  function copyCode() {
    if (!club) return;
    void navigator.clipboard.writeText(club.inviteCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div
      className="fixed inset-0 z-[130] grid place-items-center bg-ink/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md animate-fade-in rounded-2xl bg-card p-7 shadow-2xl ring-1 ring-line"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          <Users size={18} className="text-accent" />
          <h2 className="font-display text-xl font-bold tracking-tight">
            {inClub ? "Your club" : "Coaches & teams"}
          </h2>
        </div>

        {inClub ? (
          <div className="mt-4 space-y-4">
            <div>
              <p className="text-sm text-muted">
                You’re in{" "}
                <span className="font-semibold text-ink">
                  {club?.name ?? "your club"}
                </span>{" "}
                — its roster is shared with{" "}
                {club ? club.memberUids.length : "—"}{" "}
                {club && club.memberUids.length === 1 ? "coach" : "coaches"}.
              </p>
            </div>

            <div className="rounded-xl bg-ink-soft/60 p-4">
              <p className="font-mono text-[10px] uppercase tracking-wide text-muted">
                Invite code — share it with a coach
              </p>
              <div className="mt-2 flex items-center gap-2">
                <span className="font-display text-2xl font-bold tracking-[0.2em]">
                  {club?.inviteCode ?? "······"}
                </span>
                <button
                  onClick={copyCode}
                  className="ml-auto flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1 text-xs font-medium transition-colors hover:bg-ink"
                >
                  {copied ? <Check size={13} className="text-positive" /> : <Copy size={13} />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>

            <button
              onClick={() => run(leaveClub)}
              disabled={busy}
              className="text-sm font-semibold text-accent hover:underline disabled:opacity-50"
            >
              {isOwner ? "Disband club" : "Leave club"}
            </button>
            {isOwner && (
              <p className="text-xs text-muted">
                Disbanding removes the shared roster for everyone and detaches all
                coaches.
              </p>
            )}
          </div>
        ) : (
          <div className="mt-4 space-y-5">
            {canCreate ? (
              <div>
                <p className="text-sm text-muted">
                  Start a club so your coaches share one roster.
                </p>
                <button
                  onClick={() => run(createClub)}
                  disabled={busy}
                  className="mt-3 w-full rounded-lg bg-ink py-2.5 text-sm font-semibold text-paper transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {busy ? "Creating…" : "Create a club"}
                </button>
              </div>
            ) : (
              <p className="rounded-lg bg-ink-soft/60 px-3 py-2 text-sm text-muted">
                Creating a club is part of the <span className="font-semibold text-ink">Club</span> plan.
                You can still join one with a code.
              </p>
            )}

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-line" />
              <span className="font-mono text-[10px] uppercase tracking-wide text-muted/60">
                or join one
              </span>
              <div className="h-px flex-1 bg-line" />
            </div>

            <div>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Invite code, e.g. K7QF3M"
                className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm tracking-[0.2em] outline-none ring-accent/30 focus:ring-2"
              />
              <button
                onClick={() => code.trim() && run(() => joinClub(code.trim()))}
                disabled={busy || !code.trim()}
                className="mt-2 w-full rounded-lg bg-accent py-2.5 text-sm font-bold text-paper transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {busy ? "Joining…" : "Join club"}
              </button>
            </div>
          </div>
        )}

        {error && <p className="mt-4 text-sm text-accent">{error}</p>}

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-muted transition-colors hover:bg-ink-soft"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
