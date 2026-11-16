"use client";

import React from "react";
import { Plus, Coffee, Sparkles, Flame, Leaf, IceCream, Milk } from "lucide-react";
import { MenuItem, MenuCategoryKey, PriceOption } from "@/data/menu";

interface MenuItemCardProps {
  item: MenuItem;
  onAddToCart: (item: MenuItem, size: "regular" | "large", price: PriceOption) => void;
  currencyMode: "both" | "usd" | "khr";
}

const CATEGORY_THEMES: Record<
  MenuCategoryKey,
  { bg: string; text: string; border: string; iconBg: string }
> = {
  "iced-coffee": {
    bg: "bg-[#F5EDE6]",
    text: "text-amber-900",
    border: "border-amber-200/60",
    iconBg: "bg-amber-100 text-amber-900",
  },
  "non-coffee": {
    bg: "bg-[#EAF3EC]",
    text: "text-emerald-900",
    border: "border-emerald-200/60",
    iconBg: "bg-emerald-100 text-emerald-900",
  },
  "hot-coffee": {
    bg: "bg-[#F7EFE8]",
    text: "text-orange-900",
    border: "border-orange-200/60",
    iconBg: "bg-orange-100 text-orange-900",
  },
  frappes: {
    bg: "bg-[#F9ECEF]",
    text: "text-rose-900",
    border: "border-rose-200/60",
    iconBg: "bg-rose-100 text-rose-900",
  },
  tea: {
    bg: "bg-[#EFF5E8]",
    text: "text-lime-900",
    border: "border-lime-200/60",
    iconBg: "bg-lime-100 text-lime-900",
  },
  soda: {
    bg: "bg-[#EBF5F8]",
    text: "text-cyan-900",
    border: "border-cyan-200/60",
    iconBg: "bg-cyan-100 text-cyan-900",
  },
};

function getCategoryIcon(key: MenuCategoryKey) {
  switch (key) {
    case "iced-coffee":
      return <Coffee className="w-3.5 h-3.5" />;
    case "non-coffee":
      return <Milk className="w-3.5 h-3.5" />;
    case "hot-coffee":
      return <Flame className="w-3.5 h-3.5" />;
    case "frappes":
      return <IceCream className="w-3.5 h-3.5" />;
    case "tea":
      return <Leaf className="w-3.5 h-3.5" />;
    case "soda":
      return <Sparkles className="w-3.5 h-3.5" />;
  }
}

export function MenuItemCard({
  item,
  onAddToCart,
  currencyMode,
}: MenuItemCardProps) {
  const theme = CATEGORY_THEMES[item.category];

  return (
    <div className="group relative bg-white rounded-3xl p-3.5 sm:p-4 shadow-sm hover:shadow-lg border border-stone-200/80 hover:border-[#8E583C]/30 transition-all duration-300 flex flex-col justify-between overflow-hidden">
      <div>
        {/* Drink Image Container */}
        <div
          className={`relative w-full h-44 sm:h-48 rounded-2xl ${theme.bg} flex items-center justify-center overflow-hidden mb-3.5`}
        >
          {/* Category Icon Badge */}
          <div
            className={`absolute top-2.5 left-2.5 z-10 w-7 h-7 rounded-xl ${theme.iconBg} flex items-center justify-center shadow-xs backdrop-blur-xs`}
          >
            {getCategoryIcon(item.category)}
          </div>

          {/* Specialty / Popular Tag */}
          {item.tag && (
            <span className="absolute top-2.5 right-2.5 z-10 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-white/95 text-[#8E583C] shadow-xs border border-amber-200/80">
              {item.tag}
            </span>
          )}

          {/* Actual Drink Photo */}
          <img
            src={item.image}
            alt={`${item.nameKh} - ${item.nameEn}`}
            className="h-full w-auto max-w-[85%] object-contain py-2 drop-shadow-md group-hover:scale-108 transition-transform duration-300 pointer-events-none select-none"
            loading="lazy"
          />
        </div>

        {/* Title in Khmer & English */}
        <h3 className="font-khmer font-bold text-stone-900 text-base md:text-lg leading-snug group-hover:text-[#8E583C] transition-colors">
          {item.nameKh}
        </h3>
        <h4 className="text-xs md:text-sm font-semibold text-stone-500 mb-1.5">
          {item.nameEn}
        </h4>

        {item.description && (
          <p className="text-[11px] md:text-xs text-stone-400 line-clamp-2 mb-3">
            {item.description}
          </p>
        )}
      </div>

      {/* Pricing and Action Buttons (KHR Primary) */}
      <div className="mt-2 pt-3 border-t border-stone-100">
        {item.prices.large ? (
          // Dual size options (Regular & Large)
          <div className="grid grid-cols-2 gap-2">
            {/* Regular size */}
            <button
              onClick={() => onAddToCart(item, "regular", item.prices.regular)}
              className="flex items-center justify-between p-2 rounded-2xl bg-stone-50 hover:bg-[#8E583C]/10 border border-stone-200/70 hover:border-[#8E583C]/30 transition-all text-left group/btn"
              title="Add Regular size"
            >
              <div>
                <span className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                  Regular
                </span>
                <div className="flex flex-col">
                  {/* Main price: KHR */}
                  {currencyMode !== "usd" && (
                    <span className="font-extrabold text-xs sm:text-sm text-stone-900 group-hover/btn:text-[#8E583C]">
                      {item.prices.regular.riel.toLocaleString()}៛
                    </span>
                  )}
                  {/* Secondary price: USD */}
                  {currencyMode !== "khr" && (
                    <span
                      className={`font-semibold ${
                        currencyMode === "usd"
                          ? "text-xs sm:text-sm font-extrabold text-stone-900 group-hover/btn:text-[#8E583C]"
                          : "text-[10px] text-stone-500"
                      }`}
                    >
                      ${item.prices.regular.usd.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
              <div className="w-6 h-6 rounded-lg bg-white border border-stone-200 group-hover/btn:bg-[#8E583C] group-hover/btn:text-white group-hover/btn:border-[#8E583C] text-stone-600 flex items-center justify-center transition-colors shadow-2xs">
                <Plus className="w-3.5 h-3.5" />
              </div>
            </button>

            {/* Large size */}
            <button
              onClick={() => onAddToCart(item, "large", item.prices.large!)}
              className="flex items-center justify-between p-2 rounded-2xl bg-stone-50 hover:bg-[#8E583C]/10 border border-stone-200/70 hover:border-[#8E583C]/30 transition-all text-left group/btn"
              title="Add Large size"
            >
              <div>
                <span className="block text-[10px] font-bold text-[#8E583C] uppercase tracking-wider">
                  Large
                </span>
                <div className="flex flex-col">
                  {/* Main price: KHR */}
                  {currencyMode !== "usd" && (
                    <span className="font-extrabold text-xs sm:text-sm text-stone-900 group-hover/btn:text-[#8E583C]">
                      {item.prices.large.riel.toLocaleString()}៛
                    </span>
                  )}
                  {/* Secondary price: USD */}
                  {currencyMode !== "khr" && (
                    <span
                      className={`font-semibold ${
                        currencyMode === "usd"
                          ? "text-xs sm:text-sm font-extrabold text-stone-900 group-hover/btn:text-[#8E583C]"
                          : "text-[10px] text-stone-500"
                      }`}
                    >
                      ${item.prices.large.usd.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
              <div className="w-6 h-6 rounded-lg bg-white border border-stone-200 group-hover/btn:bg-[#8E583C] group-hover/btn:text-white group-hover/btn:border-[#8E583C] text-stone-600 flex items-center justify-center transition-colors shadow-2xs">
                <Plus className="w-3.5 h-3.5" />
              </div>
            </button>
          </div>
        ) : (
          // Single size option
          <div className="flex items-center justify-between gap-2">
            <div>
              <span className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                Standard
              </span>
              <div className="flex items-baseline gap-1.5">
                {/* Main price: KHR */}
                {currencyMode !== "usd" && (
                  <span className="font-black text-sm md:text-base text-stone-900">
                    {item.prices.regular.riel.toLocaleString()}៛
                  </span>
                )}
                {/* Secondary price: USD */}
                {currencyMode !== "khr" && (
                  <span
                    className={`font-semibold ${
                      currencyMode === "usd"
                        ? "text-sm md:text-base font-black text-stone-900"
                        : "text-xs text-stone-500"
                    }`}
                  >
                    (${item.prices.regular.usd.toFixed(2)})
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={() => onAddToCart(item, "regular", item.prices.regular)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-[#8E583C] hover:bg-[#73432B] text-white font-semibold text-xs transition-all active:scale-95 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
