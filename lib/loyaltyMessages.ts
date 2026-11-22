/**
 * Telegram message text and keyboards for the loyalty stamp card.
 */

import type { InlineKeyboard } from "@/lib/telegram";
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
export function loyaltyCardKeyboard(): InlineKeyboard {
  return { inline_keyboard: [] };
}

