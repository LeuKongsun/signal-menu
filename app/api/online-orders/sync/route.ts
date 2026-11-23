import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { validOnlineOrderSecret } from "@/lib/onlineOrderBridge";
import { getOrder, saveOrder } from "@/lib/orderStore";
import { sendTelegramText } from "@/lib/telegram";

const statusSchema = z.object({
  orderNumber: z.string().regex(/^SIG-\d{4}$/),
  status: z.enum(["pending", "confirmed", "preparing", "ready", "completed", "cancelled"]),
});

export async function POST(request: NextRequest) {
  if (!validOnlineOrderSecret(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const parsed = statusSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid online order status" }, { status: 400 });
  }
  const record = await getOrder(parsed.data.orderNumber);
  if (!record) return NextResponse.json({ error: "Online order not found" }, { status: 404 });

  record.status =
    parsed.data.status === "completed"
      ? "ready"
      : parsed.data.status;
  record.updatedAt = new Date().toISOString();
  await saveOrder(record);

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (botToken && record.customerTelegram) {
    const label: Record<string, string> = {
      confirmed: "បានបញ្ជាក់ការកុម្ម៉ង់",
      preparing: "កំពុងរៀបចំភេសជ្ជៈ",
      ready: "ភេសជ្ជៈរួចរាល់ សូមមកយក",
      completed: "ការកុម្ម៉ង់បានបញ្ចប់",
      cancelled: "ការកុម្ម៉ង់ត្រូវបានបោះបង់",
    };
    await sendTelegramText(
      botToken,
      record.customerTelegram.id,
      `☕ <b>SIGNAL</b>\nការកុម្ម៉ង់ ${record.orderNumber}: ${label[parsed.data.status] ?? parsed.data.status}`,
    );
  }
  return NextResponse.json({ ok: true });
}
