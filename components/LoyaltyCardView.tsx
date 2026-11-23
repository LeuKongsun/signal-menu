"use client";

import React, { useEffect, useState } from "react";
import type { TelegramWebApp } from "@/lib/useTelegramWebApp";
import { Coffee, Gift, QrCode } from "lucide-react";

interface LoyaltyCardData {
  telegramName: string;
  stamps: number;
  totalEarned: number;
  freeDrinksClaimed: number;
  freeDrinksRedeemed: number;
  qrToken: string;
  stampUrl: string;
  loyaltySync?: { status: "synced" | "failed"; error?: string };
}

const STAMPS_FOR_FREE = 10;

interface LoyaltyCardViewProps {
  telegram: TelegramWebApp | null;
  onGoToMenu?: () => void;
}

export function LoyaltyCardView({ telegram, onGoToMenu }: LoyaltyCardViewProps) {
  const [card, setCard] = useState<LoyaltyCardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isReadyTimeout, setIsReadyTimeout] = useState(false);

  // If opened outside Telegram, give the script 2.5 seconds to load before showing fallback
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsReadyTimeout(true);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  // Fetch loyalty card as soon as tg.initData is available
  useEffect(() => {
    if (!telegram?.initData) return;

    fetch("/api/loyalty/card", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initData: telegram.initData }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error as string);
        else setCard(data as LoyaltyCardData);
      })
      .catch(() => setError("មានបញ្ហា សូមសាកល្បងម្ដងទៀត"));
  }, [telegram?.initData]);

  if (error) {
    return (
      <div className="flex items-center justify-center py-16 px-4 text-center">
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 max-w-xs w-full">
          <p className="text-3xl mb-2">⚠️</p>
          <p className="text-red-500 font-medium text-sm">{error}</p>
        </div>
      </div>
    );
  }

  // Not in Telegram or initData missing after timeout
  if (!telegram?.initData && isReadyTimeout) {
    return (
      <div className="flex items-center justify-center py-16 px-4 text-center">
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 max-w-xs w-full font-khmer">
          <div className="w-14 h-14 rounded-2xl bg-[#8E583C]/10 text-[#8E583C] flex items-center justify-center mx-auto mb-3">
            <Coffee className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold text-stone-800 mb-2">កាតសន្សំពិន្ទុ SIGNAL</h2>
          <p className="text-sm text-stone-600 mb-5 leading-relaxed">
            មុខងារសន្សំពិន្ទុដំណើរការតែនៅក្នុង Telegram Bot ប៉ុណ្ណោះ ដើម្បីសន្សំពិន្ទុ និងទទួលភេសជ្ជៈឥតគិតថ្លៃ។
          </p>
          {onGoToMenu && (
            <button
              onClick={onGoToMenu}
              className="w-full py-2.5 px-4 rounded-xl bg-[#8E583C] text-white font-bold text-xs hover:bg-[#73432B] transition-colors"
            >
              មើលម៉ឺនុយភេសជ្ជៈ
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!card) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <div className="w-8 h-8 border-3 border-[#8E583C] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-stone-500 font-khmer">កំពុងផ្ទុកព័ត៌មានកាត…</p>
      </div>
    );
  }

  const pending = card.freeDrinksClaimed - (card.freeDrinksRedeemed ?? 0);
  const stamps = card.stamps;

  return (
    <div className="max-w-md mx-auto px-4 py-6 flex flex-col items-center gap-5 font-khmer">
      {/* Title & Customer Name */}
      <div className="text-center">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#8E583C]/10 text-[#8E583C] text-xs font-bold mb-1">
          <Coffee className="w-3.5 h-3.5" />
          <span>SIGNAL LOYALTY</span>
        </div>
        <h1 className="text-2xl font-black text-[#2A1B14]">កាតសន្សំពិន្ទុ</h1>
        <p className="text-xs text-stone-500 mt-0.5">{card.telegramName}</p>
      </div>

      {card.loyaltySync?.status === "failed" ? (
        <div className="w-full rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-xs font-bold text-amber-800 font-khmer">
          កាតនេះមិនទាន់ភ្ជាប់ទៅ POS។ សូមពិនិត្យការកំណត់ Bridge រួចបើកកាតម្ដងទៀត។
        </div>
      ) : null}

      {/* Stamp Progress Card */}
      <div className="bg-white rounded-3xl shadow-sm border border-stone-200/70 p-5 w-full">
        <div className="flex justify-between items-center mb-4">
          <span className="text-sm font-bold text-stone-800">ចំនួនត្រាសន្សំ</span>
          <span className="text-sm font-extrabold px-2.5 py-0.5 rounded-full bg-[#8E583C] text-white">
            {stamps}/{STAMPS_FOR_FREE}
          </span>
        </div>

        {/* 10 Stamp Grid */}
        <div className="grid grid-cols-5 gap-2.5 justify-items-center py-2">
          {Array.from({ length: STAMPS_FOR_FREE }).map((_, i) => (
            <div
              key={i}
              className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl transition-all ${
                i < stamps
                  ? "bg-[#8E583C]/10 border-2 border-[#8E583C] text-[#8E583C] shadow-xs"
                  : "bg-stone-50 border-2 border-dashed border-stone-200 text-stone-300"
              }`}
            >
              {i < stamps ? "☕" : "○"}
            </div>
          ))}
        </div>

        {/* Status Hint */}
        <div className="mt-4 pt-3 border-t border-stone-100 text-center">
          {pending > 0 ? (
            <div className="flex items-center justify-center gap-1.5 text-emerald-600 font-bold text-xs">
              <Gift className="w-4 h-4" />
              <span>អបអរសាទរ! អ្នកមានភេសជ្ជៈឥតគិតថ្លៃ {pending} គ្រឿង!</span>
            </div>
          ) : stamps === 0 ? (
            <p className="text-xs text-stone-500">
              ទទួល 1 ត្រា រាល់ការកុម្ម៉ង់ភេសជ្ជៈ
            </p>
          ) : (
            <p className="text-xs text-stone-600">
              នៅខ្វះ <b className="text-[#8E583C]">{STAMPS_FOR_FREE - stamps}</b> ត្រាទៀត ទទួលបាន ១ គ្រឿងឥតគិតថ្លៃ
            </p>
          )}
        </div>
      </div>

      {/* QR Code Card for Barista to Scan */}
      <div className="bg-white rounded-3xl shadow-sm border border-stone-200/70 p-5 w-full flex flex-col items-center text-center">
        <div className="flex items-center gap-1.5 text-xs font-bold text-stone-600 mb-3">
          <QrCode className="w-4 h-4 text-[#8E583C]" />
          <span>បង្ហាញ QR នេះទៅកាន់បារីស្តា</span>
        </div>

        <div className="p-3 bg-stone-50 rounded-2xl border border-stone-100">
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=8&data=${encodeURIComponent(
              card.stampUrl
            )}`}
            alt="Barista Stamp QR"
            width={200}
            height={200}
            className="rounded-xl"
          />
        </div>

        <p className="text-[11px] text-stone-400 mt-3">
          ពេលទិញនៅបញ្ជរ បង្ហាញ QR នេះដើម្បីឱ្យបារីស្តាស្កេនបោះត្រា
        </p>
      </div>

      {/* Stats summary */}
      <div className="flex items-center justify-center gap-4 text-xs text-stone-500 pt-1">
        <span>សរុបត្រាធ្លាប់សន្សំ៖ <b>{card.totalEarned}</b></span>
        <span>•</span>
        <span>ឥតគិតថ្លៃ៖ <b>{card.freeDrinksClaimed}</b></span>
      </div>

      {/* Order Drink Button */}
      {onGoToMenu && (
        <button
          onClick={onGoToMenu}
          className="w-full max-w-xs py-3 px-4 rounded-2xl bg-[#8E583C] text-white font-bold text-sm hover:bg-[#73432B] transition-all shadow-md shadow-[#8E583C]/20 flex items-center justify-center gap-2 mt-2"
        >
          <Coffee className="w-4 h-4" />
          <span>ទៅកាន់ម៉ឺនុយភេសជ្ជៈ</span>
        </button>
      )}
    </div>
  );
}
