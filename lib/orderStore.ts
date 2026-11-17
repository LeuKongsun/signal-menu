import { kvGet, kvSet } from "@/lib/kv";
import type { OrderCopy } from "@/lib/telegram";

export type OrderStatus = "pending" | "confirmed" | "preparing" | "ready" | "cancelled";

export interface OrderRecord {
  orderNumber: string;
  customerName: string;
  customerPhone?: string;
  customerNotes?: string;
  status: OrderStatus;
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
  paymentMethod: "aba" | "cash";
  /** Telegram user who ordered through the Mini App; the bot messages them on status changes. */
  customerTelegram?: { id: number; name: string; username?: string };
  /** The order message in each admin/seller chat, so every copy can be updated together. */
  staffCopies?: OrderCopy[];
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

const ORDER_TTL_SECONDS = 60 * 60 * 24 * 14;

const orderKey = (orderNumber: string) => `order:${orderNumber.toUpperCase()}`;

/** Returns false if an order with this number already exists. */
export async function createOrder(record: OrderRecord): Promise<boolean> {
  return kvSet(orderKey(record.orderNumber), record, {
    ttlSeconds: ORDER_TTL_SECONDS,
    onlyIfNew: true,
  });
}

export async function getOrder(orderNumber: string): Promise<OrderRecord | null> {
  return kvGet<OrderRecord>(orderKey(orderNumber));
}

export async function saveOrder(record: OrderRecord): Promise<void> {
  await kvSet(orderKey(record.orderNumber), record, {
    ttlSeconds: ORDER_TTL_SECONDS,
  });
}

export async function updateOrderStatus(
  orderNumber: string,
  status: OrderStatus
): Promise<OrderRecord | null> {
  const record = await getOrder(orderNumber);
  if (!record) return null;
  record.status = status;
  record.updatedAt = new Date().toISOString();
  await saveOrder(record);
  return record;
}
