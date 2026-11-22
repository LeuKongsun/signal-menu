"use client";

import React from "react";
import { Search, X, FileText, Coffee } from "lucide-react";

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  currencyMode: "both" | "usd" | "khr";
  onCurrencyChange: (mode: "both" | "usd" | "khr") => void;
  onOpenPdf: () => void;
  showSearch?: boolean;
}

export function Header({
  searchQuery,
  onSearchChange,
  currencyMode,
  onCurrencyChange,
  onOpenPdf,
  showSearch = true,
}: HeaderProps) {
  return (
    <header className="relative bg-[#FAF7F2] border-b border-stone-200/80 pt-6 pb-4 px-4 overflow-hidden">
      {/* Decorative background subtle circle */}
      <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-[#8E583C]/5 pointer-events-none" />

      <div className="max-w-6xl mx-auto">
        {/* Top bar with Brand & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
          {/* Logo & Title */}
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#8E583C] text-white flex items-center justify-center shadow-md shadow-[#8E583C]/25">
              <Coffee className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight text-[#2A1B14] uppercase">
                  SIGNAL
                </h1>
                <span className="text-[11px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-full bg-[#8E583C]/10 text-[#8E583C]">
                  Cafe & Drinks
                </span>
              </div>
              <p className="font-khmer text-sm text-stone-600 font-semibold flex items-center gap-1.5">
                <span>ម៉ឺនុយភេសជ្ជៈ</span>
              </p>
            </div>
          </div>

          {/* Right Action buttons: Currency & PDF */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Currency selector */}
            <div className="flex items-center bg-white rounded-xl p-1 border border-stone-200/80 shadow-xs text-xs font-bold text-stone-600 font-khmer">
              <button
                onClick={() => onCurrencyChange("both")}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  currencyMode === "both"
                    ? "bg-[#8E583C] text-white shadow-xs"
                    : "hover:text-stone-900"
                }`}
              >
                ទាំងពីរ (៛/$)
              </button>
              <button
                onClick={() => onCurrencyChange("khr")}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  currencyMode === "khr"
                    ? "bg-[#8E583C] text-white shadow-xs"
                    : "hover:text-stone-900"
                }`}
              >
                រៀល (៛)
              </button>
              <button
                onClick={() => onCurrencyChange("usd")}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  currencyMode === "usd"
                    ? "bg-[#8E583C] text-white shadow-xs"
                    : "hover:text-stone-900"
                }`}
              >
                ដុល្លារ ($)
              </button>
            </div>

            {/* View Original PDF */}
            <button
              onClick={onOpenPdf}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white text-stone-700 hover:text-[#8E583C] hover:bg-stone-50 border border-stone-200/80 shadow-xs transition-colors font-khmer"
            >
              <FileText className="w-3.5 h-3.5 text-[#8E583C]" />
              <span>ម៉ឺនុយ PDF</span>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        {showSearch && (
          <div className="mt-2 relative">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="ស្វែងរកភេសជ្ជៈ..."
                className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-white border border-stone-200 text-sm placeholder:text-stone-400 text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#8E583C]/30 focus:border-[#8E583C] shadow-xs transition-all font-khmer"
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange("")}
                  className="absolute right-3 p-1 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
