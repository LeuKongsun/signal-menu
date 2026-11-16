const TELEGRAM_API = "https://api.telegram.org";

export type InlineKeyboard = {
  inline_keyboard: { text: string; callback_data: string }[][];
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

type CopyStore = Map<string, OrderCopy[]>;

const globalForCopies = globalThis as typeof globalThis & {
  __signalTelegramCopies?: CopyStore;
};

function copyStore(): CopyStore {
  if (!globalForCopies.__signalTelegramCopies) {
    globalForCopies.__signalTelegramCopies = new Map();
  }
  return globalForCopies.__signalTelegramCopies;
}

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

export function rememberOrderCopies(orderNumber: string, sent: OrderCopy[]) {
  if (!orderNumber || sent.length === 0) return;
  copyStore().set(orderNumber, sent);
}

export function copiesForUpdate(orderNumber: string, current: OrderCopy): OrderCopy[] {
  const merged = new Map<string, OrderCopy>();
  const add = (copy: OrderCopy) => {
    merged.set(`${copy.chatId}:${copy.messageId}`, copy);
  };
  add(current);
  for (const copy of copyStore().get(orderNumber) ?? []) add(copy);
  return [...merged.values()];
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

  const res = await fetch(`${TELEGRAM_API}/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      reply_markup: replyMarkup,
    }),
  });
  return res.json();
}

export async function editOrderMessage(
  botToken: string,
  copy: OrderCopy,
  text: string,
  replyMarkup: InlineKeyboard
): Promise<TelegramResult> {
  const method = copy.isPhoto ? "editMessageCaption" : "editMessageText";
  const body = copy.isPhoto
    ? {
        chat_id: copy.chatId,
        message_id: copy.messageId,
        caption: text,
        parse_mode: "HTML",
        reply_markup: replyMarkup,
      }
    : {
        chat_id: copy.chatId,
        message_id: copy.messageId,
        text,
        parse_mode: "HTML",
        reply_markup: replyMarkup,
      };

  const res = await fetch(`${TELEGRAM_API}/bot${botToken}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}
