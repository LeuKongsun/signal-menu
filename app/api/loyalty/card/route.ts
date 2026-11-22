/**
 * POST /api/loyalty/card
 *
 * Called by the /loyalty/card page (Mini App) to fetch the customer's loyalty card.
 * Body: { initData: string }
 *
 * Returns the card data (creates it if new).
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyTelegramInitData } from "@/lib/telegram";
import { ensureLoyaltyCard } from "@/lib/loyaltyStore";

export async function POST(req: NextRequest) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    return NextResponse.json({ error: "Bot not configured" }, { status: 500 });
  }

  const { initData } = (await req.json()) as { initData?: string };
  if (!initData) {
    return NextResponse.json({ error: "Missing initData" }, { status: 400 });
  }

  const tgUser = verifyTelegramInitData(initData, botToken);
  if (!tgUser) {
    return NextResponse.json({ error: "Invalid Telegram session" }, { status: 401 });
  }

  const name = [tgUser.first_name, tgUser.last_name].filter(Boolean).join(" ");
  const card = await ensureLoyaltyCard(tgUser.id, name);

  const origin = req.nextUrl.origin;
  const stampUrl = `${origin}/api/loyalty/stamp?token=${card.qrToken}`;

  return NextResponse.json({
    telegramName: card.telegramName,
    stamps: card.stamps,
    totalEarned: card.totalEarned,
    freeDrinksClaimed: card.freeDrinksClaimed,
    freeDrinksRedeemed: card.freeDrinksRedeemed ?? 0,
    qrToken: card.qrToken,
    stampUrl,
  });
}
