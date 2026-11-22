"use client";

import { useEffect, useState } from "react";

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
  const [card, setCard] = useState<LoyaltyCardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Pull Telegram initData from the Mini App context
    const tg = (window as Window & { Telegram?: { WebApp?: { initData?: string } } }).Telegram?.WebApp;
    const initData = tg?.initData;
    if (!initData) {
      setTimeout(() => setError("បើកតែក្នុង Telegram ប៉ុណ្ណោះ"), 0);
      return;
    }

    fetch("/api/loyalty/card", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initData }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error as string);
        else setCard(data as LoyaltyCardData);
      })
      .catch(() => setError("មានបញ្ហា សូមសាកល្បងម្ដងទៀត"));
  }, []);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6 text-center">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (!card) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-400 animate-pulse">កំពុងផ្ទុក…</p>
      </div>
    );
  }

  const pending = card.freeDrinksClaimed - (card.freeDrinksRedeemed ?? 0);
  const stamps  = card.stamps;

  return (
    <div className="min-h-screen bg-[#fdf6ee] flex flex-col items-center justify-center p-6 gap-6">
      <h1 className="text-2xl font-bold text-[#5c3d1e]">☕ ស្តាម្ព SIGNAL</h1>

      {/* Stamp grid */}
      <div className="bg-white rounded-2xl shadow p-5 w-full max-w-xs">
        <p className="text-center text-sm text-gray-500 mb-3">
          {stamps}/{STAMPS_FOR_FREE} ស្តាម្ព
        </p>
        <div className="grid grid-cols-5 gap-2 justify-items-center">
          {Array.from({ length: STAMPS_FOR_FREE }).map((_, i) => (
            <span key={i} className="text-2xl">{i < stamps ? "☕" : "⬜"}</span>
          ))}
        </div>
        <p className="text-center text-xs text-gray-400 mt-3">
          នៅខ្វះ <b>{STAMPS_FOR_FREE - stamps}</b> ស្តាម្ព
          {pending > 0 && (
            <span className="text-green-600 font-bold"> · 🎁 ឥតគិតថ្លៃ {pending} គ្រឿង!</span>
          )}
        </p>
      </div>

      {/* QR code for barista to scan */}
      <div className="bg-white rounded-2xl shadow p-5 flex flex-col items-center gap-3 w-full max-w-xs">
        <p className="text-sm text-gray-600 font-medium">បង្ហាញ QR នេះទៅបារីស្តា</p>
        <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(card.stampUrl)}`}
          alt="Stamp QR"
          width={200}
          height={200}
          className="rounded-lg"
        />
        <p className="text-xs text-gray-400 text-center">
          ស្កែន → បារីស្តាផ្ដល់ស្តាម្ព
        </p>
      </div>

      {/* Stats */}
      <p className="text-xs text-gray-400 text-center">
        សរុបស្តាម្ព: <b>{card.totalEarned}</b> · ឥតគិតថ្លៃ: <b>{card.freeDrinksClaimed}</b>
      </p>
    </div>
  );
}
