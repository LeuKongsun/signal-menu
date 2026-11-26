import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { after, NextRequest, NextResponse } from "next/server";
import {
  parseTelegramChatIds,
  sendOrderMessage,
  sendTelegramText,
  verifyTelegramInitData,
  type InlineKeyboard,
  type OrderCopy,
  type TelegramUser,
} from "@/lib/telegram";
import {
  createOrder,
  getOrder,
  saveOrder,
  type OrderRecord,
} from "@/lib/orderStore";
import {
  abaPaymentKeyboard,
  abaPaymentText,
  customerReceiptKeyboard,
  customerReceiptText,
  PENDING_STATUS_LINE,
  staffKeyboard,
  staffOrderText,
} from "@/lib/orderMessages";
import { renderReceiptImage } from "@/lib/receiptImage";
import { ABA_PAYMENT_ENABLED } from "@/lib/aba";
import { ensureLoyaltyCard } from "@/lib/loyaltyStore";
import { syncOnlineOrderToPos } from "@/lib/onlineOrderBridge";

interface OrderItemInput {
  nameKh: string;
  nameEn: string;
  size?: string;
  quantity: number;
  priceRiel: number;
  priceUsd: number;
}

interface OrderDataInput {
  customerName: string;
  customerPhone?: string;
  customerNotes?: string;
  paymentMethod: "aba" | "cash";
  currency?: "KHR" | "USD";
  totalRiel: number;
  totalUsd: number;
  items: OrderItemInput[];
}

function usdToCents(amount: number) {
  return Math.round(amount * 100);
}

function rielToCents(amount: number) {
  return Math.round(amount * 100);
}

let abaQrPromise: Promise<Uint8Array | null> | null = null;

function getAbaQrBytes(): Promise<Uint8Array | null> {
  if (!abaQrPromise) {
    abaQrPromise = readFile(path.join(process.cwd(), "public", "aba-qr.jpg"))
      .then((buf) => new Uint8Array(buf))
      .catch((err) => {
        console.error("Could not read public/aba-qr.jpg:", err);
        abaQrPromise = null;
        return null;
      });
  }
  return abaQrPromise;
}

async function syncOrderToPos(record: OrderRecord): Promise<{
  posSyncStatus: "synced" | "failed" | "disabled";
  posSyncDiagnostic?: string;
}> {
  try {
    const synced = await syncOnlineOrderToPos({
      orderNumber: record.orderNumber,
      idempotencyKey: `miniapp:${randomUUID()}`,
      customerName: record.customerName,
      customerPhone: record.customerPhone,
      customerNotes: record.customerNotes,
      paymentMethod: record.paymentMethod,
      paymentStatus: record.abaPayment,
      currency: record.currency ?? "KHR",
      items: record.items.map((item) => ({
        ...item,
        priceRiel: rielToCents(item.priceRiel),
        priceUsd: usdToCents(item.priceUsd),
      })),
      totalRiel: rielToCents(record.totalRiel),
      totalUsd: usdToCents(record.totalUsd),
      customerTelegramId: record.customerTelegram?.id ? String(record.customerTelegram.id) : undefined,
    });
    return synced
      ? { posSyncStatus: "synced" }
      : { posSyncStatus: "disabled", posSyncDiagnostic: "SYNC_DISABLED" };
  } catch (error) {
    const status = error instanceof Error
      ? error.message.match(/POS online-order sync returned (\d{3})/)?.[1]
      : undefined;
    const posSyncDiagnostic = status
      ? `HTTP ${status}`
      : error instanceof Error && error.message === "POS online-order bridge is not configured"
        ? "BRIDGE_NOT_CONFIGURED"
        : "CONNECTION_ERROR";
    console.error(`Could not sync online order ${record.orderNumber} to POS`, error);
    return { posSyncStatus: "failed", posSyncDiagnostic };
  }
}

async function sendStaffNotifications(
  botToken: string,
  chatIds: string[],
  caption: string,
  inlineKeyboard: InlineKeyboard
): Promise<{ sentCopies: OrderCopy[]; failures: string[] }> {
  const results = await Promise.all(
    chatIds.map(async (chatId) => {
      const data = await sendOrderMessage({
        botToken,
        chatId,
        text: caption,
        replyMarkup: inlineKeyboard,
      });
      return { chatId, data };
    })
  );

  const sentCopies: OrderCopy[] = [];
  const failures: string[] = [];
  for (const { chatId, data } of results) {
    if (!data.ok || !data.result) {
      console.error(`Telegram send failed for chat ${chatId}:`, data);
      failures.push(data.description || `Failed to send order to chat ${chatId}`);
      continue;
    }
    sentCopies.push({
      chatId,
      messageId: data.result.message_id,
      isPhoto: false,
    });
  }
  return { sentCopies, failures };
}

async function sendCustomerNotifications(
  botToken: string,
  telegramUser: TelegramUser,
  record: OrderRecord,
  origin: string
) {
  const tgName = [telegramUser.first_name, telegramUser.last_name].filter(Boolean).join(" ");
  const loyaltyPromise = ensureLoyaltyCard(telegramUser.id, tgName).catch((err) =>
    console.warn(`Could not ensure loyalty card for user ${telegramUser.id}:`, err)
  );

  const [receiptImage, qr] = await Promise.all([
    renderReceiptImage(record).catch((err) => {
      console.error(`Could not render receipt image for ${record.orderNumber}:`, err);
      return null;
    }),
    record.abaPayment === "unpaid" ? getAbaQrBytes() : Promise.resolve(null),
  ]);

  const keyboard = customerReceiptKeyboard(record, origin);
  const receipt = receiptImage
    ? await sendOrderMessage({
        botToken,
        chatId: String(telegramUser.id),
        text: customerReceiptText(record, { withItems: false }),
        replyMarkup: keyboard,
        photo: { bytes: receiptImage, name: `${record.orderNumber}.png`, type: "image/png" },
      })
    : await sendTelegramText(botToken, telegramUser.id, customerReceiptText(record), keyboard);

  let customerReceipt: OrderRecord["customerReceipt"];
  if (receipt.ok && receipt.result) {
    customerReceipt = {
      messageId: receipt.result.message_id,
      isPhoto: Boolean(receiptImage),
    };
  } else {
    console.warn(`Could not message customer ${telegramUser.id}:`, receipt.description);
  }

  let paymentMessage: OrderRecord["paymentMessage"];
  if (record.abaPayment === "unpaid") {
    const payment = await sendOrderMessage({
      botToken,
      chatId: String(telegramUser.id),
      text: abaPaymentText(record),
      replyMarkup: abaPaymentKeyboard(record, origin),
      photo: qr ? { bytes: qr, name: "signal-aba-qr.jpg", type: "image/jpeg" } : null,
    });
    if (payment.ok && payment.result) {
      paymentMessage = { messageId: payment.result.message_id, isPhoto: Boolean(qr) };
    } else {
      console.warn(`Could not send the ABA QR for ${record.orderNumber}:`, payment.description);
    }
  }

  await loyaltyPromise;

  if (customerReceipt || paymentMessage) {
    // Re-read so we don't clobber status/payment updates made concurrently by webhooks
    const latest = (await getOrder(record.orderNumber)) ?? record;
    if (customerReceipt) latest.customerReceipt = customerReceipt;
    if (paymentMessage) latest.paymentMessage = paymentMessage;
    await saveOrder(latest);
  }
}

async function storeWithUniqueNumber(
  base: Omit<OrderRecord, "orderNumber">
): Promise<OrderRecord> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const record = {
      ...base,
      orderNumber: `SIG-${Math.floor(1000 + Math.random() * 9000)}`,
    };
    if (await createOrder(record)) return record;
  }
  throw new Error("Could not allocate an order number, please try again");
}

export async function POST(req: NextRequest) {
  if (process.env.NEXT_PUBLIC_ONLINE_ORDERING_ENABLED === "true") try {
    const formData = await req.formData();
    const rawOrderData = formData.get("orderData") as string | null;
    const telegramInitData = formData.get("telegramInitData") as string | null;

    if (!rawOrderData) {
      return NextResponse.json(
        { success: false, error: "Missing order data" },
        { status: 400 }
      );
    }

    const order = JSON.parse(rawOrderData) as OrderDataInput;
    if (order.currency !== undefined && order.currency !== "KHR" && order.currency !== "USD") {
      return NextResponse.json({ success: false, error: "Invalid order currency" }, { status: 400 });
    }
    const currency = order.paymentMethod === "aba" ? "KHR" : order.currency ?? "KHR";
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatIds = parseTelegramChatIds(process.env.TELEGRAM_CHAT_ID);

    let telegramUser: TelegramUser | null = null;
    if (telegramInitData && botToken) {
      telegramUser = verifyTelegramInitData(telegramInitData, botToken);
      if (!telegramUser) {
        console.warn("Order sent with Telegram data that failed verification; treating it as a web order.");
      }
    }

    if (order.paymentMethod === "aba" && !ABA_PAYMENT_ENABLED) {
      return NextResponse.json(
        { success: false, error: "ABA payment is not available right now. Please pay cash at pickup." },
        { status: 400 }
      );
    }
    // The ABA QR is sent in the bot chat, so ABA orders have to come from the Mini App
    if (order.paymentMethod === "aba" && !telegramUser && botToken && chatIds.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "ABA payment is only available when ordering in Telegram. Please choose cash at pickup.",
        },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const record = await storeWithUniqueNumber({
      currency,
      customerName: order.customerName,
      customerPhone: order.customerPhone || undefined,
      customerNotes: order.customerNotes || undefined,
      status: "pending",
      items: order.items,
      totalRiel: order.totalRiel,
      totalUsd: order.totalUsd,
      paymentMethod: order.paymentMethod,
      abaPayment: order.paymentMethod === "aba" ? "unpaid" : undefined,
      staffStatusLine: PENDING_STATUS_LINE,
      customerTelegram: telegramUser
        ? {
            id: telegramUser.id,
            name: [telegramUser.first_name, telegramUser.last_name].filter(Boolean).join(" "),
            username: telegramUser.username,
          }
        : undefined,
      createdAt: now,
      updatedAt: now,
    });
    const { orderNumber } = record;
    const caption = staffOrderText(record, PENDING_STATUS_LINE);
    const inlineKeyboard = staffKeyboard(orderNumber, "pending");

    // If Telegram credentials are not yet added, simulate success and log to console
    if (!botToken || chatIds.length === 0) {
      const { posSyncStatus, posSyncDiagnostic } = await syncOrderToPos(record);
      console.log("\n================ [SIGNAL ORDER RECEIVED (TEST MODE)] ================");
      console.log(caption.replace(/<[^>]+>/g, ""));
      console.log("Buttons attached: [✅ Confirm Order] [❌ Cancel]");
      console.log("=======================================================================\n");

      return NextResponse.json({
        success: true,
        orderNumber,
        currency: record.currency,
        isMock: true,
        posSyncStatus,
        posSyncDiagnostic,
        message: "Order placed in development mode. Add TELEGRAM_BOT_TOKEN & TELEGRAM_CHAT_ID in .env.local to receive live Telegram alerts.",
      });
    }

    const [{ posSyncStatus, posSyncDiagnostic }, { sentCopies, failures }] = await Promise.all([
      syncOrderToPos(record),
      sendStaffNotifications(botToken, chatIds, caption, inlineKeyboard),
    ]);

    if (sentCopies.length === 0) {
      record.status = "cancelled";
      await saveOrder(record);
      return NextResponse.json(
        { success: false, error: failures[0] || "Failed to send order to Telegram" },
        { status: 500 }
      );
    }

    record.staffCopies = sentCopies;
    await saveOrder(record);

    if (failures.length > 0) {
      console.error(
        `Order ${orderNumber} reached ${sentCopies.length}/${chatIds.length} chats:`,
        failures
      );
    }

    if (telegramUser) {
      const origin = req.nextUrl.origin;
      after(() => sendCustomerNotifications(botToken, telegramUser, record, origin));
    }

    return NextResponse.json({
      success: true,
      orderNumber,
      currency: record.currency,
      viaTelegram: Boolean(telegramUser),
      posSyncStatus,
      posSyncDiagnostic,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Internal server error";
    console.error("Error processing order:", err);
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: 500 }
    );
  }
}
