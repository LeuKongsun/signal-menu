import "server-only";

import { createHmac } from "node:crypto";
import { Redis } from "@upstash/redis";
import { Realtime } from "@upstash/realtime";
import { realtimeSchema } from "./realtime-schema";
import { loyaltyStoreChannel } from "./realtime-channels";

type RealtimeInstance = ReturnType<typeof createRealtime>;
let realtime: RealtimeInstance | null = null;

function createRealtime() {
  const config = redisConfig();
  if (!config) throw new Error("Upstash Realtime is not configured");
  return new Realtime({
    schema: realtimeSchema,
    redis: new Redis(config),
    history: { maxLength: 20, expireAfterSecs: 86_400 },
  });
}

function redisConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  return url && token ? { url, token } : null;
}

export function isRealtimeConfigured() {
  return Boolean(redisConfig());
}

export function getRealtime() {
  realtime ??= createRealtime();
  return realtime;
}

export function orderChannel(orderNumber: string) {
  const secret = process.env.ONLINE_ORDER_BRIDGE_SECRET;
  if (!secret) return null;
  const digest = createHmac("sha256", secret).update(orderNumber).digest("base64url");
  return `signal:order:${orderNumber}:${digest}`;
}

export async function publishLoyaltyRegistration(card: {
  telegramId: number;
  telegramName: string;
  qrToken: string;
}) {
  const storeId = process.env.LOYALTY_STORE_ID;
  if (!storeId) return;
  await getRealtime().channel(loyaltyStoreChannel(storeId)).emit("loyalty.registered", {
    telegramId: String(card.telegramId),
    telegramName: card.telegramName,
    qrToken: card.qrToken,
  });
}
