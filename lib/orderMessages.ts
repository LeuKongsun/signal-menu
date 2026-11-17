import type { OrderRecord, OrderStatus } from "@/lib/orderStore";
import { escapeHtml } from "@/lib/telegram";

export const PENDING_STATUS_LINE = `🔴 <b>Status: PENDING REVIEW</b>`;

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
    order.paymentMethod === "aba"
      ? "✅ <b>ABA KHQR (Receipt Attached)</b>"
      : "💵 <b>Cash on Pickup</b>";

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

export function customerReceiptText(order: OrderRecord) {
  return [
    `🧾 <b>Order #${order.orderNumber} received</b>`,
    `ទទួលបានការកម្ម៉ង់របស់អ្នកហើយ`,
    ``,
    itemLines(order),
    ``,
    `<b>Total: ${order.totalRiel.toLocaleString("en-US")}៛</b> (≈ $${order.totalUsd.toFixed(2)})`,
    `Payment: ${order.paymentMethod === "aba" ? "ABA KHQR (receipt sent)" : "Cash at pickup"}`,
    ``,
    `We'll message you here when your drinks are being made and when they're ready.`,
  ].join("\n");
}

const STATUS_MESSAGES: Partial<Record<OrderStatus, (n: string) => string>> = {
  preparing: (n) =>
    `☕ <b>Order #${n} confirmed</b>\nWe're making your drinks now.\nកំពុងរៀបចំភេសជ្ជៈរបស់អ្នក`,
  ready: (n) =>
    `🎉 <b>Order #${n} is ready!</b>\nPlease collect it at the counter.\nភេសជ្ជៈរបស់អ្នករួចរាល់ហើយ សូមមកទទួលនៅបញ្ជរ`,
  cancelled: (n) =>
    `❌ <b>Order #${n} was cancelled</b>\nPlease speak to our staff if you have any questions.\nការកម្ម៉ង់ត្រូវបានលុបចោល`,
};

export function customerStatusText(order: OrderRecord): string | null {
  return STATUS_MESSAGES[order.status]?.(order.orderNumber) ?? null;
}
