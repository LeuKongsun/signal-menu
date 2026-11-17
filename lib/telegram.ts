import { createHmac, timingSafeEqual } from "node:crypto";

const TELEGRAM_API = "https://api.telegram.org";

export type InlineKeyboard = {
  inline_keyboard: (
    | { text: string; callback_data: string }
    | { text: string; web_app: { url: string } }
  )[][];
};

export type OrderCopy = {
  chatId: string | number;
  messageId: number;
  isPhoto: boolean;
};

type TelegramResult = {
  ok: boolean;
  description?: string;
  result?: { message_id: number };
};

export type TelegramUser = {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
};

/** Accepts one id or several, separated by commas, semicolons, or spaces. */
export function parseTelegramChatIds(raw: string | undefined): string[] {
  if (!raw) return [];
  const seen = new Set<string>();
  for (const part of raw.split(/[\s,;]+/)) {
    const id = part.trim();
    if (id) seen.add(id);
  }
  return [...seen];
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Checks the `initData` string a Mini App receives from Telegram and returns the
 * user if the signature is valid and not older than `maxAgeSeconds`.
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
export function verifyTelegramInitData(
  initData: string,
  botToken: string,
  maxAgeSeconds = 60 * 60 * 24
): TelegramUser | null {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return null;
  params.delete("hash");

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
  const expected = createHmac("sha256", secretKey).update(dataCheckString).digest();
  const received = Buffer.from(hash, "hex");
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
    return null;
  }

  const authDate = Number(params.get("auth_date"));
  if (!authDate || Date.now() / 1000 - authDate > maxAgeSeconds) return null;

  try {
    const user = JSON.parse(params.get("user") || "null") as TelegramUser | null;
    return user && typeof user.id === "number" ? user : null;
  } catch {
    return null;
  }
}

async function callTelegram(
  botToken: string,
  method: string,
  body: Record<string, unknown>
): Promise<TelegramResult> {
  const res = await fetch(`${TELEGRAM_API}/bot${botToken}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

export function sendTelegramText(
  botToken: string,
  chatId: string | number,
  text: string,
  replyMarkup?: InlineKeyboard
): Promise<TelegramResult> {
  return callTelegram(botToken, "sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
  });
}

export function answerCallbackQuery(botToken: string, callbackQueryId: string, text: string) {
  return callTelegram(botToken, "answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    text,
    show_alert: false,
  });
}

export async function sendOrderMessage(options: {
  botToken: string;
  chatId: string;
  text: string;
  replyMarkup: InlineKeyboard;
  photo?: { bytes: Uint8Array; name: string; type: string } | null;
}): Promise<TelegramResult> {
  const { botToken, chatId, text, replyMarkup, photo } = options;

  if (photo) {
    const form = new FormData();
    form.append("chat_id", chatId);
    form.append(
      "photo",
      new Blob([new Uint8Array(photo.bytes)], { type: photo.type }),
      photo.name
    );
    form.append("caption", text);
    form.append("parse_mode", "HTML");
    form.append("reply_markup", JSON.stringify(replyMarkup));

    const res = await fetch(`${TELEGRAM_API}/bot${botToken}/sendPhoto`, {
      method: "POST",
      body: form,
    });
    return res.json();
  }

  return sendTelegramText(botToken, chatId, text, replyMarkup);
}

export function editOrderMessage(
  botToken: string,
  copy: OrderCopy,
  text: string,
  replyMarkup: InlineKeyboard
): Promise<TelegramResult> {
  return copy.isPhoto
    ? callTelegram(botToken, "editMessageCaption", {
        chat_id: copy.chatId,
        message_id: copy.messageId,
        caption: text,
        parse_mode: "HTML",
        reply_markup: replyMarkup,
      })
    : callTelegram(botToken, "editMessageText", {
        chat_id: copy.chatId,
        message_id: copy.messageId,
        text,
        parse_mode: "HTML",
        reply_markup: replyMarkup,
      });
}

/** The message the current one belongs to, plus every other stored copy, without duplicates. */
export function mergeCopies(current: OrderCopy, stored: OrderCopy[] = []): OrderCopy[] {
  const merged = new Map<string, OrderCopy>();
  for (const copy of [current, ...stored]) {
    merged.set(`${copy.chatId}:${copy.messageId}`, copy);
  }
  return [...merged.values()];
}
