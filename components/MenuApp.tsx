"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  MENU_CATEGORIES,
  MENU_ITEMS,
  MenuItem,
  MenuCategoryKey,
  PriceOption,
} from "@/data/menu";
import { Header } from "./Header";
import { CategoryTabs } from "./CategoryTabs";
import { MenuItemCard } from "./MenuItemCard";
import { OrderTray, TrayItem } from "./OrderTray";
import { PdfModal } from "./PdfModal";
import { CheckoutModal } from "./CheckoutModal";
import { Coffee, SearchX } from "lucide-react";
import { useTelegramWebApp } from "@/lib/useTelegramWebApp";

const TRAY_STORAGE_KEY = "signal-tray-v1";
type StoredTrayEntry = { id: string; size: "regular" | "large"; quantity: number };

/** Rebuilds the saved tray from the current menu, so stale prices or removed drinks drop out. */
function loadSavedTray(): TrayItem[] {
  try {
    const saved = JSON.parse(localStorage.getItem(TRAY_STORAGE_KEY) || "[]") as StoredTrayEntry[];
    return saved.flatMap(({ id, size, quantity }) => {
      const item = MENU_ITEMS.find((m) => m.id === id);
      const price = size === "large" ? item?.prices.large : item?.prices.regular;
      if (!item || !price || !(quantity > 0)) return [];
      return [{ cartId: `${id}-${size}`, item, size, price, quantity }];
    });
  } catch {
    return [];
  }
}

export function MenuApp() {
  const [selectedCategory, setSelectedCategory] = useState<
    MenuCategoryKey | "all"
  >("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currencyMode, setCurrencyMode] = useState<"both" | "usd" | "khr">(
    "both"
  );
  const [tray, setTray] = useState<TrayItem[]>([]);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [isTrayOpen, setIsTrayOpen] = useState(false);
  const tg = useTelegramWebApp();

  const [trayLoaded, setTrayLoaded] = useState(false);

  // Telegram can reload the Mini App while the customer is paying in ABA, so keep the tray on the device
  useEffect(() => {
    Promise.resolve().then(() => {
      setTray(loadSavedTray());
      setTrayLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!trayLoaded) return;
    try {
      const entries: StoredTrayEntry[] = tray.map(({ item, size, quantity }) => ({
        id: item.id,
        size,
        quantity,
      }));
      localStorage.setItem(TRAY_STORAGE_KEY, JSON.stringify(entries));
    } catch {
      // Storage can be unavailable (private mode); the tray still works in memory
    }
  }, [tray, trayLoaded]);

  const trayCount = tray.reduce((sum, i) => sum + i.quantity, 0);
  const trayRiel = tray.reduce((sum, i) => sum + i.price.riel * i.quantity, 0);

  // Inside Telegram, Telegram's own bottom button drives the order flow
  useEffect(() => {
    if (!tg) return;
    const button = tg.MainButton;

    let text: string | null = null;
    let action: (() => void) | null = null;
    if (!isCheckoutModalOpen && trayCount > 0) {
      const total = `${trayRiel.toLocaleString("en-US")}៛`;
      if (isTrayOpen) {
        text = `កុម្ម៉ង់ឥឡូវ • ${total}`;
        action = () => {
          setIsTrayOpen(false);
          setIsCheckoutModalOpen(true);
        };
      } else {
        text = `មើលការកុម្ម៉ង់ • ${trayCount} • ${total}`;
        action = () => setIsTrayOpen(true);
      }
    }

    if (!text || !action) {
      button.hide();
      return;
    }
    button.setParams({
      text,
      color: "#8E583C",
      text_color: "#FFFFFF",
      is_active: true,
      is_visible: true,
    });
    button.onClick(action);
    return () => button.offClick(action);
  }, [tg, isTrayOpen, isCheckoutModalOpen, trayCount, trayRiel]);

  useEffect(() => {
    if (!tg || !tg.isVersionAtLeast("6.1")) return;
    const back = tg.BackButton;
    const action = isCheckoutModalOpen
      ? () => setIsCheckoutModalOpen(false)
      : isTrayOpen
        ? () => setIsTrayOpen(false)
        : null;

    if (!action) {
      back.hide();
      return;
    }
    back.show();
    back.onClick(action);
    return () => back.offClick(action);
  }, [tg, isTrayOpen, isCheckoutModalOpen]);

  useEffect(() => {
    if (!tg || !tg.isVersionAtLeast("6.2")) return;
    if (trayCount > 0) tg.enableClosingConfirmation();
    else tg.disableClosingConfirmation();
  }, [tg, trayCount]);

  // Cart / Tray handlers
  const handleAddToCart = (
    item: MenuItem,
    size: "regular" | "large",
    price: PriceOption
  ) => {
    if (tg?.isVersionAtLeast("6.1")) tg.HapticFeedback.impactOccurred("light");
    if (trayCount === 0) setIsTrayOpen(false);
    const cartId = `${item.id}-${size}`;
    setTray((prev) => {
      const existing = prev.find((entry) => entry.cartId === cartId);
      if (existing) {
        return prev.map((entry) =>
          entry.cartId === cartId
            ? { ...entry, quantity: entry.quantity + 1 }
            : entry
        );
      }
      return [...prev, { cartId, item, size, price, quantity: 1 }];
    });
  };

  const handleUpdateQuantity = (cartId: string, delta: number) => {
    setTray((prev) =>
      prev
        .map((entry) => {
          if (entry.cartId === cartId) {
            const nextQty = entry.quantity + delta;
            return nextQty > 0 ? { ...entry, quantity: nextQty } : null;
          }
          return entry;
        })
        .filter(Boolean) as TrayItem[]
    );
  };

  const handleRemoveOne = (item: MenuItem, size: "regular" | "large") => {
    if (tg?.isVersionAtLeast("6.1")) tg.HapticFeedback.impactOccurred("light");
    handleUpdateQuantity(`${item.id}-${size}`, -1);
  };

  const quantitiesFor = (item: MenuItem) => {
    const count = (size: "regular" | "large") =>
      tray.find((entry) => entry.cartId === `${item.id}-${size}`)?.quantity ?? 0;
    return { regular: count("regular"), large: count("large") };
  };

  const renderGrid = (items: MenuItem[]) => (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-x-3 gap-y-6">
      {items.map((item) => (
        <MenuItemCard
          key={item.id}
          item={item}
          quantities={quantitiesFor(item)}
          onAddToCart={handleAddToCart}
          onRemoveOne={handleRemoveOne}
          currencyMode={currencyMode}
        />
      ))}
    </div>
  );

  const handleRemoveItem = (cartId: string) => {
    setTray((prev) => prev.filter((entry) => entry.cartId !== cartId));
  };

  const handleClearTray = () => {
    setTray([]);
  };

  // Filtered items based on search query and category
  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return MENU_ITEMS.filter((item) => {
      const matchesSearch =
        !query ||
        item.nameEn.toLowerCase().includes(query) ||
        item.nameKh.includes(query) ||
        (item.description && item.description.toLowerCase().includes(query));

      const matchesCategory =
        selectedCategory === "all" || item.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F5]">
      {/* Header */}
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        currencyMode={currencyMode}
        onCurrencyChange={setCurrencyMode}
        onOpenPdf={() => setIsPdfModalOpen(true)}
      />

      {/* Category Tabs */}
      <CategoryTabs
        selectedCategory={selectedCategory}
        onSelectCategory={(cat) => {
          setSelectedCategory(cat);
          setSearchQuery("");
        }}
      />

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6">
        {filteredItems.length === 0 ? (
          // Empty Search State
          <div className="py-16 text-center max-w-md mx-auto font-khmer">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 text-[#8E583C] flex items-center justify-center mx-auto mb-4">
              <SearchX className="w-7 h-7" />
            </div>
            <h3 className="font-bold text-stone-800 text-lg mb-1">
              រកមិនឃើញភេសជ្ជៈទេ
            </h3>
            <p className="text-sm text-stone-500 mb-4">
              គ្មានភេសជ្ជៈណាត្រូវនឹង «{searchQuery}» ឡើយ។
            </p>
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("all");
              }}
              className="px-4 py-2 rounded-xl bg-[#8E583C] text-white font-bold text-xs hover:bg-[#73432B] transition-colors"
            >
              បង្ហាញទាំងអស់
            </button>
          </div>
        ) : selectedCategory === "all" && !searchQuery ? (
          // Grouped by Category View when in "All" mode
          <div className="space-y-10">
            {MENU_CATEGORIES.map((cat) => {
              const categoryItems = MENU_ITEMS.filter(
                (i) => i.category === cat.key
              );
              if (categoryItems.length === 0) return null;

              return (
                <section key={cat.key} id={cat.key} className="scroll-mt-20">
                  <h2 className="flex items-baseline gap-2 mb-3">
                    <span className="font-khmer font-bold text-stone-900 text-lg">
                      {cat.nameKh}
                    </span>
                    <span className="text-[11px] font-extrabold uppercase text-[#8E583C] tracking-wider">
                      {cat.nameEn}
                    </span>
                  </h2>
                  {renderGrid(categoryItems)}
                </section>
              );
            })}
          </div>
        ) : (
          // Flat Grid View for specific category or search
          <div>
            <div className="flex items-center justify-between mb-4 font-khmer">
              <h2 className="font-bold text-stone-900 text-lg">
                {searchQuery ? (
                  <span>
                    លទ្ធផលស្វែងរក «{searchQuery}»
                  </span>
                ) : (
                  <span>
                    {
                      MENU_CATEGORIES.find((c) => c.key === selectedCategory)
                        ?.nameKh
                    }
                  </span>
                )}
              </h2>
              <span className="text-xs font-bold text-stone-500">
                {filteredItems.length} កែវ
              </span>
            </div>

            {renderGrid(filteredItems)}
          </div>
        )}
      </main>

      {/* Order Tray / Bottom Calculator */}
      <OrderTray
        tray={tray}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onClearTray={handleClearTray}
        onProceedToCheckout={() => setIsCheckoutModalOpen(true)}
        currencyMode={currencyMode}
        isOpen={isTrayOpen && trayCount > 0}
        onOpenChange={setIsTrayOpen}
        nativeButtons={Boolean(tg)}
      />

      {/* Checkout & Telegram Payment Modal */}
      {isCheckoutModalOpen && (
        <CheckoutModal
          isOpen
          onClose={() => setIsCheckoutModalOpen(false)}
          tray={tray}
          onOrderSuccess={() => setTray([])}
          telegram={tg}
        />
      )}

      {/* PDF Modal */}
      <PdfModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
      />

      {/* Footer */}
      <footer className="mt-16 bg-[#2A1B14] text-stone-300 py-8 px-4 border-t border-stone-800">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#8E583C] text-white flex items-center justify-center font-bold">
              <Coffee className="w-5 h-5" />
            </div>
            <div>
              <div className="font-black text-white text-base tracking-wider uppercase">
                SIGNAL CAFE
              </div>
              <div className="text-xs text-stone-400 font-khmer">
                កាហ្វេ និងភេសជ្ជៈស្រស់ៗគុណភាពខ្ពស់
              </div>
            </div>
          </div>

          <div className="text-xs text-stone-400 font-khmer">
            <span>តម្លៃគិតជាប្រាក់រៀល (៛) និងដុល្លារ ($)</span>
            <div className="mt-1">
              សូមអរគុណសម្រាប់ការគាំទ្រហាង SIGNAL
            </div>
          </div>

          <button
            onClick={() => setIsPdfModalOpen(true)}
            className="text-xs font-semibold text-amber-200 hover:text-white underline underline-offset-4 font-khmer"
          >
            មើលម៉ឺនុយ PDF
          </button>
        </div>
      </footer>
    </div>
  );
}
