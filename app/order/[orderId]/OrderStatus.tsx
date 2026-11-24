"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useTelegramWebApp } from "@/lib/useTelegramWebApp";
import { useRealtime } from "@/lib/realtime-client";

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
  abaPayment?: "unpaid" | "reported";
  createdAt: string;
  updatedAt: string;
  realtimeChannel?: string | null;
}

const STEPS = ["បានទទួល", "កំពុងធ្វើ", "រួចរាល់"];

const STATUS_VIEW: Record<
  OrderStatus,
  { emoji: string; title: string; titleKh: string; hint: string; step: number }
> = {
  pending: {
    emoji: "🧾",
    title: "បានទទួលការកុម្ម៉ង់",
    titleKh: "រង់ចាំបារីស្តាពិនិត្យ",
    hint: "បារីស្តានឹងចាប់ផ្ដើមធ្វើក្នុងពេលបន្តិចទៀត",
    step: 0,
  },
  confirmed: {
    emoji: "☕",
    title: "កំពុងធ្វើភេសជ្ជៈ",
    titleKh: "បារីស្តាកំពុងរៀបចំជូនអ្នក",
    hint: "យើងនឹងជូនដំណឹងពេលរួចរាល់",
    step: 1,
  },
  preparing: {
    emoji: "☕",
    title: "កំពុងធ្វើភេសជ្ជៈ",
    titleKh: "បារីស្តាកំពុងរៀបចំជូនអ្នក",
    hint: "យើងនឹងជូនដំណឹងពេលរួចរាល់",
    step: 1,
  },
  ready: {
    emoji: "🎉",
    title: "រួចរាល់ហើយ!",
    titleKh: "សូមអញ្ជើញមកទទួលនៅបញ្ជរ",
    hint: "ភេសជ្ជៈរបស់អ្នករួចរាល់ហើយ",
    step: 2,
  },
  cancelled: {
    emoji: "❌",
    title: "បានលុបចោល",
    titleKh: "ការកុម្ម៉ង់ត្រូវបានលុបចោល",
    hint: "សូមសាកសួរបារីស្តាប្រសិនបើមានចម្ងល់",
    step: -1,
  },
};

export function OrderStatusLoading() {
  return (
    <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-[#E8A33D] animate-spin" />
    </div>
  );
}

export function OrderStatus() {
  const params = useParams();
  const orderId = (params.orderId as string).toUpperCase();
  const tg = useTelegramWebApp();

  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

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
      setNotFound(false);
      setLoading(false);
    } catch {
      // Network error — keep showing last known state
      setLoading(false);
    }
  }, []);

  // Initial fetch: setTimeout(0) ensures setState runs in async callback, not synchronously in effect body
  useEffect(() => {
    const t = setTimeout(fetchStatus, 0);
    return () => clearTimeout(t);
  }, [fetchStatus]);

  useRealtime({
    channels: order?.realtimeChannel ? [order.realtimeChannel] : [],
    events: ["order.updated"],
    enabled: Boolean(order?.realtimeChannel),
    onData: () => void fetchStatus(),
  });

  useEffect(() => {
    if (!tg) return;
    const button = tg.MainButton;
    const close = () => tg.close();
    button.setParams({
      text: "ត្រឡប់ទៅឆាត",
      color: "#8E583C",
      text_color: "#FFFFFF",
      is_active: true,
      is_visible: true,
    });
    button.onClick(close);
    return () => {
      button.offClick(close);
      button.hide();
    };
  }, [tg]);

  if (loading) {
    return <OrderStatusLoading />;
  }

  if (notFound || !order) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center p-6">
        <div className="text-center max-w-xs font-khmer">
          <div className="text-5xl mb-3">🤔</div>
          <h2 className="text-lg font-extrabold text-stone-900">រកមិនឃើញការកុម្ម៉ង់</h2>
          <p className="mt-1 text-sm text-stone-500">
            មិនមានការកុម្ម៉ង់លេខ <strong className="text-stone-800 font-sans">{orderId}</strong> ទេ។ សូមសាកសួរបារីស្តា។
          </p>
          <Link
            href="/"
            className="mt-5 inline-flex h-10 items-center px-5 rounded-lg bg-[#E8A33D] text-white text-xs font-extrabold tracking-wide"
          >
            ត្រឡប់ទៅម៉ឺនុយ
          </Link>
        </div>
      </div>
    );
  }

  const view = STATUS_VIEW[order.status];
  const isCancelled = order.status === "cancelled";
  const isClosed = isCancelled || order.status === "ready";

  return (
    <div className="min-h-screen bg-[#FAF8F5] pb-10">
      <div className="max-w-md mx-auto px-5">
        <div className="pt-10 pb-8 text-center font-khmer">
          <div key={order.status} className="badge-pop text-6xl">
            {view.emoji}
          </div>
          <h1
            className={`mt-3 text-xl font-extrabold ${
              isCancelled ? "text-[#D9534F]" : "text-stone-900"
            }`}
          >
            {view.title}
          </h1>
          <p className="mt-1 text-xs text-stone-500">{view.hint}</p>

          {!isCancelled && (
            <div className="mt-6 grid grid-cols-3 gap-1.5 font-khmer">
              {STEPS.map((step, i) => {
                const done = i <= view.step;
                const active = i === view.step && !isClosed;
                return (
                  <div key={step}>
                    <div
                      className={`h-1.5 rounded-full ${
                        done ? "bg-[#E8A33D]" : "bg-stone-200"
                      } ${active ? "animate-pulse" : ""}`}
                    />
                    <p
                      className={`mt-1.5 text-[11px] font-bold ${
                        done ? "text-stone-800" : "text-stone-400"
                      }`}
                    >
                      {step}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl px-4 py-4 shadow-xs">
          <div className="flex items-center justify-between font-khmer">
            <h2 className="text-sm font-extrabold text-stone-900">
              ភេសជ្ជៈដែលបានកុម្ម៉ង់
            </h2>
            <span className="text-xs font-bold text-stone-400 font-sans">#{order.orderNumber}</span>
          </div>

          <ul className="mt-3 space-y-3">
            {order.items.map((item, idx) => (
              <li key={idx} className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-stone-900 font-khmer">
                    {item.nameKh || item.nameEn}{" "}
                    <span className="text-[#E8A33D] font-sans">{item.quantity}x</span>
                  </p>
                  <p className="text-xs text-stone-400 truncate">
                    <span>{item.nameEn}</span>
                    {item.size ? ` · ${item.size === "regular" ? "ធម្មតា" : item.size === "large" ? "ធំ" : item.size}` : ""}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-semibold text-stone-800">
                  {item.priceRiel.toLocaleString("en-US")}៛
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-4 pt-3 border-t border-stone-100 space-y-1 font-khmer">
            <div className="flex justify-between text-sm font-extrabold text-stone-900">
              <span>សរុប</span>
              <span className="font-sans font-bold">
                {order.totalRiel.toLocaleString("en-US")}៛{" "}
                <span className="font-semibold text-stone-400">
                  (${order.totalUsd.toFixed(2)})
                </span>
              </span>
            </div>
            <div className="flex justify-between text-xs text-stone-500">
              <span>ការទូទាត់</span>
              <span className="font-medium">
                {order.paymentMethod === "cash"
                  ? "ទូទាត់ផ្ទាល់ (សាច់ប្រាក់)"
                  : order.abaPayment === "unpaid"
                    ? "ABA KHQR (មិនទាន់បង់)"
                    : order.abaPayment === "reported"
                      ? "ABA KHQR (បានបង់ប្រាក់)"
                      : "ABA KHQR"}
              </span>
            </div>
          </div>
        </div>

        {!isClosed && (
          <p className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-stone-400 font-khmer">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            អាប់ដេតស្វ័យប្រវត្តិ
          </p>
        )}

        {!tg && isClosed && (
          <Link
            href="/"
            className="mt-6 flex h-11 items-center justify-center rounded-xl bg-[#E8A33D] text-white text-sm font-extrabold tracking-wide font-khmer"
          >
            កុម្ម៉ង់ម្ដងទៀត
          </Link>
        )}
      </div>
    </div>
  );
}
