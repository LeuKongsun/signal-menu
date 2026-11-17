import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { MENU_ITEMS } from "@/data/menu";
import type { OrderRecord } from "@/lib/orderStore";
import { IMAGE_FONT_FAMILY, loadImageFonts } from "@/lib/imageFonts";

const WIDTH = 640;
const HEIGHT = 360;

// The animation slot on the "making" card; must match the left column's layout below.
const SLOT_SIZE = 220;
const SLOT_LEFT = 44;
const SLOT_TOP = 70;
const SLOT_RADIUS = 28;
const MAKING_GIF = "making-coffee.gif";

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

export type StatusCard = {
  bytes: Uint8Array;
  type: "image/jpeg" | "image/gif";
  extension: "jpg" | "gif";
};

const readPublic = (path: string) => readFile(join(process.cwd(), "public", path));

async function drinkDataUrl(publicPath: string) {
  const resized = await sharp(await readPublic(publicPath)).resize({ height: 300 }).png().toBuffer();
  return `data:image/png;base64,${resized.toString("base64")}`;
}

function renderCard(
  order: OrderRecord,
  status: StatusCardStatus,
  photo: string | null,
  fonts: Awaited<ReturnType<typeof loadImageFonts>>
) {
  const card = CARDS[status];
  const top = [...order.items].sort((a, b) => b.quantity - a.quantity)[0];
  const otherCount = order.items.reduce((sum, i) => sum + i.quantity, 0) - top.quantity;
  const drinkLine = `${top.nameEn}${top.size ? ` (${top.size})` : ""} ×${top.quantity}`;

  return new ImageResponse(
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
          {photo ? (
            <>
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
            </>
          ) : (
            <div
              style={{
                width: SLOT_SIZE,
                height: SLOT_SIZE,
                borderRadius: SLOT_RADIUS,
                background: "#FFFFFF",
              }}
            />
          )}
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
}

/** Places every frame of the "making" animation into the card's slot. */
async function animateMakingCard(base: Buffer): Promise<Buffer> {
  const gif = await readPublic(MAKING_GIF);
  const { pages = 1, delay, loop } = await sharp(gif).metadata();
  const mask = Buffer.from(
    `<svg width="${SLOT_SIZE}" height="${SLOT_SIZE}"><rect width="${SLOT_SIZE}" height="${SLOT_SIZE}" rx="${SLOT_RADIUS}" fill="#fff"/></svg>`
  );

  const frames = await Promise.all(
    Array.from({ length: pages }, async (_, page) => {
      const frame = await sharp(gif, { page })
        .resize(SLOT_SIZE, SLOT_SIZE)
        .composite([{ input: mask, blend: "dest-in" }])
        .png()
        .toBuffer();
      return sharp(base)
        .composite([{ input: frame, left: SLOT_LEFT, top: SLOT_TOP }])
        .png()
        .toBuffer();
    })
  );

  return sharp(frames, { join: { animated: true } })
    .gif({ delay, loop: loop ?? 0, effort: 7, colours: 128 })
    .toBuffer();
}

/**
 * Picture for the "making" (animated GIF) and "ready" (JPEG with the drink photo) updates.
 * Returns null when the order's drink has no menu photo.
 */
export async function renderStatusCard(
  order: OrderRecord,
  status: StatusCardStatus
): Promise<StatusCard | null> {
  if (order.items.length === 0) return null;
  const fonts = await loadImageFonts();

  if (status === "preparing") {
    const base = Buffer.from(await renderCard(order, status, null, fonts).arrayBuffer());
    const gif = await animateMakingCard(base);
    return { bytes: new Uint8Array(gif), type: "image/gif", extension: "gif" };
  }

  const top = [...order.items].sort((a, b) => b.quantity - a.quantity)[0];
  const menuItem = MENU_ITEMS.find((m) => m.nameEn === top.nameEn);
  if (!menuItem) return null;

  const png = renderCard(order, status, await drinkDataUrl(menuItem.image), fonts);
  const jpeg = await sharp(Buffer.from(await png.arrayBuffer()))
    .jpeg({ quality: 78, mozjpeg: true })
    .toBuffer();
  return { bytes: new Uint8Array(jpeg), type: "image/jpeg", extension: "jpg" };
}
