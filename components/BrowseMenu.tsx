"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, FileText, X } from "lucide-react";
import {
  MENU_CATEGORIES,
  MENU_ITEMS,
  MenuCategoryKey,
  MenuItem,
  PriceOption,
} from "@/data/menu";

type Currency = "khr" | "usd";

const TINTS: Record<MenuCategoryKey, string> = {
  "iced-coffee": "#EADBCB",
  "non-coffee": "#DCE8D8",
  "hot-coffee": "#EFD9C6",
  frappes: "#F1DADF",
  tea: "#E2EAD0",
  soda: "#D6E7EC",
};

function formatPrice(price: PriceOption, currency: Currency) {
  return currency === "khr"
    ? `${price.riel.toLocaleString("en-US")}៛`
    : `$${price.usd.toFixed(2)}`;
}

function SignalMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <circle cx="16" cy="22" r="3" fill="currentColor" />
      <path
        className="signal-wave"
        d="M10.5 16.5a7.8 7.8 0 0 1 11 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        className="signal-wave"
        style={{ animationDelay: "0.4s" }}
        d="M6 12a14 14 0 0 1 20 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function BrowseMenu() {
  const [currency, setCurrency] = useState<Currency>("khr");
  const [activeCategory, setActiveCategory] = useState<MenuCategoryKey>(
    MENU_CATEGORIES[0].key
  );
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const chipRefs = useRef<Partial<Record<MenuCategoryKey, HTMLButtonElement>>>({});

  const sections = useMemo(
    () =>
      MENU_CATEGORIES.map((category) => {
        const items = MENU_ITEMS.filter((i) => i.category === category.key);
        return {
          category,
          items,
          hasSizes: items.some((i) => i.prices.large),
        };
      }).filter((s) => s.items.length > 0),
    []
  );

  const housePicks = useMemo(() => MENU_ITEMS.filter((i) => i.tag), []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveCategory(
              entry.target.getAttribute("data-category") as MenuCategoryKey
            );
          }
        }
      },
      { rootMargin: "-25% 0px -65% 0px" }
    );
    document
      .querySelectorAll("[data-category]")
      .forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const nav = navRef.current;
    const chip = chipRefs.current[activeCategory];
    if (nav && chip) {
      const offset =
        chip.getBoundingClientRect().left - nav.getBoundingClientRect().left;
      nav.scrollTo({ left: nav.scrollLeft + offset - 16, behavior: "smooth" });
    }
  }, [activeCategory]);

  const jumpTo = (key: MenuCategoryKey) => {
    document
      .getElementById(`menu-${key}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="paper-grain min-h-screen text-[#2A1B14]">
      {/* Masthead */}
      <header className="relative overflow-hidden pt-6 pb-10">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full border-[28px] border-[#8E583C]/[0.07]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full border-[18px] border-[#8E583C]/[0.06]"
        />

        <div className="relative mx-auto max-w-3xl px-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#8E583C]">
              <SignalMark className="h-7 w-7" />
              <span className="text-sm font-extrabold uppercase tracking-[0.28em] text-[#2A1B14]">
                Signal Cafe
              </span>
            </div>

            <div
              role="group"
              aria-label="Currency"
              className="flex rounded-full border border-[#2A1B14]/15 bg-white/60 p-0.5 text-xs font-bold"
            >
              {(["khr", "usd"] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => setCurrency(c)}
                  aria-pressed={currency === c}
                  className={`rounded-full px-3 py-1.5 transition-colors ${
                    currency === c
                      ? "bg-[#2A1B14] text-[#F4EDE3]"
                      : "text-[#2A1B14]/60"
                  }`}
                >
                  {c === "khr" ? "៛ Riel" : "$ USD"}
                </button>
              ))}
            </div>
          </div>

          <p
            className="animate-rise font-khmer mt-10 text-sm font-semibold text-[#8E583C]"
            style={{ animationDelay: "0.05s" }}
          >
            សូមស្វាគមន៍ · Welcome in
          </p>
          <h1
            className="animate-rise font-display mt-1 text-[3.6rem] font-semibold leading-[0.95] tracking-tight sm:text-7xl"
            style={{ animationDelay: "0.15s" }}
          >
            Stop <span className="italic font-normal text-[#8E583C]">&amp;</span>
            <br />
            Sip.
          </h1>
          <p
            className="animate-rise mt-5 max-w-sm text-[15px] leading-relaxed text-[#2A1B14]/75"
            style={{ animationDelay: "0.25s" }}
          >
            Take your time and look around. When you&apos;re ready, order at
            the counter.
            <span className="font-khmer mt-1 block text-sm text-[#2A1B14]/60">
              សូមជ្រើសរើសភេសជ្ជៈ ហើយកម្ម៉ង់នៅបញ្ជរ
            </span>
          </p>
          <p
            className="animate-rise mt-6 text-[11px] font-bold uppercase tracking-[0.22em] text-[#2A1B14]/45"
            style={{ animationDelay: "0.35s" }}
          >
            {MENU_ITEMS.length} drinks · {sections.length} categories
          </p>
        </div>
      </header>

      {/* House picks */}
      {housePicks.length > 0 && (
        <section
          className="animate-rise pb-8"
          style={{ animationDelay: "0.45s" }}
          aria-label="House picks"
        >
          <div className="mx-auto mb-3 flex max-w-3xl items-baseline justify-between px-5">
            <h2 className="font-display text-xl font-semibold italic">
              House picks
            </h2>
            <span className="text-[11px] font-semibold text-[#2A1B14]/45">
              Swipe →
            </span>
          </div>
          <div className="no-scrollbar mx-auto flex max-w-3xl snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto px-5 pb-2">
            {housePicks.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedItem(item)}
                className="group w-36 shrink-0 snap-start text-left"
              >
                <div
                  className="relative flex h-44 items-end justify-center overflow-hidden rounded-[1.6rem]"
                  style={{ backgroundColor: TINTS[item.category] }}
                >
                  <span className="absolute left-2.5 top-2.5 rounded-full bg-[#2A1B14] px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-[#F4EDE3]">
                    {item.tag}
                  </span>
                  <img
                    src={item.image}
                    alt=""
                    loading="lazy"
                    className="h-[88%] w-auto object-contain drop-shadow-lg transition-transform duration-300 group-active:scale-95"
                  />
                </div>
                <div className="font-khmer mt-2 truncate text-sm font-semibold">
                  {item.nameKh}
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-display truncate text-[13px] italic text-[#2A1B14]/65">
                    {item.nameEn}
                  </span>
                  <span className="shrink-0 text-xs font-bold text-[#8E583C]">
                    {formatPrice(item.prices.regular, currency)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Category rail */}
      <nav
        className="sticky top-0 z-30 border-y border-[#2A1B14]/10 bg-[#F4EDE3]/90 backdrop-blur-md"
        aria-label="Menu categories"
      >
        <div
          ref={navRef}
          className="no-scrollbar mx-auto flex max-w-3xl gap-1.5 overflow-x-auto px-4 py-2.5"
        >
          {sections.map(({ category }) => {
            const isActive = activeCategory === category.key;
            return (
              <button
                key={category.key}
                ref={(el) => {
                  if (el) chipRefs.current[category.key] = el;
                }}
                onClick={() => jumpTo(category.key)}
                aria-current={isActive ? "true" : undefined}
                className={`shrink-0 rounded-full px-3.5 py-1.5 transition-colors ${
                  isActive
                    ? "bg-[#2A1B14] text-[#F4EDE3]"
                    : "text-[#2A1B14]/65 hover:text-[#2A1B14]"
                }`}
              >
                <span className="font-khmer text-[13px] font-semibold">
                  {category.nameKh}
                </span>
                <span
                  className={`ml-1.5 text-[10px] font-bold uppercase tracking-wider ${
                    isActive ? "text-[#F4EDE3]/60" : "text-[#2A1B14]/40"
                  }`}
                >
                  {category.nameEn}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Menu sections */}
      <main className="mx-auto max-w-3xl px-5 pb-16">
        {sections.map(({ category, items, hasSizes }, sectionIndex) => (
          <section
            key={category.key}
            id={`menu-${category.key}`}
            data-category={category.key}
            className="scroll-mt-16 pt-10"
          >
            <div className="flex items-end gap-4 border-b-2 border-[#2A1B14] pb-3">
              <span className="font-display text-5xl font-light leading-none text-[#8E583C]/50">
                {String(sectionIndex + 1).padStart(2, "0")}
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="font-khmer text-2xl font-bold leading-tight">
                  {category.nameKh}
                </h2>
                <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-[#2A1B14]/55">
                  {category.nameEn}
                </p>
              </div>
              {hasSizes && (
                <div className="hidden text-right text-[10px] font-bold uppercase tracking-wider text-[#2A1B14]/45 min-[380px]:block">
                  Regular / Large
                </div>
              )}
            </div>
            <p className="mt-2 text-xs italic text-[#2A1B14]/55">
              {category.description}
            </p>

            <ul className="mt-2">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => setSelectedItem(item)}
                    className="group flex w-full items-center gap-3.5 border-b border-dashed border-[#2A1B14]/15 py-3.5 text-left transition-colors active:bg-[#2A1B14]/[0.03]"
                  >
                    <div
                      className="flex h-16 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl"
                      style={{ backgroundColor: TINTS[item.category] }}
                    >
                      <img
                        src={item.image}
                        alt=""
                        loading="lazy"
                        className="h-[90%] w-auto object-contain drop-shadow-sm"
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-khmer truncate text-[15px] font-semibold">
                          {item.nameKh}
                        </span>
                        {item.tag && (
                          <span className="shrink-0 rounded-full border border-[#8E583C]/40 px-1.5 py-px text-[9px] font-extrabold uppercase tracking-wider text-[#8E583C]">
                            {item.tag}
                          </span>
                        )}
                      </div>
                      <div className="font-display truncate text-[15px] italic text-[#2A1B14]/65">
                        {item.nameEn}
                      </div>
                    </div>

                    <div className="shrink-0 text-right tabular-nums">
                      <div className="text-[15px] font-bold">
                        {formatPrice(item.prices.regular, currency)}
                      </div>
                      {item.prices.large && (
                        <div className="text-xs font-semibold text-[#2A1B14]/50">
                          L {formatPrice(item.prices.large, currency)}
                        </div>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </main>

      {/* Footer */}
      <footer className="bg-[#2A1B14] px-5 py-10 text-[#F4EDE3]">
        <div className="mx-auto max-w-3xl">
          <p className="font-khmer text-2xl font-bold leading-tight">
            ចង់កុម្ម៉ង់មែនទេ?
          </p>
          <p className="mt-2 text-sm text-[#F4EDE3]/70 font-khmer">
            សូមប្រាប់ឈ្មោះភេសជ្ជៈ និងទំហំដល់បារីស្តានៅបញ្ជរ
          </p>

          <div className="mt-6 flex flex-wrap gap-2 font-khmer">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-full bg-[#F4EDE3] px-4 py-2 text-xs font-bold text-[#2A1B14]"
            >
              កុម្ម៉ង់អនឡាញ
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
            <a
              href="/Signal%20Menu.pdf"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-[#F4EDE3]/25 px-4 py-2 text-xs font-bold text-[#F4EDE3]/85"
            >
              <FileText className="h-3.5 w-3.5" />
              ម៉ឺនុយ PDF
            </a>
          </div>

          <div className="mt-10 flex items-center gap-2 text-[#F4EDE3]/45">
            <SignalMark className="h-5 w-5" />
            <span className="text-[11px] font-bold uppercase tracking-[0.25em]">
              Stop &amp; Sip @ Signal
            </span>
          </div>
        </div>
      </footer>

      {selectedItem && (
        <DrinkSheet
          item={selectedItem}
          currency={currency}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </div>
  );
}

function DrinkSheet({
  item,
  currency,
  onClose,
}: {
  item: MenuItem;
  currency: Currency;
  onClose: () => void;
}) {
  const category = MENU_CATEGORIES.find((c) => c.key === item.category);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const sizes: { label: string; labelKh: string; price: PriceOption }[] = [
    {
      label: item.prices.large ? "Regular" : "Standard",
      labelKh: item.prices.large ? "ធម្មតា" : "ស្តង់ដារ",
      price: item.prices.regular,
    },
    ...(item.prices.large
      ? [{ label: "Large", labelKh: "ធំ", price: item.prices.large }]
      : []),
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={item.nameEn}
    >
      <button
        aria-label="Close"
        onClick={onClose}
        className="animate-fade-in absolute inset-0 bg-[#2A1B14]/55 backdrop-blur-[2px]"
      />

      <div className="animate-sheet-up relative max-h-[92vh] w-full overflow-y-auto rounded-t-[2rem] bg-[#F4EDE3] sm:max-w-md sm:rounded-[2rem]">
        <div
          className="relative flex h-72 items-end justify-center"
          style={{ backgroundColor: TINTS[item.category] }}
        >
          <div className="absolute left-1/2 top-2.5 h-1 w-10 -translate-x-1/2 rounded-full bg-[#2A1B14]/20 sm:hidden" />
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-[#F4EDE3]/80 text-[#2A1B14]"
          >
            <X className="h-4 w-4" />
          </button>
          {item.tag && (
            <span className="absolute left-4 top-5 rounded-full bg-[#2A1B14] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-[#F4EDE3]">
              {item.tag}
            </span>
          )}
          <img
            src={item.image}
            alt={`${item.nameKh} - ${item.nameEn}`}
            className="h-[92%] w-auto object-contain drop-shadow-xl"
          />
        </div>

        <div className="px-6 pb-8 pt-5">
          {category && (
            <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-[#8E583C]">
              {category.nameEn}
            </p>
          )}
          <h3 className="font-khmer mt-1 text-2xl font-bold leading-snug">
            {item.nameKh}
          </h3>
          <p className="font-display text-xl italic text-[#2A1B14]/70">
            {item.nameEn}
          </p>
          {item.description && (
            <p className="mt-3 text-sm leading-relaxed text-[#2A1B14]/70">
              {item.description}
            </p>
          )}

          <div className="mt-5 grid grid-cols-2 gap-2">
            {sizes.map((size) => (
              <div
                key={size.label}
                className="rounded-2xl border border-[#2A1B14]/12 bg-white/60 px-4 py-3"
              >
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#2A1B14]/50">
                  {size.label} · <span className="font-khmer normal-case">{size.labelKh}</span>
                </div>
                <div className="mt-0.5 text-lg font-bold tabular-nums">
                  {formatPrice(size.price, currency)}
                </div>
                <div className="text-xs text-[#2A1B14]/50 tabular-nums">
                  {formatPrice(size.price, currency === "khr" ? "usd" : "khr")}
                </div>
              </div>
            ))}
          </div>

          <p className="mt-5 rounded-2xl bg-[#2A1B14] px-4 py-3 text-center text-xs font-semibold text-[#F4EDE3]/85 font-khmer">
            សូមកុម្ម៉ង់ភេសជ្ជៈនេះនៅបញ្ជរ
          </p>
        </div>
      </div>
    </div>
  );
}
