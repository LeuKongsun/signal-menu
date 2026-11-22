"use client";

import { useTelegramWebApp } from "@/lib/useTelegramWebApp";
import { LoyaltyCardView } from "@/components/LoyaltyCardView";
import { useRouter } from "next/navigation";

export default function LoyaltyCardPage() {
  const tg = useTelegramWebApp();
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      <LoyaltyCardView telegram={tg} onGoToMenu={() => router.push("/?tab=menu")} />
    </div>
  );
}
