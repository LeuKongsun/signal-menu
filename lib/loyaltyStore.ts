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
  /** Timestamp in ms when the last stamp was awarded (for deduplication / cooldown). */
  lastStampedAt?: number;
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

/** How many free drinks are waiting to be redeemed. */
export function pendingFreeCount(card: LoyaltyCard): number {
  return card.freeDrinksClaimed - (card.freeDrinksRedeemed ?? 0);
}
