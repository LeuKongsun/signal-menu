import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { validLoyaltyBridgeSecret } from "@/lib/loyaltyBridge";
import { ensureLoyaltyCard, getLoyaltyCard, saveLoyaltyCard } from "@/lib/loyaltyStore";
import { notifyCustomerCardUpdate } from "@/lib/loyaltyNotify";

const posCardSchema = z.object({
  telegramId: z.string().regex(/^\d{1,32}$/),
  telegramName: z.string().trim().min(1).max(120),
  qrToken: z.string().min(20).max(80),
  stamps: z.number().int().min(0).max(9),
  totalEarned: z.number().int().min(0),
  freeDrinksClaimed: z.number().int().min(0),
  freeDrinksRedeemed: z.number().int().min(0),
});

export async function POST(request: NextRequest) {
  if (process.env.NEXT_PUBLIC_LOYALTY_ENABLED !== "true") {
    return NextResponse.json({ error: "Loyalty module is not enabled" }, { status: 404 });
  }
  if (!validLoyaltyBridgeSecret(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const parsed = posCardSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid loyalty card" }, { status: 400 });
  }

  const telegramId = Number(parsed.data.telegramId);
  const current = await getLoyaltyCard(telegramId);
  const card = await ensureLoyaltyCard(telegramId, parsed.data.telegramName);
  card.telegramName = parsed.data.telegramName;
  card.qrToken = parsed.data.qrToken;
  card.stamps = parsed.data.stamps;
  card.totalEarned = parsed.data.totalEarned;
  card.freeDrinksClaimed = parsed.data.freeDrinksClaimed;
  card.freeDrinksRedeemed = parsed.data.freeDrinksRedeemed;
  await saveLoyaltyCard(card);

  if (current?.stamps !== card.stamps || current?.totalEarned !== card.totalEarned) {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (botToken) await notifyCustomerCardUpdate(botToken, card);
  }
  return NextResponse.json({ ok: true });
}
