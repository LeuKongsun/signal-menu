import { NextRequest, NextResponse } from "next/server";
import {
  answerCallbackQuery,
  editOrderMessage,
  escapeHtml,
  mergeCopies,
  sendTelegramText,
  type InlineKeyboard,
} from "@/lib/telegram";
import { getOrder, saveOrder, type OrderStatus } from "@/lib/orderStore";
import { customerStatusText, staffOrderText } from "@/lib/orderMessages";

const ACTION_STATUS: Record<string, OrderStatus> = {
  confirm: "preparing",
  pickup: "ready",
  cancel: "cancelled",
};

export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "Telegram webhook endpoint is running.",
  });
}

export async function POST(req: NextRequest) {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      return NextResponse.json({ error: "TELEGRAM_BOT_TOKEN not configured" }, { status: 500 });
    }

    const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (
      webhookSecret &&
      req.headers.get("x-telegram-bot-api-secret-token") !== webhookSecret
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const update = await req.json();

    // /start in a private chat → welcome message with a button that opens the Mini App
    const incoming = update.message;
    if (incoming?.chat?.type === "private" && typeof incoming.text === "string") {
      if (incoming.text.startsWith("/start")) {
        const appUrl = process.env.TELEGRAM_MINI_APP_URL || `${req.nextUrl.origin}/`;
        await sendTelegramText(
          botToken,
          incoming.chat.id,
          [
            `☕ <b>Welcome to SIGNAL Cafe!</b>`,
            `សូមស្វាគមន៍មកកាន់ SIGNAL Cafe`,
            ``,
            `Tap the button below to browse the menu and order. We'll message you here when your drinks are ready.`,
          ].join("\n"),
          { inline_keyboard: [[{ text: "☕ Order drinks", web_app: { url: appUrl } }]] }
        );
      }
      return NextResponse.json({ ok: true });
    }

    const callbackQuery = update.callback_query;
    if (!callbackQuery) {
      return NextResponse.json({ ok: true, ignored: "Unsupported update" });
    }

    const callbackId = callbackQuery.id as string;
    const data = callbackQuery.data as string; // e.g. "confirm:SIG-1048"
    const staffName =
      callbackQuery.from.first_name ||
      callbackQuery.from.username ||
      "Barista";

    const message = callbackQuery.message;
    if (!message) {
      return NextResponse.json({ ok: true });
    }

    const [action, orderNumber] = data.split(":");
    const nextStatus = ACTION_STATUS[action];
    if (!nextStatus || !orderNumber) {
      await answerCallbackQuery(botToken, callbackId, "Unknown action");
      return NextResponse.json({ ok: true });
    }

    const record = await getOrder(orderNumber);
    if (record && (record.status === "ready" || record.status === "cancelled")) {
      await answerCallbackQuery(
        botToken,
        callbackId,
        `Order #${orderNumber} is already ${record.status === "ready" ? "completed" : "cancelled"}.`
      );
      return NextResponse.json({ ok: true, ignored: "Order already closed" });
    }

    let newStatusText = "";
    let alertPopup = "";
    let newKeyboard: InlineKeyboard = { inline_keyboard: [] };

    if (action === "confirm") {
      newStatusText = `🟡 <b>Status: PREPARING DRINKS (Confirmed by ${escapeHtml(staffName)})</b>`;
      alertPopup = `Order #${orderNumber} confirmed by ${staffName}! Preparing drinks...`;
      newKeyboard = {
        inline_keyboard: [
          [
            {
              text: "🔔 Ready for Pickup / Picked Up",
              callback_data: `pickup:${orderNumber}`,
            },
          ],
          [
            {
              text: "❌ Cancel Order",
              callback_data: `cancel:${orderNumber}`,
            },
          ],
        ],
      };
    } else if (action === "pickup") {
      newStatusText = `🟢 <b>Status: COMPLETED / PICKED UP (by ${escapeHtml(staffName)})</b>`;
      alertPopup = `Order #${orderNumber} marked as Ready & Picked Up! 🎉`;
    } else {
      newStatusText = `❌ <b>Status: CANCELLED (by ${escapeHtml(staffName)})</b>`;
      alertPopup = `Order #${orderNumber} was cancelled.`;
    }

    if (record) {
      record.status = nextStatus;
      record.updatedAt = new Date().toISOString();
      await saveOrder(record);
    }

    // 1. Answer Telegram's callback query (shows notification banner/alert to staff)
    await answerCallbackQuery(botToken, callbackId, alertPopup);

    // 2. Rebuild the order message with the new status. Telegram hands back the
    //    original as plain text, so the saved order is the source of formatting.
    const isPhoto = Boolean(message.photo && message.photo.length > 0);
    let updatedText: string;
    if (record) {
      updatedText = staffOrderText(record, newStatusText);
    } else {
      const originalText = escapeHtml(isPhoto ? message.caption || "" : message.text || "");
      const statusLine = /^.*Status:.*$/m;
      updatedText = statusLine.test(originalText)
        ? originalText.replace(statusLine, newStatusText)
        : `${newStatusText}\n\n${originalText}`;
    }

    // 3. Edit every copy of this order (one message per admin or seller chat)
    const targets = mergeCopies(
      { chatId: message.chat.id, messageId: message.message_id, isPhoto },
      record?.staffCopies
    );

    await Promise.all(
      targets.map(async (copy) => {
        const result = await editOrderMessage(botToken, copy, updatedText, newKeyboard);
        if (!result.ok && result.description !== "Bad Request: message is not modified") {
          console.error(
            `Failed to update order ${orderNumber} in chat ${copy.chatId}:`,
            result.description
          );
        }
      })
    );

    // 4. Tell the customer, if they ordered through the Telegram Mini App
    if (record?.customerTelegram) {
      const text = customerStatusText(record);
      if (text) {
        const sent = await sendTelegramText(botToken, record.customerTelegram.id, text);
        if (!sent.ok) {
          console.warn(`Could not notify customer for ${orderNumber}:`, sent.description);
        }
      }
    }

    return NextResponse.json({ ok: true, status: action, orderNumber });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Webhook error";
    console.error("Error in telegram webhook:", err);
    return NextResponse.json(
      { error: errorMsg },
      { status: 500 }
    );
  }
}
