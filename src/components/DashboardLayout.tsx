"use client";

import { ReactNode } from "react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import MobileBottomNav from "./MobileBottomNav";

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-[#09090B] text-white">

      {/* Desktop Navbar */}
      <Navbar />

      {/* Main Content */}
      <main className="min-h-screen pb-24 md:pb-0">
        {children}
      </main>

      {/* Footer (Desktop Only) */}
      <div className="hidden md:block">
        <Footer />
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />

    </div>
  );
}