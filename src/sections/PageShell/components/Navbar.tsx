import { ScanLine } from "lucide-react";
import { BrandLogo } from "@/sections/PageShell/components/BrandLogo";
import { DesktopNavLinks } from "@/sections/PageShell/components/DesktopNavLinks";
import { LiveGamesStatus } from "@/sections/PageShell/components/LiveGamesStatus";
import { UserAvatar } from "@/sections/PageShell/components/UserAvatar";
import { useAuth } from "@/lib/AuthContext";

export const Navbar = ({ onScan }: { onScan: () => void }) => {
  const { user, openMembership } = useAuth();

  return (
    <nav className="sticky top-0 z-50 border-b border-line bg-paper/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[1600px] items-center justify-between px-6">
        <div className="flex items-center gap-8">
          <BrandLogo />
          <DesktopNavLinks />
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onScan}
            className="flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-ink-soft"
          >
            <ScanLine size={14} />
            <span className="hidden sm:inline">Scan game</span>
          </button>
          {user?.plan === "free" && (
            <button
              onClick={openMembership}
              className="hidden rounded-full bg-accent px-3 py-1.5 text-xs font-bold text-paper transition-opacity hover:opacity-90 sm:block"
            >
              Upgrade
            </button>
          )}
          <LiveGamesStatus />
          <UserAvatar />
        </div>
      </div>
    </nav>
  );
};
