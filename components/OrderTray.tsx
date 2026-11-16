"use client";

import React, { useState } from "react";
import {
  ShoppingCart,
  X,
  Plus,
  Minus,
  Trash2,
  Share2,
  Check,
  ChevronUp,
} from "lucide-react";
import { MenuItem, PriceOption } from "@/data/menu";

export interface TrayItem {
  cartId: string;
  item: MenuItem;
  size: "regular" | "large";
  price: PriceOption;
  quantity: number;
}

interface OrderTrayProps {
  tray: TrayItem[];
  onUpdateQuantity: (cartId: string, delta: number) => void;
  onRemoveItem: (cartId: string) => void;
  onClearTray: () => void;
  onProceedToCheckout: () => void;
  currencyMode: "both" | "usd" | "khr";
}

export function OrderTray({
  tray,
  onUpdateQuantity,
  onRemoveItem,
  onClearTray,
  onProceedToCheckout,
  currencyMode,
}: OrderTrayProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const totalCount = tray.reduce((sum, i) => sum + i.quantity, 0);
  const totalUsd = tray.reduce((sum, i) => sum + i.price.usd * i.quantity, 0);
  const totalRiel = tray.reduce((sum, i) => sum + i.price.riel * i.quantity, 0);

  if (totalCount === 0) return null;

  const handleShareToTelegram = () => {
    let text = "☕ *SIGNAL CAFE ORDER* ☕\n---------------------------\n";
    tray.forEach((entry, idx) => {
      const sizeLabel = entry.item.prices.large
        ? ` (${entry.size === "regular" ? "Regular" : "Large"})`
        : "";
      text += `${idx + 1}. ${entry.item.nameKh} / ${entry.item.nameEn}${sizeLabel}\n`;
      text += `   Qty: ${entry.quantity}x • ${(entry.price.riel * entry.quantity).toLocaleString()}៛ ($${(entry.price.usd * entry.quantity).toFixed(2)})\n`;
    });
    text += "---------------------------\n";
    text += `💰 Total: ${totalRiel.toLocaleString()}៛ ($${totalUsd.toFixed(2)})\n`;
    text += "📍 SIGNAL Cafe";

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <>
      {/* Floating Bottom Bar */}
      <div className="fixed bottom-4 left-0 right-0 z-40 px-4 max-w-lg mx-auto pointer-events-none">
        <button
          onClick={() => setIsOpen(true)}
          className="pointer-events-auto w-full bg-[#8E583C] text-white rounded-2xl p-3.5 shadow-2xl flex items-center justify-between border border-[#A76947] hover:bg-[#7D4C33] active:scale-[0.98] transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center font-bold text-sm relative">
              <ShoppingCart className="w-5 h-5 text-white" />
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 text-white text-xs flex items-center justify-center font-bold border-2 border-[#8E583C]">
                {totalCount}
              </span>
            </div>
            <div className="text-left">
              <div className="text-xs uppercase tracking-wider text-amber-200 font-semibold">
                Table Order Tray
              </div>
              <div className="font-bold text-base leading-tight">
                {totalCount} {totalCount === 1 ? "drink" : "drinks"} selected
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              {/* Main price: KHR */}
              {currencyMode !== "usd" && (
                <div className="font-black text-lg text-white">
                  {totalRiel.toLocaleString()}៛
                </div>
              )}
              {/* Secondary price: USD */}
              {currencyMode !== "khr" && (
                <div
                  className={`font-semibold ${
                    currencyMode === "usd"
                      ? "text-lg text-white font-black"
                      : "text-xs text-amber-200"
                  }`}
                >
                  ${totalUsd.toFixed(2)}
                </div>
              )}
            </div>
            <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center text-white">
              <ChevronUp className="w-5 h-5" />
            </div>
          </div>
        </button>
      </div>

      {/* Slide-up Drawer Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl max-h-[85vh] flex flex-col shadow-2xl border border-stone-200 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100 bg-[#FAF7F2]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#8E583C]/10 text-[#8E583C] flex items-center justify-center">
                  <ShoppingCart className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-stone-900 text-base leading-tight">
                    Order Summary
                  </h3>
                  <p className="text-xs text-stone-500 font-khmer">
                    បញ្ជីភេសជ្ជៈដែលបានជ្រើសរើស ({totalCount})
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={onClearTray}
                  className="p-2 text-stone-400 hover:text-rose-600 rounded-lg hover:bg-stone-100 transition-colors"
                  title="Clear Tray"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 divide-y divide-stone-100">
              {tray.map((entry) => (
                <div
                  key={entry.cartId}
                  className="pt-3 first:pt-0 flex items-center justify-between gap-3"
                >
                  {/* Drink Thumbnail */}
                  <div className="w-11 h-11 rounded-xl bg-[#FAF7F2] flex items-center justify-center shrink-0 overflow-hidden border border-stone-200/70 p-0.5">
                    <img
                      src={entry.item.image}
                      alt={entry.item.nameEn}
                      className="h-full w-auto object-contain"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="font-khmer font-bold text-stone-900 text-sm truncate">
                      {entry.item.nameKh}
                    </div>
                    <div className="text-xs text-stone-500 flex items-center gap-1.5 truncate">
                      <span>{entry.item.nameEn}</span>
                      {entry.item.prices.large && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold uppercase bg-amber-100 text-amber-800">
                          {entry.size === "regular" ? "Regular" : "Large"}
                        </span>
                      )}
                    </div>
                    {/* Price with KHR first */}
                    <div className="text-xs font-semibold text-[#8E583C] mt-0.5">
                      {entry.price.riel.toLocaleString()}៛
                      <span className="text-stone-400 font-normal ml-1">
                        (${entry.price.usd.toFixed(2)})
                      </span>
                    </div>
                  </div>

                  {/* Quantity controls */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center bg-stone-100 rounded-lg p-0.5 border border-stone-200">
                      <button
                        onClick={() => onUpdateQuantity(entry.cartId, -1)}
                        className="w-7 h-7 flex items-center justify-center text-stone-600 hover:text-stone-900 hover:bg-white rounded-md transition-colors"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-7 text-center font-bold text-sm text-stone-900">
                        {entry.quantity}
                      </span>
                      <button
                        onClick={() => onUpdateQuantity(entry.cartId, 1)}
                        className="w-7 h-7 flex items-center justify-center text-stone-600 hover:text-stone-900 hover:bg-white rounded-md transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <button
                      onClick={() => onRemoveItem(entry.cartId)}
                      className="p-1.5 text-stone-300 hover:text-rose-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer Summary */}
            <div className="p-4 bg-[#FAF7F2] border-t border-stone-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-stone-500 font-medium text-sm">
                  Estimated Total:
                </span>
                <div className="text-right">
                  {/* Primary Total in KHR */}
                  <div className="font-extrabold text-xl sm:text-2xl text-[#8E583C]">
                    {totalRiel.toLocaleString()} ៛
                  </div>
                  {/* Secondary Total in USD */}
                  <div className="text-xs font-semibold text-stone-500">
                    ≈ ${totalUsd.toFixed(2)} USD
                  </div>
                </div>
              </div>

              {/* Primary Order & Pay Button */}
              <button
                onClick={() => {
                  setIsOpen(false);
                  onProceedToCheckout();
                }}
                className="w-full py-3 px-4 rounded-2xl bg-[#8E583C] text-white font-extrabold text-sm hover:bg-[#73432B] transition-all shadow-md shadow-[#8E583C]/25 flex items-center justify-center gap-2"
              >
                <span>Place Order &amp; Pay (កុម្ម៉ង់ និងទូទាត់)</span>
              </button>

              {/* Secondary actions */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={handleShareToTelegram}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white text-stone-600 border border-stone-200 font-semibold text-xs hover:bg-stone-50 transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Copy Text</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => setIsOpen(false)}
                  className="py-2 px-3 rounded-xl bg-stone-100 text-stone-700 font-semibold text-xs hover:bg-stone-200 transition-colors"
                >
                  Add More Drinks
                </button>
              </div>

              <p className="text-[11px] text-center text-stone-400 font-khmer">
                បង្ហាញបញ្ជីនេះទៅកាន់អ្នកគិតលុយ ឬ Barista ដើម្បីកុម្ម៉ង់
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
