/**
 * GET /api/loyalty/stamp?token=xxxx
 *
 * Barista opens this URL by scanning the customer's QR code.
 * → Sends an approval message to every staff chat.
 * → Returns a simple success page (the barista never sees the customer's bot chat).
 */

import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  void req;
  return new NextResponse(
    html("🎫 Loyalty stamp", "This QR is read by the staff POS app. A public link cannot award a stamp."),
    { headers: { "Content-Type": "text/html; charset=utf-8" }, status: 410 }
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
