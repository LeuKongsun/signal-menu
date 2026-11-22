import { editOrderMessage, sendTelegramText } from "@/lib/telegram";
import { loyaltyCardKeyboard, loyaltyCardText } from "@/lib/loyaltyMessages";
import { pendingFreeCount, saveLoyaltyCard, type LoyaltyCard } from "@/lib/loyaltyStore";

export async function notifyCustomerCardUpdate(
  botToken: string,
  card: LoyaltyCard,
): Promise<void> {
  const chatId = card.telegramId;
  const text = loyaltyCardText(card);
  const keyboard = loyaltyCardKeyboard();
  const pending = pendingFreeCount(card);

  if (card.cardMessageId) {
    const result = await editOrderMessage(
      botToken,
      { chatId, messageId: card.cardMessageId, isPhoto: false },
      text,
      keyboard,
    );
    if (!result.ok) card.cardMessageId = undefined;
  }

  if (!card.cardMessageId) {
    const sent = await sendTelegramText(botToken, chatId, text, keyboard);
    if (sent.ok && sent.result) {
      card.cardMessageId = sent.result.message_id;
      await saveLoyaltyCard(card);
    }
    return;
  }

  await saveLoyaltyCard(card);
  const alert = pending > 0
    ? "🎁 បានបោះត្រាជូន! អ្នកទទួលបានភេសជ្ជៈឥតគិតថ្លៃ 1 គ្រឿង!"
    : `☕ បានបោះត្រាជូន! ${card.stamps}/10 ត្រា`;
  await sendTelegramText(botToken, chatId, alert, undefined, card.cardMessageId);
}
