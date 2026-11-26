import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { validOnlineOrderSecret } from "@/lib/onlineOrderBridge";
import {
  canAdvanceOrderStatus,
  getOrder,
  isOrderClosed,
  saveOrder,
} from "@/lib/orderStore";
import {
  abaPaymentKeyboard,
  abaPaymentText,
  customerReceiptKeyboard,
  customerReceiptText,
  customerStatusText,
  staffKeyboard,
  staffOrderText,
  staffStatusLine,
} from "@/lib/orderMessages";
import { editOrderMessage, sendTelegramText } from "@/lib/telegram";

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

  const canAdvance = canAdvanceOrderStatus(record.status, parsed.data.status);
  const statusChanged = canAdvance && record.status !== parsed.data.status;
  if (canAdvance) record.status = parsed.data.status;
  record.staffStatusLine = staffStatusLine(record.status);
  record.updatedAt = new Date().toISOString();
  await saveOrder(record);

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (botToken) {
    const ownerText = staffOrderText(record, record.staffStatusLine);
    const ownerKeyboard = staffKeyboard(record.orderNumber, record.status);
    await Promise.all((record.staffCopies ?? []).map(async (copy) => {
      const result = await editOrderMessage(botToken, copy, ownerText, ownerKeyboard);
      if (!result.ok && result.description !== "Bad Request: message is not modified") {
        console.error(`Unable to update owner Telegram order ${record.orderNumber} in chat ${copy.chatId}:`, result.description);
      }
    }));

    if (record.customerTelegram && record.customerReceipt) {
      const result = await editOrderMessage(
        botToken,
        { chatId: record.customerTelegram.id, ...record.customerReceipt },
        customerReceiptText(record, { withItems: !record.customerReceipt.isPhoto }),
        customerReceiptKeyboard(record, request.nextUrl.origin),
      );
      if (!result.ok && result.description !== "Bad Request: message is not modified") {
        console.error(`Unable to update customer receipt for ${record.orderNumber}:`, result.description);
      }
    }

    if (record.customerTelegram && record.paymentMessage && isOrderClosed(record.status)) {
      const result = await editOrderMessage(
        botToken,
        { chatId: record.customerTelegram.id, ...record.paymentMessage },
        abaPaymentText(record),
        abaPaymentKeyboard(record, request.nextUrl.origin),
      );
      if (!result.ok && result.description !== "Bad Request: message is not modified") {
        console.error(`Unable to close ABA message for ${record.orderNumber}:`, result.description);
      }
    }

    if (statusChanged && record.customerTelegram) {
      const text = customerStatusText(record);
      if (text) await sendTelegramText(botToken, record.customerTelegram.id, text);
    }
  }

  return NextResponse.json({ ok: true, status: record.status, ignored: !canAdvance });
}
