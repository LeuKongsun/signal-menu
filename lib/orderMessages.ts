import type { OrderRecord, OrderStatus } from "@/lib/orderStore";
import { escapeHtml, type InlineKeyboard } from "@/lib/telegram";
import { ABA_PAY_LINK } from "@/lib/aba";

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
      : order.paymentProof === "awaiting"
        ? "⏳ <b>ABA KHQR (waiting for the customer's screenshot)</b>"
        : order.paymentProof === "received"
          ? "✅ <b>ABA KHQR (screenshot sent in reply)</b>"
          : "✅ <b>ABA KHQR (Receipt Attached)</b>";

  const tg = order.customerTelegram;
  const telegramLine = tg
    ? `📱 <b>Telegram:</b> <a href="tg://user?id=${tg.id}">${escapeHtml(tg.name)}</a>${tg.username ? ` (@${escapeHtml(tg.username)})` : ""}`
    : null;

  return [
    `☕ <b>NEW SIGNAL ORDER #${order.orderNumber}</b>`,
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
  const isOpen = order.status !== "ready" && order.status !== "cancelled";
  const screenshotLines =
    order.paymentProof === "awaiting" && isOpen
      ? [
          `📸 <b>Pay with ABA, then send your payment screenshot in this chat.</b>`,
          `សូមបង់ប្រាក់តាម ABA រួចផ្ញើរូបថតបង្កាន់ដៃនៅទីនេះ`,
          ``,
        ]
      : [];
  const paymentText =
    order.paymentMethod === "cash"
      ? "Cash at pickup"
      : order.paymentProof === "awaiting"
        ? "ABA KHQR (waiting for your screenshot)"
        : "ABA KHQR (screenshot received ✅)";

  return [
    `🧾 <b>SIGNAL Cafe · Order #${order.orderNumber}</b>`,
    ``,
    `<b>${headline}</b>`,
    headlineKh,
    progressLine(order.status),
    ``,
    ...screenshotLines,
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
  const payButton =
    order.paymentProof === "awaiting" && !isClosed
      ? [[{ text: "💳 Pay with ABA", url: ABA_PAY_LINK }]]
      : [];
  return { inline_keyboard: [...payButton, [button]] };
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
