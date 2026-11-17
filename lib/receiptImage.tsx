import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { OrderRecord } from "@/lib/orderStore";

const WIDTH = 720;
const INK = "#2A1B14";
const MUTED = "#8A7B70";
const ACCENT = "#E8A33D";
const BRAND = "#8E583C";

// Satori can't shape Khmer (stacked consonants and pre-base vowels come out wrong),
// so the image stays in English; the Khmer font only supplies the ៛ sign.
const fontDir = join(process.cwd(), "assets/fonts");
const fontsPromise = Promise.all([
  readFile(join(fontDir, "PlusJakartaSans-Medium.ttf")),
  readFile(join(fontDir, "PlusJakartaSans-ExtraBold.ttf")),
  readFile(join(fontDir, "KantumruyPro-Bold.ttf")),
]);

function Divider() {
  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        borderTop: "3px dashed #E4DBD3",
        margin: "26px 0",
      }}
    />
  );
}

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        fontSize: strong ? 34 : 24,
        fontWeight: strong ? 800 : 500,
        color: strong ? INK : MUTED,
        marginTop: strong ? 0 : 8,
      }}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

/** Renders the customer's receipt as a PNG for sending through Telegram. */
export async function renderReceiptImage(order: OrderRecord): Promise<Uint8Array> {
  const [jakarta, jakartaBold, riel] = await fontsPromise;

  const placedAt = new Date(order.createdAt);
  const date = placedAt.toLocaleDateString("en-GB", {
    timeZone: "Asia/Phnom_Penh",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const time = placedAt.toLocaleTimeString("en-US", {
    timeZone: "Asia/Phnom_Penh",
    hour: "2-digit",
    minute: "2-digit",
  });

  const height =
    800 + order.items.reduce((sum, item) => sum + (item.size ? 92 : 64), 0);

  const image = new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          padding: 36,
          background: "#F3EDE6",
          fontFamily: "Jakarta, Riel",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: "100%",
            padding: "48px 48px 40px",
            background: "#FFFFFF",
            borderRadius: 28,
            color: INK,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 72,
                height: 72,
                borderRadius: 22,
                background: BRAND,
                color: "#FFFFFF",
                fontSize: 40,
                fontWeight: 800,
              }}
            >
              S
            </div>
            <div style={{ display: "flex", marginTop: 16, fontSize: 40, fontWeight: 800, letterSpacing: 6 }}>
              SIGNAL CAFE
            </div>
            <div style={{ display: "flex", marginTop: 4, fontSize: 22, color: MUTED, letterSpacing: 4 }}>
              RECEIPT
            </div>
          </div>

          <Divider />

          <Row label="Order" value={`#${order.orderNumber}`} />
          <Row label="Date" value={`${date}, ${time}`} />

          <Divider />

          {order.items.map((item, idx) => (
            <div
              key={idx}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 22,
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", maxWidth: 440 }}>
                <div style={{ display: "flex", fontSize: 28, fontWeight: 800 }}>
                  {item.nameEn}
                  <span style={{ marginLeft: 10, color: ACCENT }}>{item.quantity}x</span>
                </div>
                {item.size && (
                  <div style={{ display: "flex", marginTop: 2, fontSize: 22, color: MUTED }}>
                    {item.size}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", fontSize: 28, fontWeight: 800 }}>
                {item.priceRiel.toLocaleString("en-US")}៛
              </div>
            </div>
          ))}

          <Divider />

          <Row label="Total" value={`${order.totalRiel.toLocaleString("en-US")}៛`} strong />
          <Row label="" value={`≈ $${order.totalUsd.toFixed(2)}`} />
          <Row
            label="Payment"
            value={order.paymentMethod === "aba" ? "ABA KHQR" : "Cash at pickup"}
          />

          <Divider />

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              fontSize: 24,
              color: MUTED,
            }}
          >
            <span style={{ fontWeight: 800, color: BRAND }}>Thank you!</span>
            <span>See you again at SIGNAL</span>
          </div>
        </div>
      </div>
    ),
    {
      width: WIDTH,
      height,
      fonts: [
        { name: "Jakarta", data: jakarta, weight: 500, style: "normal" },
        { name: "Jakarta", data: jakartaBold, weight: 800, style: "normal" },
        { name: "Riel", data: riel, weight: 800, style: "normal" },
      ],
    }
  );

  return new Uint8Array(await image.arrayBuffer());
}
