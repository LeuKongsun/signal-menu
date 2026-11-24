import { timingSafeEqual } from "node:crypto";

export function validOnlineOrderSecret(request: Request) {
  const expected = process.env.ONLINE_ORDER_BRIDGE_SECRET;
  const actual = request.headers.get("x-online-order-secret");
  if (!expected || !actual) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(actual);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function syncOnlineOrderToPos(order: {
  orderNumber: string;
  idempotencyKey: string;
  customerName: string;
  customerPhone?: string;
  customerNotes?: string;
  paymentMethod: "cash" | "aba";
  paymentStatus?: "unpaid" | "reported";
  items: Array<{
    nameKh: string;
    nameEn: string;
    size?: string;
    quantity: number;
    priceRiel: number;
    priceUsd: number;
  }>;
  totalRiel: number;
  totalUsd: number;
  customerTelegramId?: string;
}) {
  if (process.env.NEXT_PUBLIC_ONLINE_ORDERING_ENABLED !== "true") return null;
  const url = process.env.POS_ONLINE_ORDER_SYNC_URL;
  const secret = process.env.ONLINE_ORDER_BRIDGE_SECRET;
  if (!url || !secret) throw new Error("POS online-order bridge is not configured");
  let response: Response | null = null;
  let lastError: unknown = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-online-order-secret": secret,
        },
        body: JSON.stringify(order),
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      });
      if (response.ok) break;
      lastError = new Error(`POS online-order sync returned ${response.status}`);
    } catch (error) {
      lastError = error;
    }
  }
  if (!response?.ok) {
    if (lastError instanceof Error) throw lastError;
    throw new Error("POS online-order sync failed");
  }
  return response.json();
}
