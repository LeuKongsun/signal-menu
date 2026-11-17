import { NextRequest, NextResponse } from "next/server";
import { getOrder } from "@/lib/orderStore";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await params;

  const record = await getOrder(orderId);

  if (!record) {
    // Order not found — could be a cold-start reset or bad ID
    return NextResponse.json(
      { found: false, error: "Order not found" },
      {
        status: 404,
        headers: {
          // Allow browser to cache the 404 briefly to reduce hammering
          "Cache-Control": "no-store",
        },
      }
    );
  }

  return NextResponse.json(
    {
      found: true,
      orderNumber: record.orderNumber,
      customerName: record.customerName,
      status: record.status,
      items: record.items,
      totalRiel: record.totalRiel,
      totalUsd: record.totalUsd,
      paymentMethod: record.paymentMethod,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    },
    {
      headers: {
        // Never cache — always fresh from server
        "Cache-Control": "no-store",
      },
    }
  );
}
