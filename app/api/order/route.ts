import { NextRequest, NextResponse } from "next/server";

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

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const rawOrderData = formData.get("orderData") as string | null;
    const receiptFile = formData.get("receipt") as File | null;

    if (!rawOrderData) {
      return NextResponse.json(
        { success: false, error: "Missing order data" },
        { status: 400 }
      );
    }

    const order = JSON.parse(rawOrderData) as OrderDataInput;

    // Generate official Order Number on server
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = `SIG-${randomSuffix}`;

    // Format item lines
    const itemsText = order.items
      .map(
        (i: OrderItemInput, idx: number) =>
          `${idx + 1}. <b>${i.nameKh}</b> / ${i.nameEn}${i.size ? ` (${i.size})` : ""}\n   ↳ <b>${i.quantity}x</b> • ${i.priceRiel.toLocaleString()}៛ ($${i.priceUsd.toFixed(2)})`
      )
      .join("\n");

    const timeString = new Date().toLocaleTimeString("en-US", {
      timeZone: "Asia/Phnom_Penh",
      hour: "2-digit",
      minute: "2-digit",
    });

    const paymentLabel =
      order.paymentMethod === "aba"
        ? "✅ <b>ABA KHQR (Receipt Attached)</b>"
        : "💵 <b>Cash on Pickup</b>";

    const caption = [
      `☕ <b>NEW SIGNAL ORDER #${orderNumber}</b>`,
      `🔴 <b>Status: PENDING REVIEW</b>`,
      `--------------------------------`,
      `👤 <b>Customer:</b> ${order.customerName}`,
      order.customerPhone ? `📞 <b>Phone:</b> ${order.customerPhone}` : null,
      `💳 <b>Payment:</b> ${paymentLabel}`,
      `--------------------------------`,
      `<b>DRINKS LIST:</b>`,
      itemsText,
      `--------------------------------`,
      `💰 <b>TOTAL:</b> <b>${order.totalRiel.toLocaleString()} ៛</b> (≈ $${order.totalUsd.toFixed(2)})`,
      order.customerNotes ? `\n📝 <b>Note:</b> <i>${order.customerNotes}</i>` : null,
      `--------------------------------`,
      `⏰ <i>Time: ${timeString}</i>`,
    ]
      .filter(Boolean)
      .join("\n");

    // Interactive buttons for Baristas
    const inlineKeyboard = {
      inline_keyboard: [
        [
          {
            text: "✅ Confirm Order",
            callback_data: `confirm:${orderNumber}`,
          },
          {
            text: "❌ Cancel",
            callback_data: `cancel:${orderNumber}`,
          },
        ],
      ],
    };

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    // If Telegram credentials are not yet added, simulate success and log to console
    if (!botToken || !chatId) {
      console.log("\n================ [SIGNAL ORDER RECEIVED (TEST MODE)] ================");
      console.log(caption.replace(/<[^>]+>/g, ""));
      console.log(`Receipt attached: ${receiptFile ? receiptFile.name : "None"}`);
      console.log("Buttons attached: [✅ Confirm Order] [❌ Cancel]");
      console.log("=======================================================================\n");

      return NextResponse.json({
        success: true,
        orderNumber,
        isMock: true,
        message: "Order placed in development mode. Add TELEGRAM_BOT_TOKEN & TELEGRAM_CHAT_ID in .env.local to receive live Telegram alerts.",
      });
    }

    // Send to Telegram
    if (receiptFile && receiptFile.size > 0) {
      const tgFormData = new FormData();
      tgFormData.append("chat_id", chatId);
      tgFormData.append("photo", receiptFile, receiptFile.name || "receipt.jpg");
      tgFormData.append("caption", caption);
      tgFormData.append("parse_mode", "HTML");
      tgFormData.append("reply_markup", JSON.stringify(inlineKeyboard));

      const res = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
        method: "POST",
        body: tgFormData,
      });

      const data = await res.json();
      if (!data.ok) {
        console.error("Telegram sendPhoto failed:", data);
        return NextResponse.json(
          { success: false, error: data.description || "Failed to send receipt to Telegram" },
          { status: 500 }
        );
      }
    } else {
      const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: caption,
          parse_mode: "HTML",
          reply_markup: inlineKeyboard,
        }),
      });

      const data = await res.json();
      if (!data.ok) {
        console.error("Telegram sendMessage failed:", data);
        return NextResponse.json(
          { success: false, error: data.description || "Failed to send order to Telegram" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      orderNumber,
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
