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
  /** The receipt message in the customer's chat, kept up to date as the status changes. */
  customerReceipt?: { messageId: number; isPhoto: boolean };
  /** ABA proof: uploaded at checkout, or sent later in the bot chat. */
  paymentProof?: "attached" | "awaiting" | "received";
  /** Current status line on the staff message, so later edits can rebuild it. */
  staffStatusLine?: string;
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

const awaitingPaymentKey = (customerId: number) => `awaiting-payment:${customerId}`;

/** Remembers which order a customer's next payment screenshot belongs to. */
export async function markAwaitingPayment(customerId: number, orderNumber: string) {
  await kvSet(awaitingPaymentKey(customerId), orderNumber, { ttlSeconds: 60 * 60 * 24 });
}

/** The customer's latest open ABA order that is waiting for a screenshot sent in chat. */
export async function getAwaitingPaymentOrder(customerId: number): Promise<OrderRecord | null> {
  const orderNumber = await kvGet<string>(awaitingPaymentKey(customerId));
  if (!orderNumber) return null;
  const record = await getOrder(orderNumber);
  if (!record || record.status === "ready" || record.status === "cancelled") return null;
  return record;
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
