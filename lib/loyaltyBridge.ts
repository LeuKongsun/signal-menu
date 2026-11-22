import { timingSafeEqual } from "node:crypto";

export function validLoyaltyBridgeSecret(request: Request) {
  const expected = process.env.LOYALTY_BRIDGE_SECRET;
  const actual = request.headers.get("x-loyalty-bridge-secret");
  if (!expected || !actual) return false;
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(actual);
  return expectedBuffer.length === actualBuffer.length &&
    timingSafeEqual(expectedBuffer, actualBuffer);
}

export async function syncLoyaltyCardToPos(card: {
  telegramId: number;
  telegramName: string;
  qrToken: string;
}) {
  const url = process.env.POS_LOYALTY_SYNC_URL;
  const secret = process.env.LOYALTY_BRIDGE_SECRET;
  if (!url || !secret) return null;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-loyalty-bridge-secret": secret,
    },
    body: JSON.stringify(card),
    cache: "no-store",
  });
  if (!response.ok) return null;
  return response.json() as Promise<{ card?: unknown }>;
}
