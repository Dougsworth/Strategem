import { useState } from "react";
import { useAuth } from "@/lib/AuthContext";

// Studio branding settings (Academy / Club) — a name + logo URL that appear on
// report cards. No file upload needed: paste a hosted image URL.
export const BrandingModal = ({ onClose }: { onClose: () => void }) => {
  const { user, setBranding } = useAuth();
  const [studioName, setStudioName] = useState(user?.studioName ?? "");
  const [logoUrl, setLogoUrl] = useState(user?.logoUrl ?? "");

  function save() {
    setBranding({
      studioName: studioName.trim() || undefined,
      logoUrl: logoUrl.trim() || undefined,
    });
    onClose();
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
        <p className="eyebrow">Academy / Club</p>
        <h2 className="mt-0.5 font-display text-xl font-bold tracking-tight">
          Studio branding
        </h2>
        <p className="mt-1 text-sm text-muted">
          Put your studio’s name and logo on every report card you share.
        </p>

        <label className="mt-5 block text-sm font-medium">Studio name</label>
        <input
          value={studioName}
          onChange={(e) => setStudioName(e.target.value)}
          placeholder="e.g. Kingside Chess Academy"
          className="mt-1.5 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none ring-accent/30 focus:ring-2"
        />

        <label className="mt-4 block text-sm font-medium">Logo URL</label>
        <input
          value={logoUrl}
          onChange={(e) => setLogoUrl(e.target.value)}
          placeholder="https://…/logo.png"
          className="mt-1.5 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none ring-accent/30 focus:ring-2"
        />
        {logoUrl.trim() && (
          <img
            src={logoUrl}
            alt="Logo preview"
            className="mt-3 h-10 w-auto rounded object-contain"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-muted transition-colors hover:bg-ink-soft"
          >
            Cancel
          </button>
          <button
            onClick={save}
            className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-paper transition-opacity hover:opacity-90"
          >
            Save branding
          </button>
        </div>
      </div>
    </div>
  );
};
