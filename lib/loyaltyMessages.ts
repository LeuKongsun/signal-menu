/**
 * Telegram message text and keyboards for the loyalty stamp card.
 */

import { escapeHtml, type InlineKeyboard } from "@/lib/telegram";
import { STAMPS_FOR_FREE, pendingFreeCount, type LoyaltyCard } from "@/lib/loyaltyStore";

/** Visual stamp row: filled ☕ for earned, empty ⬜ for remaining. */
function stampRow(stamps: number): string {
  const filled = "☕".repeat(stamps);
  const empty  = "⬜".repeat(STAMPS_FOR_FREE - stamps);
  return filled + empty;
}

/** The loyalty card message shown to the customer in their private chat. */
export function loyaltyCardText(card: LoyaltyCard): string {
  const pending = pendingFreeCount(card);
  const qrUrl   = `${process.env.NEXT_PUBLIC_APP_URL || ""}/loyalty/stamp?token=${card.qrToken}`;

  if (pending > 0) {
    return [
      `🎁 <b>SIGNAL Cafe · កាតសន្សំពិន្ទុ</b>`,
      ``,
      `${stampRow(card.stamps)}`,
      ``,
      `🎉 <b>អ្នករួចទទួលភេសជ្ជៈឥតគិតថ្លៃ ${pending} គ្រឿង!</b>`,
      `បង្ហាញកាតនេះទៅបារីស្តា ដើម្បីប្រើប្រាស់។`,
      ``,
      `📊 សរុបត្រា: <b>${card.totalEarned}</b>`,
    ].join("\n");
  }

  return [
    `☕ <b>SIGNAL Cafe · កាតសន្សំពិន្ទុ</b>`,
    ``,
    `${stampRow(card.stamps)} <b>${card.stamps}/${STAMPS_FOR_FREE}</b>`,
    ``,
    card.stamps === 0
      ? `ទទួល 1 ត្រា រៀងរាល់ការកុម្ម៉ង់!`
      : `នៅខ្វះ <b>${STAMPS_FOR_FREE - card.stamps}</b> ត្រាទៀត`,
    ``,
    `📊 សរុបត្រា: <b>${card.totalEarned}</b>  🎁 ឥតគិតថ្លៃ: <b>${card.freeDrinksClaimed}</b>`,
    ``,
    `🔗 QR: <code>${qrUrl}</code>`,
  ].join("\n");
}

/** Inline keyboard for the customer's loyalty card message. */
export function loyaltyCardKeyboard(card: LoyaltyCard): InlineKeyboard {
  const pending = pendingFreeCount(card);
  const rows: InlineKeyboard["inline_keyboard"] = [];
  if (pending > 0) {
    rows.push([{ text: `🎁 ប្រើភេសជ្ជៈឥតគិតថ្លៃ`, callback_data: `loyalty_redeem:${card.telegramId}` }]);
  }
  return { inline_keyboard: rows };
}

/** Message barista sees when approving a stamp (via QR scan). */
export function staffStampApprovalText(card: LoyaltyCard): string {
  return [
    `🎫 <b>សំណើបោះត្រា</b>`,
    ``,
    `👤 ${escapeHtml(card.telegramName)}`,
    `ចំនួនត្រា: <b>${card.stamps}/${STAMPS_FOR_FREE}</b>  ${stampRow(card.stamps)}`,
    ``,
    `✅ បោះ 1 ត្រាជូនអតិថិជននេះ?`,
  ].join("\n");
}

/** Buttons barista sees to approve/reject a stamp. */
export function staffStampKeyboard(qrToken: string): InlineKeyboard {
  return {
    inline_keyboard: [[
      { text: "✅ បោះត្រា", callback_data: `loyalty_stamp_ok:${qrToken}` },
      { text: "❌ បដិសេធ",  callback_data: `loyalty_stamp_no:${qrToken}` },
    ]],
  };
}

/** Confirmation text to barista after stamp was given. */
export function staffStampDoneText(card: LoyaltyCard): string {
  return [
    `✅ <b>បានបោះត្រារួចរាល់!</b>`,
    `👤 ${escapeHtml(card.telegramName)} — ${card.stamps}/${STAMPS_FOR_FREE}`,
    pendingFreeCount(card) > 0 ? `🎁 អតិថិជននេះទទួលភេសជ្ជៈឥតគិតថ្លៃ!` : ``,
  ].filter(Boolean).join("\n");
}

/** Message sent to barista group when customer wants to redeem a free drink. */
export function staffRedeemText(card: LoyaltyCard): string {
  return [
    `🎁 <b>ស្នើប្រើភេសជ្ជៈឥតគិតថ្លៃ</b>`,
    ``,
    `👤 ${escapeHtml(card.telegramName)}`,
    `ភេសជ្ជៈឥតគិតថ្លៃដែលនៅសល់: <b>${pendingFreeCount(card)}</b>`,
    ``,
    `✅ ផ្ដល់ភេសជ្ជៈឥតគិតថ្លៃ 1 គ្រឿង?`,
  ].join("\n");
}

/** Buttons barista sees to approve/reject a free drink redemption. */
export function staffRedeemKeyboard(telegramId: number): InlineKeyboard {
  return {
    inline_keyboard: [[
      { text: "✅ ផ្ដល់ភេសជ្ជៈ", callback_data: `loyalty_redeem_ok:${telegramId}` },
      { text: "❌ បដិសេធ",         callback_data: `loyalty_redeem_no:${telegramId}` },
    ]],
  };
}
