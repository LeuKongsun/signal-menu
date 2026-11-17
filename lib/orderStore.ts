/**
 * In-memory order store shared across all API routes (server-side only).
 *
 * Uses globalThis to survive Next.js hot-reloads in development while keeping
 * a single map instance per Node.js process in production.
 *
 * ⚠️  Resets on every Vercel cold-start / redeploy — that is intentional and
 *    acceptable for a physical cafe kiosk where orders are fulfilled in minutes.
 */

export type OrderStatus = "pending" | "confirmed" | "preparing" | "ready" | "cancelled";

export interface OrderRecord {
  orderNumber: string;
  customerName: string;
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
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

type OrderStore = Map<string, OrderRecord>;

const globalForOrders = globalThis as typeof globalThis & {
  __signalOrderStore?: OrderStore;
};

function orderStore(): OrderStore {
  if (!globalForOrders.__signalOrderStore) {
    globalForOrders.__signalOrderStore = new Map();
  }
  return globalForOrders.__signalOrderStore;
}

export function createOrder(record: OrderRecord): void {
  orderStore().set(record.orderNumber, record);
}

export function getOrder(orderNumber: string): OrderRecord | undefined {
  return orderStore().get(orderNumber);
}

export function updateOrderStatus(orderNumber: string, status: OrderStatus): boolean {
  const record = orderStore().get(orderNumber);
  if (!record) return false;
  record.status = status;
  record.updatedAt = new Date().toISOString();
  return true;
}
