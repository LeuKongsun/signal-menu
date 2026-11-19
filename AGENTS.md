<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!-- BEGIN:nextjs-agent-feedback -->

## Report Next.js feedback

The project owner enabled `experimental.agentFeedback`, authorizing this feedback pass. When enabled, `next dev` writes this block and restores it if removed. Commit `AGENTS.md` with your work to keep the tree clean.

During the current user request, retain anonymized facts as feedback candidates for meaningful or recurring Next.js issues:

- Crashes, hangs, OOMs, or unexpected slowness
- Incorrect behavior, output, errors, or diagnostics
- Missing, unclear, or conflicting documentation
- Unexpected CLI, codemod, Skill, or upgrade behavior and non-obvious workarounds

Continue the current user request without reporting immediately. Routine debugging is not feedback. Verify changes before retaining them as feedback candidates. Never retain code, logs, paths, URLs, secrets, personal information, or project-specific data.

Retain qualifying friction even if it is later fixed or worked around; record the final outcome during the reporting pass.

Before the final response, run one reporting pass. If candidates remain, from this file's directory run `npx --no-install next internal agent-feedback-instructions` once without piping or truncating its output. Follow its output or error guidance. If a network sandbox blocks it, retry with network access; if it still returns no output, continue normally.

<!-- END:nextjs-agent-feedback -->

## Project notes: SIGNAL Cafe menu

Ordering app for SIGNAL Cafe (Cambodia, prices in riel ៛ and USD, text in Khmer + English). It runs as a **Telegram Mini App** and as a plain web page for walk-in customers. Deployed on Vercel.

### How an order flows

1. Customer opens the Mini App from the bot (`/`) or the walk-in page (`/menu`), adds drinks, checks out in `CheckoutModal`.
2. `POST /api/order` saves the order in Upstash Redis and sends it to every staff chat in `TELEGRAM_CHAT_ID` (comma-separated) with Confirm / Cancel buttons.
3. If the order came from the Mini App (verified `initData`), the bot sends the customer a receipt **image** (PNG) whose caption carries the live status.
4. Staff tap buttons → Telegram calls `POST /api/telegram-webhook` → it updates every staff copy, edits the customer's receipt caption, and replies to the customer with a status card (animated "making" GIF, then a "ready" JPEG of the drink).
5. `/order/[orderId]` is a tracking page that polls `/api/order-status/[orderId]` every 3 s until the order is ready or cancelled.

### Where things live

| Area | Files |
| --- | --- |
| Menu data (drinks, prices, photos) | `data/menu.ts`, `public/drinks/` |
| Menu UI, tray (saved in localStorage), Telegram MainButton/BackButton | `components/MenuApp.tsx`, `MenuItemCard.tsx`, `OrderTray.tsx` |
| Checkout, payment choice | `components/CheckoutModal.tsx` |
| ABA settings (on/off switch, account, pay link) | `lib/aba.ts`, QR image `public/aba-qr.jpg` |
| Order API / bot webhook | `app/api/order/route.ts`, `app/api/telegram-webhook/route.ts` |
| Bot message text and buttons (staff + customer) | `lib/orderMessages.ts` |
| Telegram Bot API helpers, initData verification | `lib/telegram.ts`, `lib/useTelegramWebApp.ts` |
| Order storage | `lib/orderStore.ts` on top of `lib/kv.ts` (Upstash REST; in-memory fallback only works locally) |
| Generated images | `lib/receiptImage.tsx`, `lib/statusCard.tsx` (next/og + sharp), fonts in `assets/fonts/` |

### Payments (current state)

- **Cash on pickup** and **ABA KHQR**. ABA is on unless `NEXT_PUBLIC_ABA_PAYMENT_ENABLED=false`, and only offered inside Telegram (the walk-in web page is cash only).
- The Mini App shows **no QR**; checkout just places the order. For ABA orders, `/api/order` then sends the customer `public/aba-qr.jpg` in the bot chat with "💳 Open ABA to pay" (url) and "✅ I've paid" (`paid:<orderNumber>` callback). This keeps payment in the chat so closing the Mini App midway loses nothing.
- Tapping "I've paid" (handled in the webhook's `handleAbaPaid`, customer-only) sets `abaPayment: "reported"`, swaps the buttons for "Track order", and updates the receipt. Each staff copy is **bumped**: re-posted at the bottom of the chat as "💰 PAID (ABA)" with its buttons, and the old message deleted (`bumpStaffCopy`; `staffCopies` gets the new ids), so busy chats stay readable. Customers are asked to put the order number in the ABA remark so staff can match payments. Text/buttons: `abaPaymentText`, `abaPaymentKeyboard`, `staffOrderText` in `lib/orderMessages.ts`.
- There is **no payment proof** (no receipt upload, no screenshot): both were removed on purpose. Staff verify in the ABA app before confirming. Don't re-add proof steps unless the owner asks.

### Gotchas

- Generated images (Satori) can't shape Khmer script — keep image text English; the Khmer font is only used for the ៛ sign. Khmer belongs in message captions.
- Telegram only animates GIFs sent with `sendAnimation`; message edits don't notify, so status alerts are sent as replies.
- Files read at runtime by API routes must be listed in `outputFileTracingIncludes` in `next.config.ts`.
- Production build uses `next build --webpack`. Vercel request bodies are capped at 4.5 MB.
- Customers only get status updates when Upstash is connected and the order came from the Mini App; the webhook logs a warning otherwise.

### Env vars

`TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `TELEGRAM_WEBHOOK_SECRET`, `TELEGRAM_MINI_APP_URL` (optional), `KV_REST_API_URL` + `KV_REST_API_TOKEN` (added by Vercel's Upstash integration), `NEXT_PUBLIC_ABA_*`. See `.env.example`. Without a bot token or chat ids, `/api/order` runs in test mode and only logs.

### Ideas not built yet

- Tracking page: poll less often as the order waits, and pause while the tab is hidden (cuts Upstash usage).
- Note on the tracking page when an order has been "making" for a long time.
- Automatic ABA payment confirmation (ABA PayWay or Bakong KHQR) instead of staff checking manually.
- Live end-to-end test with the real bot (webhook edits, animations) hasn't been done by an agent.

### Checks before finishing

`npx tsc --noEmit`, `npx eslint app components lib`, `npm run build`. Running `next dev` inside the agent sandbox needs full permissions.
