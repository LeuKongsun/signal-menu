"use client";

import React from "react";
import { Coffee, Flame, IceCream, Leaf, Milk, Sparkles, LayoutGrid } from "lucide-react";
import { MENU_CATEGORIES, MenuCategoryKey, MENU_ITEMS } from "@/data/menu";

interface CategoryTabsProps {
  selectedCategory: MenuCategoryKey | "all";
  onSelectCategory: (cat: MenuCategoryKey | "all") => void;
}

export function CategoryTabs({
  selectedCategory,
  onSelectCategory,
}: CategoryTabsProps) {
  const getCategoryCount = (key: MenuCategoryKey | "all") => {
    if (key === "all") return MENU_ITEMS.length;
    return MENU_ITEMS.filter((i) => i.category === key).length;
  };

  const getIcon = (key: string) => {
    switch (key) {
      case "all":
        return <LayoutGrid className="w-4 h-4" />;
      case "iced-coffee":
        return <Coffee className="w-4 h-4" />;
      case "non-coffee":
        return <Milk className="w-4 h-4" />;
      case "hot-coffee":
        return <Flame className="w-4 h-4" />;
      case "frappes":
        return <IceCream className="w-4 h-4" />;
      case "tea":
        return <Leaf className="w-4 h-4" />;
      case "soda":
        return <Sparkles className="w-4 h-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="sticky top-0 z-30 bg-[#FAF8F5]/90 backdrop-blur-md border-b border-stone-200/70 py-3 px-4 shadow-xs">
      <div className="max-w-6xl mx-auto flex items-center gap-2 overflow-x-auto no-scrollbar">
        {/* "All" button */}
        <button
          onClick={() => onSelectCategory("all")}
          className={`shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
            selectedCategory === "all"
              ? "bg-[#8E583C] text-white shadow-sm shadow-[#8E583C]/20 scale-[1.02]"
              : "bg-white text-stone-700 hover:bg-stone-100 border border-stone-200/80"
          }`}
        >
          {getIcon("all")}
          <span className="font-khmer">ទាំងអស់</span>
          <span
            className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
              selectedCategory === "all"
                ? "bg-white/25 text-white"
                : "bg-stone-100 text-stone-600"
            }`}
          >
            {getCategoryCount("all")}
          </span>
        </button>

        {/* Categories */}
        {MENU_CATEGORIES.map((cat) => {
          const isActive = selectedCategory === cat.key;
          const count = getCategoryCount(cat.key);

          return (
            <button
              key={cat.key}
              onClick={() => onSelectCategory(cat.key)}
              className={`shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                isActive
                  ? "bg-[#8E583C] text-white shadow-sm shadow-[#8E583C]/20 scale-[1.02]"
                  : "bg-white text-stone-700 hover:bg-stone-100 border border-stone-200/80"
              }`}
            >
              {getIcon(cat.key)}
              <div className="flex items-center gap-1.5">
                <span className="font-khmer">{cat.nameKh}</span>
                <span className="text-[10px] opacity-80 hidden sm:inline">
                  {cat.nameEn}
                </span>
              </div>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                  isActive
                    ? "bg-white/25 text-white"
                    : "bg-stone-100 text-stone-600"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
