"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Coffee, Clock, XCircle, Loader2, ChevronLeft } from "lucide-react";

type OrderStatus = "pending" | "confirmed" | "preparing" | "ready" | "cancelled";

interface OrderData {
  found: boolean;
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
  createdAt: string;
  updatedAt: string;
}

// --- Status config ---
const STATUS_STEPS: { key: OrderStatus; label: string; labelKh: string; icon: string }[] = [
  { key: "pending", label: "Order Received", labelKh: "ទទួលបានការបញ្ជាទិញ", icon: "📋" },
  { key: "preparing", label: "Preparing Your Drinks", labelKh: "កំពុងត្រៀម", icon: "☕" },
  { key: "ready", label: "Ready for Pickup!", labelKh: "រួចរាល់! សូមមករับ", icon: "🎉" },
];

function getStepIndex(status: OrderStatus): number {
  if (status === "cancelled") return -1;
  const idx = STATUS_STEPS.findIndex((s) => s.key === status);
  return idx === -1 ? 0 : idx;
}

// Pulse animation for active step
const POLL_INTERVAL_MS = 3000;

export function OrderStatusLoading() {
  return (
    <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center">
      <div className="text-center space-y-3">
        <Loader2 className="w-10 h-10 text-[#8E583C] animate-spin mx-auto" />
        <p className="text-stone-500 text-sm font-medium">Loading order status…</p>
      </div>
    </div>
  );
}

export function OrderStatus() {
  const params = useParams();
  const orderId = (params.orderId as string).toUpperCase();

  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Ref so fetchStatus stays stable (no orderId in dep array)
  const orderIdRef = useRef(orderId);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/order-status/${orderIdRef.current}`, { cache: "no-store" });
      if (res.status === 404) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      const data: OrderData = await res.json();
      if (!data.found) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setOrder(data);
      setLastUpdated(new Date());
      setNotFound(false);
      setLoading(false);
    } catch {
      // Network error — keep showing last known state
      setLoading(false);
    }
  }, []); // stable — reads orderId via ref

  // Initial fetch: setTimeout(0) ensures setState runs in async callback, not synchronously in effect body
  useEffect(() => {
    const t = setTimeout(fetchStatus, 0);
    return () => clearTimeout(t);
  }, [fetchStatus]);

  // Polling — stop when terminal state reached
  useEffect(() => {
    const isTerminal = order?.status === "ready" || order?.status === "cancelled";
    if (isTerminal) return;

    const timer = setInterval(fetchStatus, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [fetchStatus, order?.status]);

  // ---- Render: Loading ----
  if (loading) {
    return <OrderStatusLoading />;
  }

  // ---- Render: Not found ----
  if (notFound) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center p-6">
        <div className="text-center space-y-4 max-w-xs">
          <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center mx-auto text-3xl">
            🤔
          </div>
          <h2 className="text-lg font-black text-stone-900">Order not found</h2>
          <p className="text-sm text-stone-500">
            We couldn&apos;t find order <strong className="text-[#8E583C]">{orderId}</strong>.
            This can happen if the server restarted. Please check with the barista.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#8E583C] hover:underline"
          >
            <ChevronLeft className="w-4 h-4" /> Back to Menu
          </Link>
        </div>
      </div>
    );
  }

  if (!order) return null;

  const isCancelled = order.status === "cancelled";
  const isReady = order.status === "ready";
  const activeStep = getStepIndex(order.status);

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      {/* Top bar */}
      <div className="bg-white border-b border-stone-200 px-4 py-3 flex items-center gap-3">
        <Link href="/" className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black tracking-widest uppercase text-[#8E583C]">
              SIGNAL CAFE
            </span>
          </div>
          <p className="text-xs text-stone-500">Order Tracking</p>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-8 space-y-6">

        {/* Order number badge */}
        <div className="text-center space-y-1">
          <span className="inline-block px-4 py-1.5 rounded-full text-xs font-black bg-white border border-stone-200 text-[#8E583C] tracking-widest uppercase shadow-sm">
            {order.orderNumber}
          </span>
          <p className="text-sm text-stone-600">
            Hi <strong>{order.customerName}</strong>! 👋
          </p>
        </div>

        {/* Cancelled state */}
        {isCancelled ? (
          <div className="bg-white rounded-3xl border border-rose-200 p-6 text-center space-y-3 shadow-sm">
            <div className="w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center mx-auto">
              <XCircle className="w-9 h-9 text-rose-500" />
            </div>
            <div>
              <h2 className="text-lg font-black text-stone-900">Order Cancelled</h2>
              <p className="text-sm text-stone-500 font-khmer mt-1">ការបញ្ជាទិញត្រូវបានលុប</p>
              <p className="text-xs text-stone-400 mt-2">
                Please speak to the barista if you have questions.
              </p>
            </div>
            <Link
              href="/"
              className="inline-block w-full py-3 rounded-2xl bg-[#8E583C] text-white font-bold text-sm hover:bg-[#73432B] transition-all shadow-md shadow-[#8E583C]/20"
            >
              Back to Menu
            </Link>
          </div>
        ) : isReady ? (
          /* Ready state — big celebration */
          <div className="bg-white rounded-3xl border border-emerald-200 p-6 text-center space-y-3 shadow-sm animate-in zoom-in duration-300">
            <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto text-4xl">
              🎉
            </div>
            <div>
              <h2 className="text-xl font-black text-emerald-700">Ready for Pickup!</h2>
              <p className="text-base font-khmer text-emerald-600 mt-1">
                រួចរាល់! សូមមករទទួល!
              </p>
              <p className="text-sm text-stone-500 mt-2">
                Your drinks are ready. Please collect them from the counter!
              </p>
            </div>
            <div className="pt-2">
              <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto" />
            </div>
          </div>
        ) : (
          /* Progress steps */
          <div className="bg-white rounded-3xl border border-stone-200 p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-stone-700 text-center">Order Progress</h2>

            <div className="space-y-3">
              {STATUS_STEPS.map((step, idx) => {
                const isDone = idx < activeStep;
                const isActive = idx === activeStep;
                const isUpcoming = idx > activeStep;
                return (
                  <div key={step.key} className="flex items-center gap-3">
                    {/* Circle indicator */}
                    <div
                      className={[
                        "w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0 transition-all duration-500",
                        isDone
                          ? "bg-emerald-100 text-emerald-600"
                          : isActive
                          ? "bg-[#8E583C]/10 text-[#8E583C] ring-2 ring-[#8E583C]/30 animate-pulse"
                          : "bg-stone-100 text-stone-300",
                      ].join(" ")}
                    >
                      {isDone ? "✓" : step.icon}
                    </div>

                    {/* Label */}
                    <div className="flex-1 min-w-0">
                      <p
                        className={[
                          "text-sm font-semibold transition-colors",
                          isDone
                            ? "text-emerald-600 line-through decoration-emerald-400 decoration-1"
                            : isActive
                            ? "text-stone-900"
                            : "text-stone-300",
                        ].join(" ")}
                      >
                        {step.label}
                      </p>
                      <p
                        className={[
                          "text-xs font-khmer",
                          isDone
                            ? "text-emerald-500"
                            : isActive
                            ? "text-stone-500"
                            : "text-stone-300",
                        ].join(" ")}
                      >
                        {step.labelKh}
                      </p>
                    </div>

                    {/* Active spinner */}
                    {isActive && (
                      <Loader2 className="w-4 h-4 text-[#8E583C] animate-spin shrink-0" />
                    )}
                    {isDone && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    )}
                    {isUpcoming && (
                      <Clock className="w-4 h-4 text-stone-200 shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Polling indicator */}
            <p className="text-center text-[10px] text-stone-400 pt-1">
              Auto-refreshing every {POLL_INTERVAL_MS / 1000}s •{" "}
              Last updated {lastUpdated.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </p>
          </div>
        )}

        {/* Order summary */}
        <div className="bg-white rounded-3xl border border-stone-200 p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <Coffee className="w-4 h-4 text-[#8E583C]" />
            <h3 className="text-sm font-bold text-stone-700">Your Order</h3>
          </div>

          <div className="space-y-2">
            {order.items.map((item, idx) => (
              <div key={idx} className="flex items-start justify-between gap-2 text-xs">
                <div className="min-w-0">
                  <span className="font-semibold text-stone-900">
                    {item.quantity}× {item.nameEn}
                    {item.size ? <span className="text-stone-400"> ({item.size})</span> : null}
                  </span>
                  <p className="text-stone-400 font-khmer truncate">{item.nameKh}</p>
                </div>
                <span className="text-stone-500 shrink-0 font-medium">
                  {(item.priceRiel * item.quantity).toLocaleString()}៛
                </span>
              </div>
            ))}
          </div>

          <div className="pt-1 border-t border-stone-100 flex justify-between text-sm font-black">
            <span className="text-stone-700">Total</span>
            <span className="text-[#8E583C]">
              {order.totalRiel.toLocaleString()}៛{" "}
              <span className="font-normal text-stone-400 text-xs">
                (≈${order.totalUsd.toFixed(2)})
              </span>
            </span>
          </div>

          <div className="text-xs text-stone-400 flex justify-between">
            <span>Payment</span>
            <span className="font-medium">
              {order.paymentMethod === "aba" ? "ABA KHQR" : "Cash on Pickup"}
            </span>
          </div>
        </div>

        {/* Footer tip */}
        {!isReady && !isCancelled && (
          <p className="text-center text-xs text-stone-400 font-khmer pb-4">
            🔖 រក្សាទំព័រនេះបើកទុក ឬបញ្ចូល URL ម្ដងទៀតដើម្បីតាមដានការបញ្ជាទិញ
            <br />
            <span className="not-italic text-[10px]">(Keep this page open to track your order)</span>
          </p>
        )}
      </div>
    </div>
  );
}
