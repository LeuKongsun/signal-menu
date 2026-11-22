"use client";

import React from "react";
import { Coffee, Award } from "lucide-react";
import type { TelegramWebApp } from "@/lib/useTelegramWebApp";

export type NavTab = "menu" | "loyalty";

interface BottomNavProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  trayCount?: number;
  telegram?: TelegramWebApp | null;
}

export function BottomNav({
  activeTab,
  onTabChange,
  trayCount = 0,
  telegram,
}: BottomNavProps) {
  const handleTabClick = (tab: NavTab) => {
    if (telegram?.HapticFeedback) {
      telegram.HapticFeedback.impactOccurred("light");
    }
    onTabChange(tab);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-stone-200/80 shadow-[0_-4px_20px_rgba(0,0,0,0.04)] font-khmer pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-md mx-auto grid grid-cols-2 h-16 px-4">
        {/* Menu Tab */}
        <button
          onClick={() => handleTabClick("menu")}
          className={`flex flex-col items-center justify-center gap-1 relative transition-colors ${
            activeTab === "menu"
              ? "text-[#8E583C] font-bold"
              : "text-stone-400 hover:text-stone-600 font-medium"
          }`}
        >
          <div className="relative">
            <Coffee className={`w-5 h-5 transition-transform ${activeTab === "menu" ? "scale-110" : ""}`} />
            {trayCount > 0 && (
              <span className="absolute -top-1.5 -right-2 min-w-4 h-4 px-1 rounded-full bg-[#8E583C] text-white text-[10px] font-bold flex items-center justify-center">
                {trayCount}
              </span>
            )}
          </div>
          <span className="text-xs">ម៉ឺនុយ</span>
          {activeTab === "menu" && (
            <span className="absolute bottom-1 w-6 h-0.5 rounded-full bg-[#8E583C]" />
          )}
        </button>

        {/* Loyalty Stamp Tab */}
        <button
          onClick={() => handleTabClick("loyalty")}
          className={`flex flex-col items-center justify-center gap-1 relative transition-colors ${
            activeTab === "loyalty"
              ? "text-[#8E583C] font-bold"
              : "text-stone-400 hover:text-stone-600 font-medium"
          }`}
        >
          <div className="relative">
            <Award className={`w-5 h-5 transition-transform ${activeTab === "loyalty" ? "scale-110" : ""}`} />
          </div>
          <span className="text-xs">ស្តាម្ពការ្ដ</span>
          {activeTab === "loyalty" && (
            <span className="absolute bottom-1 w-6 h-0.5 rounded-full bg-[#8E583C]" />
          )}
        </button>
      </div>
    </nav>
  );
}
