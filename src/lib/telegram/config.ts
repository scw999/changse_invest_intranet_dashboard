function normalizeList(value: string) {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function getTelegramBotToken() {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN is missing.");
  }

  return token;
}

export function getTelegramWebhookSecret() {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;

  if (!secret) {
    throw new Error("TELEGRAM_WEBHOOK_SECRET is missing.");
  }

  return secret;
}

export function getTelegramAllowedChatIds() {
  const raw = process.env.TELEGRAM_ALLOWED_CHAT_IDS ?? "";
  return normalizeList(raw);
}
