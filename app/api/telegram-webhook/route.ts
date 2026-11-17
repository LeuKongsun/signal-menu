import { NextRequest, NextResponse } from "next/server";
import {
  answerCallbackQuery,
  editOrderMessage,
  escapeHtml,
  mergeCopies,
  sendOrderMessage,
  sendTelegramFileById,
  sendTelegramText,
} from "@/lib/telegram";
import {
  getAwaitingPaymentOrder,
  getOrder,
  saveOrder,
  type OrderStatus,
} from "@/lib/orderStore";
import {
  customerReceiptKeyboard,
  customerReceiptText,
  customerStatusText,
  PENDING_STATUS_LINE,
  staffKeyboard,
  staffOrderText,
} from "@/lib/orderMessages";
import { renderStatusCard, type StatusCard } from "@/lib/statusCard";

const ACTION_STATUS: Record<string, OrderStatus> = {
  confirm: "preparing",
  pickup: "ready",
  cancel: "cancelled",
};

type IncomingMessage = {
  message_id: number;
  chat: { id: number; type: string };
  from?: { id: number };
  text?: string;
  photo?: { file_id: string }[];
  document?: { file_id: string; mime_type?: string };
};

type IncomingImage = { kind: "photo" | "document"; fileId: string };

function incomingImage(message: IncomingMessage): IncomingImage | null {
  if (message.photo?.length) {
    return { kind: "photo", fileId: message.photo[message.photo.length - 1].file_id };
  }
  if (message.document?.mime_type?.startsWith("image/")) {
    return { kind: "document", fileId: message.document.file_id };
  }
  return null;
}

/** Forwards a customer's ABA screenshot to staff and marks their order as having proof. */
async function handlePaymentScreenshot(
  botToken: string,
  message: IncomingMessage,
  image: IncomingImage,
  origin: string,
  appUrl: string
) {
  const customerId = message.from?.id ?? message.chat.id;
  const order = await getAwaitingPaymentOrder(customerId);

  if (!order) {
    await sendTelegramText(
      botToken,
      message.chat.id,
      [
        `I couldn't find an open ABA order waiting for a payment screenshot.`,
        `រកមិនឃើញការកម្ម៉ង់ដែលកំពុងរង់ចាំការបង់ប្រាក់ទេ`,
      ].join("\n"),
      { inline_keyboard: [[{ text: "☕ Order drinks", web_app: { url: appUrl } }]] },
      message.message_id
    );
    return;
  }

  const { orderNumber } = order;
  const copies = order.staffCopies ?? [];
  const caption = `📸 <b>Payment screenshot for #${orderNumber}</b>\nFrom ${escapeHtml(order.customerName)} · ${order.totalRiel.toLocaleString("en-US")}៛`;

  const forwarded = await Promise.all(
    copies.map((copy) =>
      sendTelegramFileById(botToken, copy.chatId, image.kind, image.fileId, caption, copy.messageId)
    )
  );
  if (!forwarded.some((r) => r.ok)) {
    console.error(`Could not forward screenshot for ${orderNumber}:`, forwarded[0]?.description);
    await sendTelegramText(
      botToken,
      message.chat.id,
      `Sorry, we couldn't pass your screenshot to the barista. Please show it at the counter.`,
      undefined,
      message.message_id
    );
    return;
  }

  if (order.paymentProof === "awaiting") {
    order.paymentProof = "received";
    order.updatedAt = new Date().toISOString();
    await saveOrder(order);

    const staffText = staffOrderText(order, order.staffStatusLine ?? PENDING_STATUS_LINE);
    const staffButtons = staffKeyboard(orderNumber, order.status);
    await Promise.all(copies.map((copy) => editOrderMessage(botToken, copy, staffText, staffButtons)));

    if (order.customerReceipt) {
      await editOrderMessage(
        botToken,
        { chatId: message.chat.id, messageId: order.customerReceipt.messageId, isPhoto: order.customerReceipt.isPhoto },
        customerReceiptText(order, { withItems: !order.customerReceipt.isPhoto }),
        customerReceiptKeyboard(order, origin)
      );
    }
  }

  await sendTelegramText(
    botToken,
    message.chat.id,
    [
      `✅ <b>Got it!</b> Your payment screenshot was sent to the barista for order #${orderNumber}.`,
      `បានទទួលរូបថតបង្កាន់ដៃហើយ សូមអរគុណ`,
    ].join("\n"),
    undefined,
    message.message_id
  );
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

    const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (
      webhookSecret &&
      req.headers.get("x-telegram-bot-api-secret-token") !== webhookSecret
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const update = await req.json();

    // Private chat: /start welcome, or an ABA payment screenshot for an open order
    const incoming = update.message;
    if (incoming?.chat?.type === "private") {
      const appUrl = process.env.TELEGRAM_MINI_APP_URL || `${req.nextUrl.origin}/`;
      const image = incomingImage(incoming);
      if (image) {
        await handlePaymentScreenshot(botToken, incoming, image, req.nextUrl.origin, appUrl);
      } else if (typeof incoming.text === "string" && incoming.text.startsWith("/start")) {
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
    const newKeyboard = staffKeyboard(orderNumber, nextStatus);

    if (action === "confirm") {
      newStatusText = `🟡 <b>Status: PREPARING DRINKS (Confirmed by ${escapeHtml(staffName)})</b>`;
      alertPopup = `Order #${orderNumber} confirmed by ${staffName}! Preparing drinks...`;
    } else if (action === "pickup") {
      newStatusText = `🟢 <b>Status: COMPLETED / PICKED UP (by ${escapeHtml(staffName)})</b>`;
      alertPopup = `Order #${orderNumber} marked as Ready & Picked Up! 🎉`;
    } else {
      newStatusText = `❌ <b>Status: CANCELLED (by ${escapeHtml(staffName)})</b>`;
      alertPopup = `Order #${orderNumber} was cancelled.`;
    }

    if (record) {
      record.status = nextStatus;
      record.staffStatusLine = newStatusText;
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

    // 4. Update the customer's receipt and alert them, if they ordered through the Mini App
    if (record?.customerTelegram) {
      const customerChatId = record.customerTelegram.id;
      const receipt = record.customerReceipt;
      const receiptId = receipt?.messageId;

      if (receipt) {
        const edited = await editOrderMessage(
          botToken,
          { chatId: customerChatId, messageId: receipt.messageId, isPhoto: receipt.isPhoto },
          customerReceiptText(record, { withItems: !receipt.isPhoto }),
          customerReceiptKeyboard(record, req.nextUrl.origin)
        );
        if (!edited.ok) {
          console.warn(`Could not update receipt for ${orderNumber}:`, edited.description);
        }
      }

      const text = customerStatusText(record);
      if (text) {
        let card: StatusCard | null = null;
        if (record.status === "preparing" || record.status === "ready") {
          try {
            card = await renderStatusCard(record, record.status);
          } catch (err) {
            console.error(`Could not render status card for ${orderNumber}:`, err);
          }
        }

        const sent = await sendOrderMessage({
          botToken,
          chatId: String(customerChatId),
          text,
          photo: card
            ? {
                bytes: card.bytes,
                name: `${orderNumber}-${record.status}.${card.extension}`,
                type: card.type,
              }
            : null,
          replyToMessageId: receiptId,
        });
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
