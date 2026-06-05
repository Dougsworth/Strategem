import { useState } from "react";
import { Navbar } from "@/sections/PageShell/components/Navbar";
import { DashboardMain } from "@/sections/DashboardMain";
import { Footer } from "@/sections/Footer";
import { ReportCardModal } from "@/sections/ReportCard/ReportCardModal";
import { MembershipModal } from "@/sections/Auth/MembershipModal";
import { ScoresheetModal } from "@/sections/Review/ScoresheetModal";
import { ScannedGameModal } from "@/sections/Review/ScannedGameModal";

export const PageShell = () => {
  const [scanOpen, setScanOpen] = useState(false);

  return (
    <div className="min-h-screen bg-paper">
      <Navbar onScan={() => setScanOpen(true)} />
      <DashboardMain />
      <Footer />
      <ReportCardModal />
      <MembershipModal />
      {scanOpen && <ScoresheetModal onClose={() => setScanOpen(false)} />}
      <ScannedGameModal />
    </div>
  );
};
