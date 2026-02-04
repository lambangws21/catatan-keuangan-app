export type TelegramSendResult =
  | { ok: true; status: number }
  | { ok: false; status?: number; error: string };

const pickDefaultChatId = () => {
  return (
    process.env.TELEGRAM_NOTIFY_CHAT_ID ||
    process.env.TELEGRAM_ALLOWED_CHAT_ID ||
    ""
  );
};

export async function sendTelegramMessage(
  text: string,
  options?: { chatId?: string | number }
): Promise<TelegramSendResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = options?.chatId ?? pickDefaultChatId();

  if (!token) return { ok: false, error: "TELEGRAM_BOT_TOKEN belum diset." };
  if (!chatId)
    return {
      ok: false,
      error:
        "Chat ID Telegram belum diset (set TELEGRAM_NOTIFY_CHAT_ID atau TELEGRAM_ALLOWED_CHAT_ID).",
    };

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });

  if (!res.ok) {
    const bodyText = await res.text().catch(() => "");
    return {
      ok: false,
      status: res.status,
      error: bodyText || `Telegram sendMessage gagal (HTTP ${res.status}).`,
    };
  }

  return { ok: true, status: res.status };
}

