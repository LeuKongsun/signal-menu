/**
 * GET /api/loyalty/stamp?token=xxxx
 *
 * Barista opens this URL by scanning the customer's QR code.
 * → Sends an approval message to every staff chat.
 * → Returns a simple success page (the barista never sees the customer's bot chat).
 */

import { NextRequest, NextResponse } from "next/server";
import { getCardByQrToken } from "@/lib/loyaltyStore";
import { staffStampApprovalText, staffStampKeyboard } from "@/lib/loyaltyMessages";
import { parseTelegramChatIds, sendTelegramText } from "@/lib/telegram";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return new NextResponse("Missing token", { status: 400 });
  }

  const card = await getCardByQrToken(token);
  if (!card) {
    return new NextResponse(
      html("❌ QR មិនត្រឹមត្រូវ", "QR code not found or expired."),
      { headers: { "Content-Type": "text/html; charset=utf-8" }, status: 404 }
    );
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatIds  = parseTelegramChatIds(process.env.TELEGRAM_CHAT_ID);

  if (botToken && chatIds.length > 0) {
    await Promise.all(
      chatIds.map((chatId) =>
        sendTelegramText(
          botToken,
          chatId,
          staffStampApprovalText(card),
          staffStampKeyboard(token)
        )
      )
    );
  }

  return new NextResponse(
    html(
      "✅ ផ្ញើសំណើស្តាម្ព",
      `បានផ្ញើទៅបារីស្តារួចហើយ។ បារីស្តានឹងផ្ដល់ស្តាម្ពដល់ <b>${card.telegramName}</b> ក្នុងពេលបន្តិច។`
    ),
    { headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}

function html(title: string, body: string) {
  return `<!doctype html>
<html lang="km">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title}</title>
  <style>
    body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center;
           min-height: 100vh; margin: 0; background: #fafafa; }
    .card { text-align: center; padding: 2rem; max-width: 360px; }
    h1 { font-size: 2rem; margin-bottom: .5rem; }
    p { color: #555; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="card">
    <h1>${title}</h1>
    <p>${body}</p>
  </div>
</body>
</html>`;
}
