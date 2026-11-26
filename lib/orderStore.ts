import { kvGet, kvSet } from "@/lib/kv";
import type { OrderCopy } from "@/lib/telegram";

export type OrderStatus = "pending" | "confirmed" | "preparing" | "ready" | "completed" | "cancelled";

export function isOrderClosed(status: OrderStatus) {
  return status === "ready" || status === "completed" || status === "cancelled";
}

export function canAdvanceOrderStatus(current: OrderStatus, next: OrderStatus) {
  if (current === next) return true;
  if (current === "completed" || current === "cancelled") return false;
  if (next === "cancelled") return true;

  const rank: Record<OrderStatus, number> = {
    pending: 0,
    confirmed: 1,
    preparing: 2,
    ready: 3,
    completed: 4,
    cancelled: 5,
  };
  return rank[next] >= rank[current];
}

export interface OrderRecord {
  orderNumber: string;
  currency?: "KHR" | "USD";
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
  /** ABA orders: "unpaid" until the customer taps "I've paid" under the QR the bot sent. */
  abaPayment?: "unpaid" | "reported";
  /** The ABA QR message in the customer's chat. */
  paymentMessage?: { messageId: number; isPhoto: boolean };
  /** Current status line on the staff message, so later edits can rebuild it. */
  staffStatusLine?: string;
  /** The order message in each admin/seller chat, so every copy can be updated together. */
  staffCopies?: OrderCopy[];
  /** True once a loyalty stamp has been awarded for this order on pickup (prevents duplicate stamps). */
  loyaltyStamped?: boolean;
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
