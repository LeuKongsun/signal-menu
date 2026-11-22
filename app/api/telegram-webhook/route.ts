import { NextRequest, NextResponse } from "next/server";
import {
  answerCallbackQuery,
  deleteTelegramMessage,
  editOrderMessage,
  escapeHtml,
  mergeCopies,
  parseTelegramChatIds,
  sendOrderMessage,
  sendTelegramText,
  type InlineKeyboard,
  type OrderCopy,
} from "@/lib/telegram";
import {
  getOrder,
  saveOrder,
  type OrderStatus,
} from "@/lib/orderStore";
import {
  abaPaymentKeyboard,
  abaPaymentText,
  customerReceiptKeyboard,
  customerReceiptText,
  customerStatusText,
  PENDING_STATUS_LINE,
  staffKeyboard,
  staffOrderText,
} from "@/lib/orderMessages";
import { renderStatusCard, type StatusCard } from "@/lib/statusCard";
import {
  addStamp,
  ensureLoyaltyCard,
  getCardByQrToken,
  getLoyaltyCard,
  pendingFreeCount,
  redeemFreeDrink,
  saveLoyaltyCard,
} from "@/lib/loyaltyStore";
import {
  loyaltyCardKeyboard,
  loyaltyCardText,
  staffRedeemKeyboard,
  staffRedeemText,
  staffStampDoneText,
} from "@/lib/loyaltyMessages";

const ACTION_STATUS: Record<string, OrderStatus> = {
  confirm: "preparing",
  pickup: "ready",
  cancel: "cancelled",
};

type CallbackQuery = {
  id: string;
  from: { id: number };
  message?: { message_id: number; chat: { id: number }; photo?: unknown[] };
};

/** Customer tapped "I've paid" under the ABA QR: record it and tell the staff. */
async function handleAbaPaid(
  botToken: string,
  callbackQuery: CallbackQuery,
  orderNumber: string,
  origin: string
) {
  const record = await getOrder(orderNumber);
  if (!record || record.customerTelegram?.id !== callbackQuery.from.id) {
    await answerCallbackQuery(botToken, callbackQuery.id, "រកមិនឃើញការកុម្ម៉ង់នេះទេ។");
    return;
  }
  if (record.status === "cancelled" || record.status === "ready") {
    await answerCallbackQuery(botToken, callbackQuery.id, `ការកុម្ម៉ង់ #${orderNumber} ត្រូវបានបិទរួចហើយ។`);
    return;
  }
  if (record.abaPayment === "reported") {
    await answerCallbackQuery(botToken, callbackQuery.id, "បានកត់ត្រាការបង់ប្រាក់រួចហើយ!");
    return;
  }

  record.abaPayment = "reported";
  record.updatedAt = new Date().toISOString();
  await saveOrder(record);
  await answerCallbackQuery(botToken, callbackQuery.id, "សូមអរគុណ! បារីស្តានឹងពិនិត្យការទូទាត់ជូន។");

  const customerChatId = record.customerTelegram.id;
  const message = callbackQuery.message;
  const paymentMessage = message
    ? { chatId: message.chat.id, messageId: message.message_id, isPhoto: Boolean(message.photo?.length) }
    : record.paymentMessage
      ? { chatId: customerChatId, ...record.paymentMessage }
      : null;

  const staffText = staffOrderText(record, record.staffStatusLine ?? PENDING_STATUS_LINE);
  const staffButtons = staffKeyboard(orderNumber, record.status);

  const [bumpedCopies] = await Promise.all([
    Promise.all(
      (record.staffCopies ?? []).map((copy) => bumpStaffCopy(botToken, copy, staffText, staffButtons))
    ),
    paymentMessage &&
      editOrderMessage(botToken, paymentMessage, abaPaymentText(record), abaPaymentKeyboard(record, origin)),
    record.customerReceipt &&
      editOrderMessage(
        botToken,
        { chatId: customerChatId, ...record.customerReceipt },
        customerReceiptText(record, { withItems: !record.customerReceipt.isPhoto }),
        customerReceiptKeyboard(record, origin)
      ),
  ]);

  record.staffCopies = bumpedCopies;
  await saveOrder(record);
}

/**
 * Re-posts a staff order at the bottom of its chat so paid orders are easy to find,
 * then removes the old one. Falls back to editing in place if the re-post fails.
 */
async function bumpStaffCopy(
  botToken: string,
  copy: OrderCopy,
  text: string,
  buttons: InlineKeyboard
): Promise<OrderCopy> {
  const sent = await sendTelegramText(botToken, copy.chatId, text, buttons);
  if (!sent.ok || !sent.result) {
    console.warn(`Could not re-post order in chat ${copy.chatId}:`, sent.description);
    await editOrderMessage(botToken, copy, text, buttons);
    return copy;
  }

  const deleted = await deleteTelegramMessage(botToken, copy.chatId, copy.messageId);
  if (!deleted.ok) {
    // Leave no second set of buttons behind if the old message can't be deleted
    await editOrderMessage(botToken, copy, `⬇️ Order moved down: customer paid. See the newer message.`, {
      inline_keyboard: [],
    });
  }
  return { chatId: copy.chatId, messageId: sent.result.message_id, isPhoto: false };
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

    // Private chat: /start, /loyalty, /card
    const incoming = update.message;
    if (incoming?.chat?.type === "private") {
      const text   = typeof incoming.text === "string" ? incoming.text : "";
      const chatId = incoming.chat.id;
      const tgUser = incoming.from as { id: number; first_name?: string; last_name?: string; username?: string } | undefined;

      if (text.startsWith("/start")) {
        const baseAppUrl = (process.env.TELEGRAM_MINI_APP_URL || req.nextUrl.origin).replace(/\/$/, "");
        const menuUrl = `${baseAppUrl}/`;
        const cardUrl = `${baseAppUrl}/?tab=loyalty`;
        await sendTelegramText(
          botToken,
          chatId,
          `☕ <b>សូមស្វាគមន៍មកកាន់ SIGNAL Cafe!</b>\n\nកុម្ម៉ង់ភេសជ្ជៈ ឬមើលស្តាម្ពការ្ដរបស់អ្នក៖`,
          {
            inline_keyboard: [
              [{ text: "☕ ម៉ឺនុយ / Mini App", web_app: { url: menuUrl } }],
              [{ text: "🎫 ស្តាម្ពការ្ដ",    web_app: { url: cardUrl } }],
            ],
          }
        );
      } else if (text.startsWith("/loyalty") || text.startsWith("/card")) {
        // Show the customer's loyalty card in the bot chat
        if (tgUser) {
          const name = [tgUser.first_name, tgUser.last_name].filter(Boolean).join(" ") || "Guest";
          const card = await ensureLoyaltyCard(tgUser.id, name);
          const sent = await sendTelegramText(botToken, chatId, loyaltyCardText(card), loyaltyCardKeyboard(card));
          // Remember the message so we can edit it in-place on future stamps
          if (sent.ok && sent.result) {
            card.cardMessageId = sent.result.message_id;
            await saveLoyaltyCard(card);
          }
        }
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

    const colonIdx = data.indexOf(":");
    const action = colonIdx >= 0 ? data.slice(0, colonIdx) : data;
    const payload = colonIdx >= 0 ? data.slice(colonIdx + 1) : "";

    // ── Loyalty callbacks ──────────────────────────────────────────────────────
    if (action === "loyalty_stamp_ok") {
      // Barista approved a stamp via QR scan
      const qrToken = payload;
      const card = await getCardByQrToken(qrToken);
      if (!card) {
        await answerCallbackQuery(botToken, callbackId, "QR token not found");
        return NextResponse.json({ ok: true });
      }
      const { card: updated, earnedFree } = await addStamp(card.telegramId, card.telegramName);
      await answerCallbackQuery(botToken, callbackId, earnedFree ? "🎁 ស្តាម្ព + ភេសជ្ជៈឥតគិតថ្លៃ!" : "✅ ស្តាម្ពបានផ្ដល់!");

      // Edit the approval message in the staff chat to show done state
      await editOrderMessage(
        botToken,
        { chatId: message.chat.id, messageId: message.message_id, isPhoto: false },
        staffStampDoneText(updated),
        { inline_keyboard: [] }
      );

      // Notify the customer
      await notifyCustomerCardUpdate(botToken, updated);
      return NextResponse.json({ ok: true });
    }

    if (action === "loyalty_stamp_no") {
      await answerCallbackQuery(botToken, callbackId, "❌ បានបដិសេធ");
      await editOrderMessage(
        botToken,
        { chatId: message.chat.id, messageId: message.message_id, isPhoto: false },
        "❌ បានបដិសេធស្តាម្ព",
        { inline_keyboard: [] }
      );
      return NextResponse.json({ ok: true });
    }

    if (action === "loyalty_redeem") {
      // Customer tapped "Redeem Free Drink" on their own card
      const telegramId = Number(payload);
      const card = await getLoyaltyCard(telegramId);
      if (!card || pendingFreeCount(card) === 0) {
        await answerCallbackQuery(botToken, callbackId, "មិនមានភេសជ្ជៈឥតគិតថ្លៃទេ");
        return NextResponse.json({ ok: true });
      }
      await answerCallbackQuery(botToken, callbackId, "ផ្ញើទៅបារីស្តារួចហើយ!");
      const chatIds = parseTelegramChatIds(process.env.TELEGRAM_CHAT_ID);
      await Promise.all(
        chatIds.map((chatId) =>
          sendTelegramText(botToken, chatId, staffRedeemText(card), staffRedeemKeyboard(card.telegramId))
        )
      );
      return NextResponse.json({ ok: true });
    }

    if (action === "loyalty_redeem_ok") {
      const telegramId = Number(payload);
      const updated = await redeemFreeDrink(telegramId);
      if (!updated) {
        await answerCallbackQuery(botToken, callbackId, "មិនមានភេសជ្ជៈឥតគិតថ្លៃទេ");
        return NextResponse.json({ ok: true });
      }
      await answerCallbackQuery(botToken, callbackId, "✅ បានផ្ដល់ភេសជ្ជៈឥតគិតថ្លៃ!");
      await editOrderMessage(
        botToken,
        { chatId: message.chat.id, messageId: message.message_id, isPhoto: false },
        `✅ <b>បានផ្ដល់ភេសជ្ជៈឥតគិតថ្លៃ!</b>\n👤 ${escapeHtml(updated.telegramName)}`,
        { inline_keyboard: [] }
      );
      await notifyCustomerCardUpdate(botToken, updated);
      return NextResponse.json({ ok: true });
    }

    if (action === "loyalty_redeem_no") {
      await answerCallbackQuery(botToken, callbackId, "❌ បានបដិសេធ");
      await editOrderMessage(
        botToken,
        { chatId: message.chat.id, messageId: message.message_id, isPhoto: false },
        "❌ បានបដិសេធ",
        { inline_keyboard: [] }
      );
      return NextResponse.json({ ok: true });
    }
    // ──────────────────────────────────────────────────────────────────────────

    const orderNumber = payload;
    if (action === "paid" && orderNumber) {
      await handleAbaPaid(botToken, callbackQuery, orderNumber, req.nextUrl.origin);
      return NextResponse.json({ ok: true, status: action, orderNumber });
    }

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
        `ការកុម្ម៉ង់ #${orderNumber} ត្រូវបានបិទរួចហើយ។`
      );
      return NextResponse.json({ ok: true, ignored: "Order already closed" });
    }

    let newStatusText = "";
    let alertPopup = "";
    const newKeyboard = staffKeyboard(orderNumber, nextStatus);

    if (action === "confirm") {
      newStatusText = `🟡 <b>ស្ថានភាព៖ កំពុងធ្វើ (បញ្ជាក់ដោយ ${escapeHtml(staffName)})</b>`;
      alertPopup = `ការកុម្ម៉ង់ #${orderNumber} បានបញ្ជាក់! កំពុងធ្វើភេសជ្ជៈ...`;
    } else if (action === "pickup") {
      newStatusText = `🟢 <b>ស្ថានភាព៖ រួចរាល់ / បានទទួល (ដោយ ${escapeHtml(staffName)})</b>`;
      alertPopup = `ការកុម្ម៉ង់ #${orderNumber} រួចរាល់! 🎉`;
    } else {
      newStatusText = `❌ <b>ស្ថានភាព៖ បានលុបចោល (ដោយ ${escapeHtml(staffName)})</b>`;
      alertPopup = `ការកុម្ម៉ង់ #${orderNumber} ត្រូវបានលុបចោល។`;
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
      const statusLine = /^.*(?:Status:|ស្ថានភាព៖).*$/m;
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
    if (!record) {
      console.warn(
        `Order ${orderNumber} is not in storage, so the customer can't be notified. Is Upstash Redis connected (KV_REST_API_URL / KV_REST_API_TOKEN)?`
      );
    } else if (!record.customerTelegram) {
      console.info(`Order ${orderNumber} wasn't placed from the Telegram Mini App; no customer chat to notify.`);
    }
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

      // Take the pay buttons off the ABA QR once the order is closed
      const payment = record.paymentMessage;
      if (payment && (record.status === "ready" || record.status === "cancelled")) {
        await editOrderMessage(
          botToken,
          { chatId: customerChatId, ...payment },
          abaPaymentText(record),
          abaPaymentKeyboard(record, req.nextUrl.origin)
        );
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

    // 5. Auto-stamp on pickup for Mini App orders
    if (action === "pickup" && record?.customerTelegram) {
      const tg = record.customerTelegram;
      try {
        const { card: loyaltyCard } = await addStamp(tg.id, tg.name);
        await notifyCustomerCardUpdate(botToken, loyaltyCard);
      } catch (stampErr) {
        console.warn(`Could not add loyalty stamp for order ${orderNumber}:`, stampErr);
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

/**
 * Edit the customer's loyalty card message in-place (or send a new one if none saved).
 * Also sends a short silent alert so the customer gets notified (edits are silent).
 */
async function notifyCustomerCardUpdate(
  botToken: string,
  card: import("@/lib/loyaltyStore").LoyaltyCard
): Promise<void> {
  const chatId = card.telegramId;
  const text   = loyaltyCardText(card);
  const kb     = loyaltyCardKeyboard(card);
  const pending = pendingFreeCount(card);

  if (card.cardMessageId) {
    const result = await editOrderMessage(
      botToken,
      { chatId, messageId: card.cardMessageId, isPhoto: false },
      text,
      kb
    );
    if (!result.ok && result.description !== "Bad Request: message is not modified") {
      // Can't edit (deleted?), forget the ID and re-send below
      card.cardMessageId = undefined;
      await saveLoyaltyCard(card);
    }
  }

  if (!card.cardMessageId) {
    // Send the full card for the first time
    const full = await sendTelegramText(botToken, chatId, text, kb);
    if (full.ok && full.result) {
      card.cardMessageId = full.result.message_id;
      await saveLoyaltyCard(card);
    }
    return; // sending the card itself is enough notification
  }

  // Card was edited in-place (silent) — send a short reply to alert the customer
  const alert = pending > 0
    ? `🎁 ស្តាម្ពបានផ្ដល់! អ្នកទទួលបានភេសជ្ជៈឥតគិតថ្លៃ 1 គ្រឿង!`
    : `☕ ស្តាម្ពបានផ្ដល់! ${card.stamps}/${10} ស្តាម្ព`;
  await sendTelegramText(botToken, chatId, alert, undefined, card.cardMessageId);
}
