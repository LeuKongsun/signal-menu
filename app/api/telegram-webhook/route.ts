import { NextRequest, NextResponse } from "next/server";
import { copiesForUpdate, editOrderMessage } from "@/lib/telegram";

interface InlineButton {
  text: string;
  callback_data: string;
}

interface InlineKeyboardMarkup {
  inline_keyboard: InlineButton[][];
}

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

    const update = await req.json();

    // Check if this is a button click (callback_query)
    const callbackQuery = update.callback_query;
    if (!callbackQuery) {
      return NextResponse.json({ ok: true, ignored: "Not a callback query" });
    }

    const callbackId = callbackQuery.id;
    const data = callbackQuery.data as string; // e.g. "confirm:SIG-1048"
    const staffName =
      callbackQuery.from.first_name ||
      callbackQuery.from.username ||
      "Barista";

    const message = callbackQuery.message;
    if (!message) {
      return NextResponse.json({ ok: true });
    }

    const chatId = message.chat.id;
    const messageId = message.message_id;
    const isPhoto = Boolean(message.photo && message.photo.length > 0);
    const originalText = isPhoto ? (message.caption || "") : (message.text || "");

    const [action, orderNumber] = data.split(":");

    let newStatusText = "";
    let alertPopup = "";
    let newKeyboard: InlineKeyboardMarkup = { inline_keyboard: [] };

    if (action === "confirm") {
      newStatusText = `🟡 <b>Status: PREPARING DRINKS (Confirmed by ${staffName})</b>`;
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
      newStatusText = `🟢 <b>Status: COMPLETED / PICKED UP (by ${staffName})</b>`;
      alertPopup = `Order #${orderNumber} marked as Ready & Picked Up! 🎉`;
      newKeyboard = { inline_keyboard: [] }; // Remove buttons once picked up
    } else if (action === "cancel") {
      newStatusText = `❌ <b>Status: CANCELLED (by ${staffName})</b>`;
      alertPopup = `Order #${orderNumber} was cancelled.`;
      newKeyboard = { inline_keyboard: [] }; // Remove buttons once cancelled
    }

    // 1. Answer Telegram's callback query (shows notification banner/alert to staff)
    await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        callback_query_id: callbackId,
        text: alertPopup,
        show_alert: false,
      }),
    });

    // 2. Update the status in the original caption / text
    let updatedText = originalText;
    const statusRegex = /(🔴|🟡|🟢|❌) <b>Status:.*?<\/b>/i;

    if (statusRegex.test(updatedText)) {
      updatedText = updatedText.replace(statusRegex, newStatusText);
    } else {
      // If no status line found, prepend it
      updatedText = `${newStatusText}\n\n${updatedText}`;
    }

    // 3. Edit every copy of this order (one message per admin or seller chat)
    const targets = copiesForUpdate(orderNumber, {
      chatId,
      messageId,
      isPhoto,
    });

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
