/**
 * Loyalty stamp card store.
 *
 * Keys:
 *   loyalty:tg:{telegramId}   → LoyaltyCard
 *   loyalty:qr:{qrToken}      → telegramId (number)
 */

import { kvGet, kvSet } from "@/lib/kv";
import { randomUUID } from "node:crypto";

export const STAMPS_FOR_FREE = 10;

export interface LoyaltyCard {
  telegramId: number;
  telegramName: string;
  stamps: number;           // current stamps toward next free drink (0–STAMPS_FOR_FREE)
  totalEarned: number;      // lifetime stamps collected
  freeDrinksClaimed: number;
  freeDrinksRedeemed: number;
  /** Telegram message ID of the card message in the customer's private chat (edit in-place). */
  cardMessageId?: number;
  /** Unique token for the barista QR code. */
  qrToken: string;
  createdAt: string;
  updatedAt: string;
}

const cardKey = (telegramId: number) => `loyalty:tg:${telegramId}`;
const qrKey   = (token: string)      => `loyalty:qr:${token}`;

/** Fetch a card by Telegram user ID. */
export async function getLoyaltyCard(telegramId: number): Promise<LoyaltyCard | null> {
  return kvGet<LoyaltyCard>(cardKey(telegramId));
}

/** Fetch a card by QR token (used by barista stamp flow). */
export async function getCardByQrToken(token: string): Promise<LoyaltyCard | null> {
  const telegramId = await kvGet<number>(qrKey(token));
  if (telegramId == null) return null;
  return getLoyaltyCard(telegramId);
}

/** Create a new card if one doesn't exist yet. Returns the card (new or existing). */
export async function ensureLoyaltyCard(
  telegramId: number,
  telegramName: string
): Promise<LoyaltyCard> {
  const existing = await getLoyaltyCard(telegramId);
  if (existing) return existing;

  const qrToken = randomUUID();
  const now = new Date().toISOString();
  const card: LoyaltyCard = {
    telegramId,
    telegramName,
    stamps: 0,
    totalEarned: 0,
    freeDrinksClaimed: 0,
    freeDrinksRedeemed: 0,
    qrToken,
    createdAt: now,
    updatedAt: now,
  };

  await Promise.all([
    kvSet(cardKey(telegramId), card),
    kvSet(qrKey(qrToken), telegramId),
  ]);
  return card;
}

/** Save a card (overwrites). Also keeps the QR index in sync if the token changed. */
export async function saveLoyaltyCard(card: LoyaltyCard): Promise<void> {
  card.updatedAt = new Date().toISOString();
  await Promise.all([
    kvSet(cardKey(card.telegramId), card),
    kvSet(qrKey(card.qrToken), card.telegramId),
  ]);
}

/**
 * Add one stamp to the card.
 * When stamps reach STAMPS_FOR_FREE the card's `stamps` resets to 0 and
 * `freeDrinksClaimed` increments so the barista can give a free drink.
 * Returns { card, earnedFree } where earnedFree = true when a free drink was just unlocked.
 */
export async function addStamp(
  telegramId: number,
  telegramName: string
): Promise<{ card: LoyaltyCard; earnedFree: boolean }> {
  const card = await ensureLoyaltyCard(telegramId, telegramName);
  card.stamps += 1;
  card.totalEarned += 1;
  let earnedFree = false;
  if (card.stamps >= STAMPS_FOR_FREE) {
    card.stamps = 0;
    card.freeDrinksClaimed += 1;
    earnedFree = true;
  }
  await saveLoyaltyCard(card);
  return { card, earnedFree };
}

/**
 * Redeem a free drink.  Returns the updated card or null if no free drinks are pending.
 */
export async function redeemFreeDrink(telegramId: number): Promise<LoyaltyCard | null> {
  const card = await getLoyaltyCard(telegramId);
  if (!card) return null;
  const pending = pendingFreeCount(card);
  if (pending <= 0) return null;
  card.freeDrinksRedeemed = (card.freeDrinksRedeemed ?? 0) + 1;
  await saveLoyaltyCard(card);
  return card;
}

/** How many free drinks are waiting to be redeemed. */
export function pendingFreeCount(card: LoyaltyCard): number {
  return card.freeDrinksClaimed - (card.freeDrinksRedeemed ?? 0);
}
