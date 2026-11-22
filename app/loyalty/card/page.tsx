"use client";

import { useEffect, useState } from "react";
import { useTelegramWebApp } from "@/lib/useTelegramWebApp";

interface LoyaltyCardData {
  telegramName: string;
  stamps: number;
  totalEarned: number;
  freeDrinksClaimed: number;
  freeDrinksRedeemed: number;
  qrToken: string;
  stampUrl: string;
}

const STAMPS_FOR_FREE = 10;

export default function LoyaltyCardPage() {
  const tg = useTelegramWebApp();
  const [card, setCard] = useState<LoyaltyCardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isReadyTimeout, setIsReadyTimeout] = useState(false);

  // If opened outside Telegram, give the script 2.5 seconds to load before showing the warning
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsReadyTimeout(true);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  // Fetch loyalty card as soon as tg.initData is available
  useEffect(() => {
    if (!tg?.initData) return;

    fetch("/api/loyalty/card", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initData: tg.initData }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error as string);
        else setCard(data as LoyaltyCardData);
      })
      .catch(() => setError("មានបញ្ហា សូមសាកល្បងម្ដងទៀត"));
  }, [tg?.initData]);

  // Set up Telegram bottom button to close the Mini App
  useEffect(() => {
    if (!tg) return;
    const btn = tg.MainButton;
    const handleClose = () => tg.close();
    btn.setParams({
      text: "ត្រឡប់ទៅឆាត",
      color: "#8E583C",
      text_color: "#FFFFFF",
      is_active: true,
      is_visible: true,
    });
    btn.onClick(handleClose);
    return () => {
      btn.offClick(handleClose);
      btn.hide();
    };
  }, [tg]);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6 text-center bg-[#FAF8F5]">
        <div className="bg-white rounded-2xl shadow p-6 max-w-xs">
          <p className="text-3xl mb-2">⚠️</p>
          <p className="text-red-500 font-medium">{error}</p>
        </div>
      </div>
    );
  }

  // Not in Telegram or initData missing after timeout
  if (!tg?.initData && isReadyTimeout) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6 text-center bg-[#FAF8F5]">
        <div className="bg-white rounded-2xl shadow p-6 max-w-xs">
          <p className="text-4xl mb-3">☕</p>
          <h2 className="text-lg font-bold text-stone-800 mb-2">ស្តាម្ពការ្ដ SIGNAL</h2>
          <p className="text-sm text-stone-600 mb-4">
            សូមបើកតាមរយៈ Telegram Bot ដើម្បីមើលស្តាម្ពរបស់អ្នក
          </p>
        </div>
      </div>
    );
  }

  if (!card) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#FAF8F5] gap-3">
        <div className="w-8 h-8 border-3 border-[#8E583C] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-stone-500">កំពុងផ្ទុកព័ត៌មានស្តាម្ព…</p>
      </div>
    );
  }

  const pending = card.freeDrinksClaimed - (card.freeDrinksRedeemed ?? 0);
  const stamps = card.stamps;

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex flex-col items-center justify-center p-6 gap-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-[#5c3d1e]">☕ ស្តាម្ព SIGNAL</h1>
        <p className="text-xs text-stone-500 mt-1">{card.telegramName}</p>
      </div>

      {/* Stamp grid */}
      <div className="bg-white rounded-2xl shadow-sm border border-stone-200/60 p-5 w-full max-w-xs">
        <div className="flex justify-between items-center text-sm font-semibold text-stone-700 mb-3">
          <span>ចំនួនស្តាម្ព</span>
          <span className="text-[#8E583C]">{stamps}/{STAMPS_FOR_FREE}</span>
        </div>
        <div className="grid grid-cols-5 gap-2.5 justify-items-center py-2">
          {Array.from({ length: STAMPS_FOR_FREE }).map((_, i) => (
            <div
              key={i}
              className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl transition-all ${
                i < stamps
                  ? "bg-[#8E583C]/10 border border-[#8E583C]/30 shadow-xs"
                  : "bg-stone-100 border border-dashed border-stone-300 text-stone-300"
              }`}
            >
              {i < stamps ? "☕" : "○"}
            </div>
          ))}
        </div>
        <p className="text-center text-xs text-stone-500 mt-3 pt-2 border-t border-stone-100">
          {pending > 0 ? (
            <span className="text-emerald-600 font-bold">🎉 អ្នកមានភេសជ្ជៈឥតគិតថ្លៃ {pending} គ្រឿង!</span>
          ) : stamps === 0 ? (
            <span>ទទួល 1 ស្តាម្ព រាល់ការកុម្ម៉ង់</span>
          ) : (
            <span>នៅខ្វះ <b>{STAMPS_FOR_FREE - stamps}</b> ស្តាម្ពទៀត ទទួលបាន ១ គ្រឿងឥតគិតថ្លៃ</span>
          )}
        </p>
      </div>

      {/* QR code for barista to scan */}
      <div className="bg-white rounded-2xl shadow-sm border border-stone-200/60 p-5 flex flex-col items-center gap-3 w-full max-w-xs">
        <p className="text-xs font-semibold text-stone-600 uppercase tracking-wider">
          បង្ហាញ QR នេះទៅកាន់បារីស្តា
        </p>
        <img
          src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=8&data=${encodeURIComponent(
            card.stampUrl
          )}`}
          alt="Stamp QR"
          width={220}
          height={220}
          className="rounded-xl border border-stone-100"
        />
        <p className="text-xs text-stone-400 text-center">
          បារីស្តាស្កេន QR នេះដើម្បីផ្ដល់ស្តាម្ព
        </p>
      </div>

      {/* Stats */}
      <div className="flex gap-4 text-xs text-stone-500">
        <span>សរុបស្តាម្ពបានសន្សំ៖ <b>{card.totalEarned}</b></span>
        <span>•</span>
        <span>ឥតគិតថ្លៃ៖ <b>{card.freeDrinksClaimed}</b></span>
      </div>
    </div>
  );
}
