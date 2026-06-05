import { useEffect, useRef, useState } from "react";
import { CreditCard, LogOut, Palette, Users } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { planName } from "@/lib/plans";
import { entitlements } from "@/lib/entitlements";
import { firebaseEnabled } from "@/lib/firebase";
import { BrandingModal } from "@/sections/Auth/BrandingModal";
import { TeamModal } from "@/sections/Auth/TeamModal";

export const UserAvatar = () => {
  const { user, signOut, openMembership } = useAuth();
  const [open, setOpen] = useState(false);
  const [brandingOpen, setBrandingOpen] = useState(false);
  const [teamOpen, setTeamOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  if (!user) return null;
  const initials = user.name.slice(0, 2).toUpperCase();

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-ink ring-1 ring-line transition-opacity hover:opacity-90"
      >
        <span className="font-mono text-[11px] font-bold text-paper">
          {initials}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-50 w-60 animate-fade-in rounded-xl bg-card p-1.5 shadow-xl ring-1 ring-line">
          <div className="px-3 py-2">
            <p className="truncate text-sm font-semibold">{user.name}</p>
            <p className="truncate text-xs text-muted">{user.email}</p>
            <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-ink-soft px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide text-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              {planName(user.plan)} plan
            </span>
          </div>
          <div className="my-1 h-px bg-line" />
          {firebaseEnabled && (
            <button
              onClick={() => {
                setOpen(false);
                setTeamOpen(true);
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-ink-soft"
            >
              <Users size={15} className="text-muted" />
              Coaches &amp; teams
            </button>
          )}
          {entitlements(user.plan).branding && (
            <button
              onClick={() => {
                setOpen(false);
                setBrandingOpen(true);
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-ink-soft"
            >
              <Palette size={15} className="text-muted" />
              Studio branding
            </button>
          )}
          <button
            onClick={() => {
              setOpen(false);
              openMembership();
            }}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-ink-soft"
          >
            <CreditCard size={15} className="text-muted" />
            Manage membership
          </button>
          <button
            onClick={() => {
              setOpen(false);
              signOut();
            }}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-ink-soft"
          >
            <LogOut size={15} className="text-muted" />
            Sign out
          </button>
        </div>
      )}

      {brandingOpen && <BrandingModal onClose={() => setBrandingOpen(false)} />}
      {teamOpen && <TeamModal onClose={() => setTeamOpen(false)} />}
    </div>
  );
};
