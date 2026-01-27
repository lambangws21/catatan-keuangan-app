import { NextResponse } from "next/server";

export const runtime = "nodejs"; // aman untuk webhook + fetch ke API internal
export const dynamic = "force-dynamic"; // jangan di-cache

type TgUpdate = {
  message?: {
    chat?: { id?: number };
    text?: string;
  };
};

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const BOT_SECRET = process.env.TELEGRAM_BOT_SECRET!;
const ALLOWED_CHAT_ID = process.env.TELEGRAM_ALLOWED_CHAT_ID; // optional

async function sendMessage(chatId: number, text: string) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}

function parseExpense(text: string) {
  // Format: /add 12000 makan siang
  // atau:   /add 12000|makan siang
  const raw = text.replace(/^\/add\s+/i, "").trim();
  if (!raw) return null;

  let amountStr = "";
  let info = "";

  if (raw.includes("|")) {
    [amountStr, info] = raw.split("|").map((s) => s.trim());
  } else {
    const parts = raw.split(/\s+/);
    amountStr = parts.shift() ?? "";
    info = parts.join(" ").trim();
  }

  const amount = Number(amountStr.replace(/[^\d]/g, ""));
  if (!Number.isFinite(amount) || amount <= 0) return null;
  if (!info) info = "-";

  return { amount, info };
}

export async function POST(req: Request) {
  // Telegram secret header (dari setWebhook secret_token)
  const secret = req.headers.get("x-telegram-bot-api-secret-token");
  if (secret !== BOT_SECRET) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const update = (await req.json()) as TgUpdate;
  const chatId = update.message?.chat?.id;
  const text = update.message?.text?.trim() || "";

  if (!chatId) return NextResponse.json({ ok: true });

  // optional: batasi 1 chat id
  if (ALLOWED_CHAT_ID && String(chatId) !== String(ALLOWED_CHAT_ID)) {
    await sendMessage(chatId, "Akses ditolak (chat tidak diizinkan).");
    return NextResponse.json({ ok: true });
  }

  if (text === "/start") {
    await sendMessage(
      chatId,
      "Siap.\nKirim:\n/add 12000 makan siang\natau\n/add 12000|makan siang"
    );
    return NextResponse.json({ ok: true });
  }

  if (text.toLowerCase().startsWith("/add")) {
    const parsed = parseExpense(text);
    if (!parsed) {
      await sendMessage(chatId, "Format salah. Contoh: /add 12000 makan siang");
      return NextResponse.json({ ok: true });
    }

    // PENTING: gunakan base url production (Vercel) / dev
    const baseUrl =
      process.env.APP_BASE_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

    const r = await fetch(`${baseUrl}/api/expenses`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-internal-token": process.env.INTERNAL_API_TOKEN!,
      },
      body: JSON.stringify({
        amount: parsed.amount,
        information: parsed.info,
        source: "telegram",
        chatId,
        createdAt: new Date().toISOString(),
      }),
    });

    if (!r.ok) {
      await sendMessage(chatId, "Gagal simpan. Coba lagi.");
      return NextResponse.json({ ok: true });
    }

    await sendMessage(chatId, `Tersimpan ✅\nRp ${parsed.amount}\n${parsed.info}`);
    return NextResponse.json({ ok: true });
  }

  await sendMessage(chatId, "Command tidak dikenali. Ketik /start.");
  return NextResponse.json({ ok: true });
}
