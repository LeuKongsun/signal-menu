import { Suspense } from "react";
import { OrderStatus, OrderStatusLoading } from "./OrderStatus";

export default function OrderStatusPage() {
  return (
    <Suspense fallback={<OrderStatusLoading />}>
      <OrderStatus />
    </Suspense>
  );
}
