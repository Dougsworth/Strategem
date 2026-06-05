import { ScanLine } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { entitlements } from "@/lib/entitlements";
import { dailyQuota } from "@/lib/guardrails";

// Shows how many scoresheet scans the coach has used today vs their plan's
// daily allowance. Reads the local counter (the server is authoritative, but
// this is an accurate at-a-glance view).
export const ScanQuota = ({ className = "" }: { className?: string }) => {
  const { user } = useAuth();
  const limit = entitlements(user?.plan).scanPerDay;
  const q = dailyQuota("scan", limit);
  const low = q.remaining <= 0;

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono text-[11px] ${
        low ? "text-accent" : "text-muted"
      } ${className}`}
    >
      <ScanLine size={12} />
      {q.used}/{limit} scans today · {q.remaining} left
    </span>
  );
};
