import { NextRequest, NextResponse } from "next/server";
import { verifyTelegramInitData } from "@/lib/telegram";
import { ensureLoyaltyCard } from "@/lib/loyaltyStore";

export async function POST(req: NextRequest) {
  if (process.env.NEXT_PUBLIC_LOYALTY_ENABLED !== "true") {
    return NextResponse.json({ error: "Loyalty module is not enabled" }, { status: 404 });
  }

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
  const stampUrl = `${req.nextUrl.origin}/api/loyalty/stamp?token=${card.qrToken}`;

  return NextResponse.json({ stampUrl });
}
