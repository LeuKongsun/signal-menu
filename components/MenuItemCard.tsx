"use client";

import React, { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { MenuItem, MenuCategoryKey, PriceOption } from "@/data/menu";

type Size = "regular" | "large";

interface MenuItemCardProps {
  item: MenuItem;
  quantities: Record<Size, number>;
  onAddToCart: (item: MenuItem, size: Size, price: PriceOption) => void;
  onRemoveOne: (item: MenuItem, size: Size) => void;
  currencyMode: "both" | "usd" | "khr";
}

const TILE_BG: Record<MenuCategoryKey, string> = {
  "iced-coffee": "bg-[#F5EDE6]",
  "non-coffee": "bg-[#EAF3EC]",
  "hot-coffee": "bg-[#F7EFE8]",
  frappes: "bg-[#F9ECEF]",
  tea: "bg-[#EFF5E8]",
  soda: "bg-[#EBF5F8]",
};

export function MenuItemCard({
  item,
  quantities,
  onAddToCart,
  onRemoveOne,
  currencyMode,
}: MenuItemCardProps) {
  const [size, setSize] = useState<Size>("regular");
  const price = (size === "large" && item.prices.large) || item.prices.regular;
  const count = quantities[size];
  const total = quantities.regular + quantities.large;

  return (
    <div className="flex flex-col items-center text-center">
      <div
        className={`relative w-full aspect-square rounded-2xl ${TILE_BG[item.category]} flex items-center justify-center`}
      >
        <img
          src={item.image}
          alt={`${item.nameKh} - ${item.nameEn}`}
          className="h-[88%] w-auto object-contain drop-shadow-md pointer-events-none select-none"
          loading="lazy"
        />
        {item.tag && (
          <span className="absolute bottom-1.5 left-1.5 px-1.5 py-px rounded-md text-[9px] font-extrabold uppercase tracking-wide bg-white/90 text-[#8E583C]">
            {item.tag}
          </span>
        )}
        {total > 0 && (
          <span
            key={total}
            className="badge-pop absolute -top-1.5 -right-1.5 min-w-6 h-6 px-1.5 rounded-full bg-[#E8A33D] text-white text-xs font-extrabold flex items-center justify-center shadow-sm ring-2 ring-[#FAF8F5]"
          >
            {total}
          </span>
        )}
      </div>

      <h3 className="mt-2 w-full font-khmer font-bold text-[13px] leading-tight text-stone-900 line-clamp-1">
        {item.nameKh}
      </h3>
      <p className="w-full text-[11px] text-stone-500 line-clamp-1">
        {item.nameEn}
      </p>
      <p className="mt-0.5 text-[12px] font-extrabold text-stone-900">
        {currencyMode === "usd"
          ? `$${price.usd.toFixed(2)}`
          : `${price.riel.toLocaleString("en-US")}៛`}
        {currencyMode === "both" && (
          <span className="ml-1 font-semibold text-stone-400">
            ${price.usd.toFixed(2)}
          </span>
        )}
      </p>

      {item.prices.large && (
        <div className="mt-1.5 grid grid-cols-2 w-full max-w-24 p-0.5 rounded-lg bg-stone-200/70 text-[10px] font-extrabold">
          {(["regular", "large"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setSize(option)}
              aria-pressed={size === option}
              className={`py-0.5 rounded-md transition-colors ${
                size === option
                  ? "bg-white text-[#8E583C] shadow-xs"
                  : "text-stone-500"
              }`}
            >
              {option === "regular" ? "R" : "L"}
              {quantities[option] > 0 && (
                <span className="ml-0.5 text-[#E8A33D]">·{quantities[option]}</span>
              )}
            </button>
          ))}
        </div>
      )}

      <div className="mt-1.5 w-full max-w-24 h-8">
        {count === 0 ? (
          <button
            type="button"
            onClick={() => onAddToCart(item, size, price)}
            className="w-full h-full rounded-lg bg-[#E8A33D] hover:bg-[#D9922B] text-white text-xs font-extrabold tracking-wide transition-colors active:scale-95 font-khmer"
          >
            ថែម
          </button>
        ) : (
          <div className="grid grid-cols-2 gap-1.5 h-full">
            <button
              type="button"
              onClick={() => onRemoveOne(item, size)}
              aria-label={`Remove one ${item.nameEn}`}
              className="rounded-lg bg-[#D9534F] hover:bg-[#C9433F] text-white flex items-center justify-center transition-colors active:scale-95"
            >
              <Minus className="w-4 h-4" strokeWidth={3} />
            </button>
            <button
              type="button"
              onClick={() => onAddToCart(item, size, price)}
              aria-label={`Add one ${item.nameEn}`}
              className="rounded-lg bg-[#E8A33D] hover:bg-[#D9922B] text-white flex items-center justify-center transition-colors active:scale-95"
            >
              <Plus className="w-4 h-4" strokeWidth={3} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
