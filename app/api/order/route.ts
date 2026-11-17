import { NextRequest, NextResponse } from "next/server";
import {
  parseTelegramChatIds,
  sendOrderMessage,
  sendTelegramText,
  verifyTelegramInitData,
  type OrderCopy,
  type TelegramUser,
} from "@/lib/telegram";
import {
  createOrder,
  saveOrder,
  type OrderRecord,
} from "@/lib/orderStore";
import {
  customerReceiptKeyboard,
  customerReceiptText,
  PENDING_STATUS_LINE,
  staffKeyboard,
  staffOrderText,
} from "@/lib/orderMessages";
import { renderReceiptImage } from "@/lib/receiptImage";
import { ABA_PAYMENT_ENABLED } from "@/lib/aba";

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
  totalRiel: number;
  totalUsd: number;
  items: OrderItemInput[];
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
  try {
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
    const now = new Date().toISOString();
    const record = await storeWithUniqueNumber({
      customerName: order.customerName,
      customerPhone: order.customerPhone || undefined,
      customerNotes: order.customerNotes || undefined,
      status: "pending",
      items: order.items,
      totalRiel: order.totalRiel,
      totalUsd: order.totalUsd,
      paymentMethod: order.paymentMethod,
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
      console.log("\n================ [SIGNAL ORDER RECEIVED (TEST MODE)] ================");
      console.log(caption.replace(/<[^>]+>/g, ""));
      console.log("Buttons attached: [✅ Confirm Order] [❌ Cancel]");
      console.log("=======================================================================\n");

      return NextResponse.json({
        success: true,
        orderNumber,
        isMock: true,
        message: "Order placed in development mode. Add TELEGRAM_BOT_TOKEN & TELEGRAM_CHAT_ID in .env.local to receive live Telegram alerts.",
      });
    }

    const sentCopies: OrderCopy[] = [];
    const failures: string[] = [];

    for (const chatId of chatIds) {
      const data = await sendOrderMessage({
        botToken,
        chatId,
        text: caption,
        replyMarkup: inlineKeyboard,
      });

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
      const keyboard = customerReceiptKeyboard(record, req.nextUrl.origin);
      let receiptImage: Uint8Array | null = null;
      try {
        receiptImage = await renderReceiptImage(record);
      } catch (err) {
        console.error(`Could not render receipt image for ${orderNumber}:`, err);
      }

      const receipt = receiptImage
        ? await sendOrderMessage({
            botToken,
            chatId: String(telegramUser.id),
            text: customerReceiptText(record, { withItems: false }),
            replyMarkup: keyboard,
            photo: { bytes: receiptImage, name: `${orderNumber}.png`, type: "image/png" },
          })
        : await sendTelegramText(botToken, telegramUser.id, customerReceiptText(record), keyboard);

      if (receipt.ok && receipt.result) {
        record.customerReceipt = {
          messageId: receipt.result.message_id,
          isPhoto: Boolean(receiptImage),
        };
        await saveOrder(record);
      } else {
        console.warn(`Could not message customer ${telegramUser.id}:`, receipt.description);
      }
    }

    return NextResponse.json({
      success: true,
      orderNumber,
      viaTelegram: Boolean(telegramUser),
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
