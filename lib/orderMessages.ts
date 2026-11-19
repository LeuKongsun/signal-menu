import type { OrderRecord, OrderStatus } from "@/lib/orderStore";
import { escapeHtml, type InlineKeyboard } from "@/lib/telegram";
import { ABA_ACCOUNT_NAME, ABA_ACCOUNT_NUMBER, ABA_PAY_LINK } from "@/lib/aba";
export const PENDING_STATUS_LINE = `🔴 <b>Status: PENDING REVIEW</b>`;

/** Barista buttons for an order in the given status. */
export function staffKeyboard(orderNumber: string, status: OrderStatus): InlineKeyboard {
  const cancel = { text: "❌ Cancel Order", callback_data: `cancel:${orderNumber}` };
  if (status === "pending") {
    return {
      inline_keyboard: [
        [
          { text: "✅ Confirm Order", callback_data: `confirm:${orderNumber}` },
          { ...cancel, text: "❌ Cancel" },
        ],
      ],
    };
  }
  if (status === "preparing" || status === "confirmed") {
    return {
      inline_keyboard: [
        [{ text: "🔔 Ready for Pickup / Picked Up", callback_data: `pickup:${orderNumber}` }],
        [cancel],
      ],
    };
  }
  return { inline_keyboard: [] };
}

export function staffOrderText(order: OrderRecord, statusLine: string) {
  const itemsText = order.items
    .map(
      (i, idx) =>
        `${idx + 1}. <b>${escapeHtml(i.nameKh)}</b> / ${escapeHtml(i.nameEn)}${i.size ? ` (${escapeHtml(i.size)})` : ""}\n   ↳ <b>${i.quantity}x</b> • ${i.priceRiel.toLocaleString()}៛ ($${i.priceUsd.toFixed(2)})`
    )
    .join("\n");

  const timeString = new Date(order.createdAt).toLocaleTimeString("en-US", {
    timeZone: "Asia/Phnom_Penh",
    hour: "2-digit",
    minute: "2-digit",
  });

  const paymentLabel =
    order.paymentMethod === "cash"
      ? "💵 <b>Cash on Pickup</b>"
      : order.abaPayment === "unpaid"
        ? "⏳ <b>ABA KHQR — waiting for the customer to pay</b>"
        : order.abaPayment === "reported"
          ? `💰 <b>ABA KHQR — customer says paid</b> (check the ABA app for remark <code>${order.orderNumber}</code>)`
          : "🏦 <b>ABA KHQR</b> (check the ABA app before confirming)";

  const tg = order.customerTelegram;
  const telegramLine = tg
    ? `📱 <b>Telegram:</b> <a href="tg://user?id=${tg.id}">${escapeHtml(tg.name)}</a>${tg.username ? ` (@${escapeHtml(tg.username)})` : ""}`
    : null;

  return [
    order.abaPayment === "reported"
      ? `💰 <b>PAID (ABA) · ORDER #${order.orderNumber}</b>`
      : `☕ <b>NEW SIGNAL ORDER #${order.orderNumber}</b>`,
    statusLine,
    `--------------------------------`,
    `👤 <b>Customer:</b> ${escapeHtml(order.customerName)}`,
    order.customerPhone ? `📞 <b>Phone:</b> ${escapeHtml(order.customerPhone)}` : null,
    telegramLine,
    `💳 <b>Payment:</b> ${paymentLabel}`,
    `--------------------------------`,
    `<b>DRINKS LIST:</b>`,
    itemsText,
    `--------------------------------`,
    `💰 <b>TOTAL:</b> <b>${order.totalRiel.toLocaleString()} ៛</b> (≈ $${order.totalUsd.toFixed(2)})`,
    order.customerNotes ? `\n📝 <b>Note:</b> <i>${escapeHtml(order.customerNotes)}</i>` : null,
    `--------------------------------`,
    `⏰ <i>Time: ${timeString}</i>`,
  ]
    .filter(Boolean)
    .join("\n");
}

function itemLines(order: OrderRecord) {
  return order.items
    .map(
      (i) =>
        `• ${escapeHtml(i.nameEn)}${i.size ? ` (${escapeHtml(i.size)})` : ""} ×${i.quantity} — ${i.priceRiel.toLocaleString("en-US")}៛`
    )
    .join("\n");
}

const RECEIPT_HEADLINES: Record<OrderStatus, [string, string]> = {
  pending: ["⏳ Waiting for the barista to confirm", "កំពុងរង់ចាំការបញ្ជាក់"],
  confirmed: ["☕ Making your drinks", "កំពុងរៀបចំភេសជ្ជៈរបស់អ្នក"],
  preparing: ["☕ Making your drinks", "កំពុងរៀបចំភេសជ្ជៈរបស់អ្នក"],
  ready: ["🎉 Ready! Please collect at the counter", "ភេសជ្ជៈរបស់អ្នករួចរាល់ហើយ សូមមកទទួលនៅបញ្ជរ"],
  cancelled: ["❌ Order cancelled", "ការកម្ម៉ង់ត្រូវបានលុបចោល"],
};

const PROGRESS_STEPS = ["Received", "Making", "Ready"];
const PROGRESS_INDEX: Record<OrderStatus, number> = {
  pending: 0,
  confirmed: 1,
  preparing: 1,
  ready: 2,
  cancelled: -1,
};

function progressLine(status: OrderStatus) {
  const current = PROGRESS_INDEX[status];
  if (current < 0) return `Please speak to our staff if you have any questions.`;
  return PROGRESS_STEPS.map((step, i) => `${i <= current ? "✅" : "⚪"} ${step}`).join("  ·  ");
}

/** Receipt text; leave out the item list when it's the caption of the receipt image. */
export function customerReceiptText(order: OrderRecord, { withItems = true } = {}) {
  const [headline, headlineKh] = RECEIPT_HEADLINES[order.status];
  const paymentText =
    order.paymentMethod === "cash"
      ? "Cash at pickup"
      : order.abaPayment === "unpaid"
        ? "ABA KHQR (not paid yet)"
        : order.abaPayment === "reported"
          ? "ABA KHQR (marked as paid ✅)"
          : "ABA KHQR";

  return [
    `🧾 <b>SIGNAL Cafe · Order #${order.orderNumber}</b>`,
    ``,
    `<b>${headline}</b>`,
    headlineKh,
    progressLine(order.status),
    ``,
    ...(withItems ? [itemLines(order), ``] : []),
    `<b>Total: ${order.totalRiel.toLocaleString("en-US")}៛</b> (≈ $${order.totalUsd.toFixed(2)})`,
    `Payment: ${paymentText}`,
  ].join("\n");
}

export function customerReceiptKeyboard(
  order: OrderRecord,
  origin: string
): InlineKeyboard {
  const isClosed = order.status === "ready" || order.status === "cancelled";
  const button = isClosed
    ? {
        text: "☕ Order again",
        web_app: { url: process.env.TELEGRAM_MINI_APP_URL || `${origin}/` },
      }
    : {
        text: "📍 Track order",
        web_app: { url: `${origin}/order/${order.orderNumber}` },
      };
  return { inline_keyboard: [[button]] };
}

function amountLine(order: OrderRecord) {
  return `Amount: <b>${order.totalRiel.toLocaleString("en-US")}៛</b> (≈ $${order.totalUsd.toFixed(2)})`;
}

/** Caption of the ABA QR the bot sends after an ABA order. */
export function abaPaymentText(order: OrderRecord) {
  const n = order.orderNumber;
  const paid = order.abaPayment === "reported";

  if (order.status === "cancelled") {
    return paid
      ? `❌ <b>Order #${n} was cancelled.</b>\nYou marked it as paid, so please speak to our staff about a refund.`
      : `❌ <b>Order #${n} was cancelled.</b> No need to pay.\nការកម្ម៉ង់ត្រូវបានលុបចោល`;
  }
  if (paid) {
    return [
      `✅ <b>Payment marked as sent · #${n}</b>`,
      amountLine(order),
      ``,
      `Thank you! The barista will check it in the ABA app.`,
      `សូមអរគុណ! យើងនឹងពិនិត្យការបង់ប្រាក់របស់អ្នក`,
    ].join("\n");
  }
  if (order.status === "ready") {
    return [`💳 <b>Pay for order #${n}</b>`, amountLine(order)].join("\n");
  }
  return [
    `💳 <b>Pay for order #${n}</b>`,
    amountLine(order),
    `ABA: ${escapeHtml(ABA_ACCOUNT_NUMBER)} (${escapeHtml(ABA_ACCOUNT_NAME)})`,
    ``,
    `1. Save this QR and scan it in ABA, or tap <b>Open ABA to pay</b>`,
    `2. Pay the exact amount and type <code>${n}</code> in the remark (tap to copy)`,
    `3. Come back here and tap <b>✅ I've paid</b>`,
    ``,
    `សូមបង់ប្រាក់តាម ABA ដោយសរសេរ <code>${n}</code> ក្នុងចំណាំ រួចចុច «✅ I've paid»`,
  ].join("\n");
}

export function abaPaymentKeyboard(order: OrderRecord, origin: string): InlineKeyboard {
  const isClosed = order.status === "ready" || order.status === "cancelled";
  if (order.abaPayment === "unpaid" && !isClosed) {
    return {
      inline_keyboard: [
        [{ text: "💳 Open ABA to pay", url: ABA_PAY_LINK }],
        [{ text: "✅ I've paid", callback_data: `paid:${order.orderNumber}` }],
      ],
    };
  }
  return customerReceiptKeyboard(order, origin);
}
const STATUS_ALERTS: Partial<Record<OrderStatus, (n: string) => string>> = {
  preparing: (n) =>
    `☕ <b>Order #${n} confirmed!</b> We're making your drinks now.\nកំពុងរៀបចំភេសជ្ជៈរបស់អ្នក`,
  ready: (n) =>
    `🎉 <b>Order #${n} is ready!</b> Please collect it at the counter.\nភេសជ្ជៈរបស់អ្នករួចរាល់ហើយ សូមមកទទួលនៅបញ្ជរ`,
  cancelled: (n) =>
    `❌ <b>Order #${n} was cancelled.</b> Please speak to our staff if you have any questions.\nការកម្ម៉ង់ត្រូវបានលុបចោល`,
};

/** Short message sent as a reply to the receipt, since edits alone don't notify the customer. */
export function customerStatusText(order: OrderRecord): string | null {
  return STATUS_ALERTS[order.status]?.(order.orderNumber) ?? null;
}
