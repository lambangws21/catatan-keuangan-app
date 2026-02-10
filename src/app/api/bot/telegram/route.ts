import { NextResponse } from "next/server";
import admin from "@/lib/firebase/admin";

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
const VISIT_TIMEZONE = process.env.VISIT_TIMEZONE || "Asia/Jakarta";

async function sendMessage(chatId: number, text: string) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}

const toDate = (value: unknown): Date | null => {
  try {
    if (!value) return null;
    // Firestore Timestamp
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ts = value as any;
    if (typeof ts?.toDate === "function") return ts.toDate();
    if (typeof value === "string") {
      const d = new Date(value);
      return Number.isNaN(d.getTime()) ? null : d;
    }
    return null;
  } catch {
    return null;
  }
};

const formatDateYMD = (date: Date, timeZone: string) => {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
};

const formatTimeHM = (date: Date, timeZone: string) => {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
};

const monthlyOccurrenceFor = (
  base: Date,
  targetYear: number,
  targetMonthIndex: number
) => {
  const occ = new Date(base);
  occ.setFullYear(targetYear);
  occ.setMonth(targetMonthIndex);
  return occ;
};

async function listVisitsForDate(
  targetDate: string,
  timeZone: string
): Promise<
  Array<{
    time: string;
    namaDokter: string;
    rumahSakit: string;
    perawat: string;
    note: string;
  }>
> {
  const [targetYear, targetMonth] = targetDate.split("-").map((v) => Number(v));
  const targetMonthIndex = targetMonth - 1;

  const db = admin.firestore();
  const snapshot = await db
    .collection("visitDokter")
    .where("status", "==", "Terjadwal")
    .get();

  const items: Array<{
    time: string;
    namaDokter: string;
    rumahSakit: string;
    perawat: string;
    note: string;
    ts: number;
  }> = [];

  snapshot.docs.forEach((doc) => {
    const data = doc.data();
    const base = toDate(data.waktuVisit);
    if (!base) return;

    const repeat = String(data.repeat || "once");
    const occ =
      repeat === "monthly"
        ? monthlyOccurrenceFor(base, targetYear, targetMonthIndex)
        : new Date(base);

    if (formatDateYMD(occ, timeZone) !== targetDate) return;

    items.push({
      time: formatTimeHM(occ, timeZone),
      namaDokter: String(data.namaDokter || data.dokter || "-"),
      rumahSakit: String(data.rumahSakit || "-"),
      perawat: String(data.perawat || "-"),
      note: String(data.note || "-"),
      ts: occ.getTime(),
    });
  });

  items.sort((a, b) => a.ts - b.ts);
  return items.map((it) => {
    const { ts, ...rest } = it;
    void ts;
    return rest;
  });
}

function buildVisitMessage(title: string, targetDate: string, items: Awaited<ReturnType<typeof listVisitsForDate>>) {
  if (!items.length) return `${title}\nTanggal: ${targetDate}\n\nTidak ada jadwal.`;

  const lines = items.slice(0, 25).map((it, idx) => {
    return `${idx + 1}. ${it.time} • ${it.namaDokter} • ${it.rumahSakit} • ${it.perawat}`;
  });

  const more = items.length > 25 ? `\n\n(+${items.length - 25} lainnya)` : "";
  return [`${title}`, `Tanggal: ${targetDate} (${VISIT_TIMEZONE})`, "", ...lines].join("\n") + more;
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
      "Siap.\n\nKeuangan:\n/add 12000 makan siang\natau\n/add 12000|makan siang\n\nVisit:\n/visit_today\n/visit_tomorrow\n/visit YYYY-MM-DD"
    );
    return NextResponse.json({ ok: true });
  }

  if (text.toLowerCase().startsWith("/visit")) {
    const parts = text.split(/\s+/).filter(Boolean);
    const cmd = parts[0]?.toLowerCase();

    const now = new Date();
    const today = formatDateYMD(now, VISIT_TIMEZONE);
    const tomorrow = formatDateYMD(new Date(now.getTime() + 864e5), VISIT_TIMEZONE);

    let targetDate = today;
    let title = "📅 Jadwal Visit";

    if (cmd === "/visit_today") {
      targetDate = today;
      title = "📅 Jadwal Visit Hari Ini";
    } else if (cmd === "/visit_tomorrow") {
      targetDate = tomorrow;
      title = "📅 Jadwal Visit Besok";
    } else if (cmd === "/visit") {
      const maybe = parts[1];
      if (!maybe || !/^\d{4}-\d{2}-\d{2}$/.test(maybe)) {
        await sendMessage(chatId, "Format: /visit YYYY-MM-DD\nContoh: /visit 2026-02-05");
        return NextResponse.json({ ok: true });
      }
      targetDate = maybe;
      title = "📅 Jadwal Visit";
    } else {
      await sendMessage(chatId, "Command visit:\n/visit_today\n/visit_tomorrow\n/visit YYYY-MM-DD");
      return NextResponse.json({ ok: true });
    }

    try {
      const items = await listVisitsForDate(targetDate, VISIT_TIMEZONE);
      const msg = buildVisitMessage(title, targetDate, items);
      await sendMessage(chatId, msg);
    } catch (e) {
      console.error("Telegram /visit error:", e);
      await sendMessage(chatId, "Gagal mengambil jadwal visit. Coba lagi.");
    }

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
