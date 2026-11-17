import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { MENU_ITEMS } from "@/data/menu";
import type { OrderRecord } from "@/lib/orderStore";
import { IMAGE_FONT_FAMILY, loadImageFonts } from "@/lib/imageFonts";

const WIDTH = 640;
const HEIGHT = 360;

const CARDS = {
  preparing: {
    label: "MAKING",
    title: "We're making your drinks",
    background: "#FFF3E0",
    halo: "#FBDDB0",
    accent: "#D98A1E",
  },
  ready: {
    label: "READY",
    title: "Your drinks are ready!",
    background: "#E6F5EA",
    halo: "#BFE6C9",
    accent: "#2F9E55",
  },
} as const;

export type StatusCardStatus = keyof typeof CARDS;

/** The drink the order has most of stands in for the whole order. */
function featuredDrink(order: OrderRecord) {
  const top = [...order.items].sort((a, b) => b.quantity - a.quantity)[0];
  if (!top) return null;
  const menuItem = MENU_ITEMS.find((m) => m.nameEn === top.nameEn);
  return menuItem ? { item: top, image: menuItem.image } : null;
}

async function drinkDataUrl(publicPath: string) {
  const source = await readFile(join(process.cwd(), "public", publicPath));
  const resized = await sharp(source).resize({ height: 300 }).png().toBuffer();
  return `data:image/png;base64,${resized.toString("base64")}`;
}

/** A small JPEG for the "making" and "ready" updates, or null if the drink has no photo. */
export async function renderStatusCard(
  order: OrderRecord,
  status: StatusCardStatus
): Promise<Uint8Array | null> {
  const drink = featuredDrink(order);
  if (!drink) return null;

  const card = CARDS[status];
  const [fonts, photo] = await Promise.all([loadImageFonts(), drinkDataUrl(drink.image)]);

  const otherCount = order.items.reduce((sum, i) => sum + i.quantity, 0) - drink.item.quantity;
  const drinkLine = `${drink.item.nameEn}${drink.item.size ? ` (${drink.item.size})` : ""} ×${drink.item.quantity}`;

  const png = new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          alignItems: "center",
          padding: "0 40px 0 24px",
          background: card.background,
          fontFamily: IMAGE_FONT_FAMILY,
          color: "#2A1B14",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 260,
            height: 300,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              position: "absolute",
              width: 220,
              height: 220,
              borderRadius: 999,
              background: card.halo,
            }}
          />
          <img src={photo} height={280} alt="" style={{ objectFit: "contain" }} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", marginLeft: 16, flex: 1 }}>
          <div
            style={{
              display: "flex",
              alignSelf: "flex-start",
              padding: "6px 14px",
              borderRadius: 999,
              background: card.accent,
              color: "#FFFFFF",
              fontSize: 18,
              fontWeight: 800,
              letterSpacing: 3,
            }}
          >
            {card.label}
          </div>
          <div style={{ display: "flex", marginTop: 14, fontSize: 36, fontWeight: 800, lineHeight: 1.15 }}>
            {card.title}
          </div>
          <div style={{ display: "flex", marginTop: 12, fontSize: 22, fontWeight: 800 }}>
            {drinkLine}
          </div>
          {otherCount > 0 && (
            <div style={{ display: "flex", marginTop: 2, fontSize: 20, color: "#8A7B70" }}>
              {`+ ${otherCount} more ${otherCount === 1 ? "drink" : "drinks"}`}
            </div>
          )}
          <div style={{ display: "flex", marginTop: 22, fontSize: 18, color: "#8A7B70", letterSpacing: 1 }}>
            {`SIGNAL CAFE · #${order.orderNumber}`}
          </div>
        </div>
      </div>
    ),
    { width: WIDTH, height: HEIGHT, fonts }
  );

  const jpeg = await sharp(Buffer.from(await png.arrayBuffer()))
    .jpeg({ quality: 78, mozjpeg: true })
    .toBuffer();
  return new Uint8Array(jpeg);
}
