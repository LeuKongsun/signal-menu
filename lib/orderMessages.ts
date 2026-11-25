import type { OrderRecord, OrderStatus } from "@/lib/orderStore";
import { escapeHtml, type InlineKeyboard } from "@/lib/telegram";
import { ABA_ACCOUNT_NAME, ABA_PAY_LINK } from "@/lib/aba";

export const PENDING_STATUS_LINE = `🔴 <b>ស្ថានភាព៖ រង់ចាំពិនិត្យ</b>`;

function formatOrderAmount(order: OrderRecord, totalRiel: number, totalUsd: number) {
  return (order.currency ?? "KHR") === "USD"
    ? `$${totalUsd.toFixed(2)} (≈ ${totalRiel.toLocaleString("en-US")}៛)`
    : `${totalRiel.toLocaleString("en-US")}៛ (≈ $${totalUsd.toFixed(2)})`;
}

/** Barista buttons for an order in the given status. */
export function staffKeyboard(orderNumber: string, status: OrderStatus): InlineKeyboard {
  const cancel = { text: "❌ លុបចោល", callback_data: `cancel:${orderNumber}` };
  if (status === "pending") {
    return {
      inline_keyboard: [
        [
          { text: "✅ ទទួលកុម្ម៉ង់", callback_data: `confirm:${orderNumber}` },
          cancel,
        ],
      ],
    };
  }
  if (status === "preparing" || status === "confirmed") {
    return {
      inline_keyboard: [
        [{ text: "🔔 ភេសជ្ជៈរួចរាល់", callback_data: `pickup:${orderNumber}` }],
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
      ? "💵 <b>ទូទាត់ផ្ទាល់ (សាច់ប្រាក់)</b>"
      : order.abaPayment === "unpaid"
        ? "⏳ <b>ABA KHQR — រង់ចាំអតិថិជនបង់</b>"
        : order.abaPayment === "reported"
          ? `💰 <b>ABA KHQR — បានបង់ប្រាក់</b> (ចំណាំ <code>${order.orderNumber}</code>)`
          : "🏦 <b>ABA KHQR</b> (សូមពិនិត្យ ABA មុនបញ្ជាក់)";

  const tg = order.customerTelegram;
  const telegramLine = tg
    ? `📱 <b>Telegram:</b> <a href="tg://user?id=${tg.id}">${escapeHtml(tg.name)}</a>${tg.username ? ` (@${escapeHtml(tg.username)})` : ""}`
    : null;

  return [
    order.abaPayment === "reported"
      ? `💰 <b>បានបង់ប្រាក់ (ABA) · #${order.orderNumber}</b>`
      : `☕ <b>ការកុម្ម៉ង់ថ្មី #${order.orderNumber}</b>`,
    statusLine,
    `--------------------------------`,
    `👤 <b>អតិថិជន៖</b> ${escapeHtml(order.customerName)}`,
    order.customerPhone ? `📞 <b>ទូរស័ព្ទ៖</b> ${escapeHtml(order.customerPhone)}` : null,
    telegramLine,
    `💳 <b>ការទូទាត់៖</b> ${paymentLabel}`,
    `--------------------------------`,
    `📋 <b>ភេសជ្ជៈ៖</b>`,
    itemsText,
    `--------------------------------`,
    `💰 <b>សរុប៖</b> <b>${formatOrderAmount(order, order.totalRiel, order.totalUsd)}</b>`,
    order.customerNotes ? `\n📝 <b>ចំណាំ៖</b> <i>${escapeHtml(order.customerNotes)}</i>` : null,
    `--------------------------------`,
    `⏰ <i>ម៉ោង៖ ${timeString}</i>`,
  ]
    .filter(Boolean)
    .join("\n");
}

function itemLines(order: OrderRecord) {
  return order.items
    .map(
      (i) =>
        `• ${escapeHtml(i.nameKh || i.nameEn)}${i.size ? ` (${escapeHtml(i.size)})` : ""} ×${i.quantity} — ${(order.currency ?? "KHR") === "USD" ? `$${i.priceUsd.toFixed(2)}` : `${i.priceRiel.toLocaleString("en-US")}៛`}`
    )
    .join("\n");
}

const RECEIPT_HEADLINES: Record<OrderStatus, [string, string]> = {
  pending: ["⏳ រង់ចាំការបញ្ជាក់", "បារីស្តានឹងពិនិត្យក្នុងពេលបន្តិចទៀត"],
  confirmed: ["☕ កំពុងធ្វើភេសជ្ជៈ", "បារីស្តាកំពុងរៀបចំជូនអ្នក"],
  preparing: ["☕ កំពុងធ្វើភេសជ្ជៈ", "បារីស្តាកំពុងរៀបចំជូនអ្នក"],
  ready: ["🎉 ភេសជ្ជៈរួចរាល់ហើយ!", "សូមអញ្ជើញមកទទួលនៅបញ្ជរ"],
  cancelled: ["❌ ការកុម្ម៉ង់ត្រូវបានលុបចោល", "សូមទាក់ទងមកកាន់បារីស្តា"],
};

const PROGRESS_STEPS = ["បានទទួល", "កំពុងធ្វើ", "រួចរាល់"];
const PROGRESS_INDEX: Record<OrderStatus, number> = {
  pending: 0,
  confirmed: 1,
  preparing: 1,
  ready: 2,
  cancelled: -1,
};

function progressLine(status: OrderStatus) {
  const current = PROGRESS_INDEX[status];
  if (current < 0) return `សូមសាកសួរបុគ្គលិកប្រសិនបើមានចម្ងល់។`;
  return PROGRESS_STEPS.map((step, i) => `${i <= current ? "✅" : "⚪"} ${step}`).join("  ·  ");
}

/** Receipt text; leave out the item list when it's the caption of the receipt image. */
export function customerReceiptText(order: OrderRecord, { withItems = true } = {}) {
  const [headline, headlineKh] = RECEIPT_HEADLINES[order.status];
  const paymentText =
    order.paymentMethod === "cash"
      ? "ទូទាត់ផ្ទាល់ (សាច់ប្រាក់)"
      : order.abaPayment === "unpaid"
        ? "ABA KHQR (មិនទាន់បង់)"
        : order.abaPayment === "reported"
          ? "ABA KHQR (បានបង់ប្រាក់ ✅)"
          : "ABA KHQR";

  return [
    `🧾 <b>SIGNAL Cafe · #${order.orderNumber}</b>`,
    ``,
    `<b>${headline}</b>`,
    headlineKh,
    progressLine(order.status),
    ``,
    ...(withItems ? [itemLines(order), ``] : []),
    `<b>សរុប៖ ${formatOrderAmount(order, order.totalRiel, order.totalUsd)}</b>`,
    `ការទូទាត់៖ ${paymentText}`,
  ].join("\n");
}

export function customerReceiptKeyboard(
  order: OrderRecord,
  origin: string
): InlineKeyboard {
  const isClosed = order.status === "ready" || order.status === "cancelled";
  const button = isClosed
    ? {
        text: "☕ កុម្ម៉ង់ម្ដងទៀត",
        web_app: { url: process.env.TELEGRAM_MINI_APP_URL || `${origin}/` },
      }
    : {
        text: "📍 តាមដានការកុម្ម៉ង់",
        web_app: { url: `${origin}/order/${order.orderNumber}` },
      };
  return { inline_keyboard: [[button]] };
}

function amountLine(order: OrderRecord) {
  return `ចំនួនទឹកប្រាក់៖ <b>${formatOrderAmount(order, order.totalRiel, order.totalUsd)}</b>`;
}

/** Caption of the ABA QR the bot sends after an ABA order. */
export function abaPaymentText(order: OrderRecord) {
  const n = order.orderNumber;
  const paid = order.abaPayment === "reported";

  if (order.status === "cancelled") {
    return paid
      ? `❌ <b>ការកុម្ម៉ង់ #${n} ត្រូវបានលុបចោល។</b>\nដោយសារអ្នកបានបង់រួច សូមទាក់ទងបារីស្តាដើម្បីទទួលប្រាក់វិញ។`
      : `❌ <b>ការកុម្ម៉ង់ #${n} ត្រូវបានលុបចោល។</b> ពុំចាំបាច់បង់ប្រាក់ទេ។`;
  }
  if (paid) {
    return [
      `✅ <b>បានកត់ត្រាការបង់ប្រាក់ · #${n}</b>`,
      amountLine(order),
      `ABA: ${escapeHtml(ABA_ACCOUNT_NAME)} · ចំណាំ <code>${n}</code>`,
      ``,
      `សូមអរគុណ! បារីស្តានឹងពិនិត្យការទូទាត់ជូន។`,
      ...(order.status === "ready"
        ? []
        : [`បើមិនទាន់បង់ទេ សូមចុច <b>«បើក ABA ដើម្បីបង់»</b> ខាងក្រោម។`]),
    ].join("\n");
  }
  if (order.status === "ready") {
    return [`💳 <b>ទូទាត់ប្រាក់ #${n}</b>`, amountLine(order)].join("\n");
  }
  return [
    `💳 <b>ទូទាត់ប្រាក់ #${n}</b>`,
    amountLine(order),
    `ABA: ${escapeHtml(ABA_ACCOUNT_NAME)}`,
    ``,
    `១. ស្កេន QR ឬចុច <b>«បើក ABA ដើម្បីបង់»</b>`,
    `២. ដាក់ចំណាំលេខ <code>${n}</code>`,
    `៣. បង់រួចចុច <b>«✅ បានបង់ប្រាក់»</b>`,
  ].join("\n");
}

export function abaPaymentKeyboard(order: OrderRecord, origin: string): InlineKeyboard {
  const isClosed = order.status === "ready" || order.status === "cancelled";
  const payLink = [{ text: "💳 បើក ABA ដើម្បីបង់", url: ABA_PAY_LINK }];
  if (order.abaPayment === "unpaid" && !isClosed) {
    return {
      inline_keyboard: [
        payLink,
        [{ text: "✅ បានបង់ប្រាក់", callback_data: `paid:${order.orderNumber}` }],
      ],
    };
  }
  // Keep the pay link after "I've paid" in case it was tapped before actually paying
  const followUp = customerReceiptKeyboard(order, origin);
  return isClosed ? followUp : { inline_keyboard: [payLink, ...followUp.inline_keyboard] };
}

const STATUS_ALERTS: Partial<Record<OrderStatus, (n: string) => string>> = {
  preparing: (n) =>
    `☕ <b>ការកុម្ម៉ង់ #${n} បានបញ្ជាក់!</b>\nបារីស្តាកំពុងរៀបចំភេសជ្ជៈជូនអ្នក។`,
  ready: (n) =>
    `🎉 <b>ការកុម្ម៉ង់ #${n} រួចរាល់ហើយ!</b>\nសូមអញ្ជើញមកទទួលភេសជ្ជៈនៅបញ្ជរ។`,
  cancelled: (n) =>
    `❌ <b>ការកុម្ម៉ង់ #${n} ត្រូវបានលុបចោល។</b>\nសូមទាក់ទងមកកាន់បុគ្គលិកប្រសិនបើមានចម្ងល់។`,
};

/** Short message sent as a reply to the receipt, since edits alone don't notify the customer. */
export function customerStatusText(order: OrderRecord): string | null {
  return STATUS_ALERTS[order.status]?.(order.orderNumber) ?? null;
}
