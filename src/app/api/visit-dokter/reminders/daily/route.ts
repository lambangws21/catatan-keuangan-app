import { NextRequest, NextResponse } from "next/server";
import admin from "@/lib/firebase/admin";
import { sendTelegramMessage } from "@/lib/telegram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VISIT_COLLECTION = "visitDokter";

const isAuthorized = (req: NextRequest) => {
  const internal = process.env.INTERNAL_API_TOKEN;
  const provided = req.headers.get("x-internal-token");
  if (internal && provided === internal) return true;

  const cronSecret = process.env.CRON_SECRET;
  const qs =
    req.nextUrl.searchParams.get("cron_secret") ||
    req.nextUrl.searchParams.get("token");
  if (cronSecret && qs && qs === cronSecret) return true;

  // Vercel Cron requests include x-vercel-cron; allow only on Vercel deployments.
  const vercelCron = req.headers.get("x-vercel-cron");
  if (vercelCron && (process.env.VERCEL || process.env.VERCEL_ENV)) return true;

  return false;
};

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
  // In serverless this typically runs in UTC; we still compare using timeZone formatter.
  occ.setFullYear(targetYear);
  occ.setMonth(targetMonthIndex);
  return occ;
};

const chunk = <T,>(arr: T[], size: number) => {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

type Mode = "summary" | "perSchedule";

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json(
      {
        ok: false,
        error: "unauthorized",
        hint:
          "Set INTERNAL_API_TOKEN dan kirim header x-internal-token, atau set CRON_SECRET dan kirim ?cron_secret=... (atau gunakan Vercel Cron).",
      },
      { status: 401 }
    );
  }

  const body = (await req.json().catch(() => ({}))) as {
    daysAhead?: number;
    timeZone?: string;
    targetDate?: string; // YYYY-MM-DD
    mode?: Mode;
    dryRun?: boolean;
  };

  const timeZone = body.timeZone || process.env.VISIT_TIMEZONE || "Asia/Jakarta";
  const daysAhead =
    typeof body.daysAhead === "number" && Number.isFinite(body.daysAhead)
      ? Math.max(0, Math.min(30, Math.floor(body.daysAhead)))
      : 1;

  const now = new Date();
  const targetDate =
    body.targetDate || formatDateYMD(new Date(now.getTime() + daysAhead * 864e5), timeZone);

  const [targetYear, targetMonth, _targetDay] = targetDate
    .split("-")
    .map((v) => Number(v));
  const targetMonthIndex = targetMonth - 1;

  const shouldSend =
    process.env.TELEGRAM_VISIT_DAILY_NOTIFY === "1" ||
    process.env.TELEGRAM_VISIT_NOTIFY === "1";

  const db = admin.firestore();
  const snapshot = await db
    .collection(VISIT_COLLECTION)
    .where("status", "==", "Terjadwal")
    .get();

  const matches: Array<{
    ref: FirebaseFirestore.DocumentReference;
    id: string;
    namaDokter: string;
    rumahSakit: string;
    perawat: string;
    note: string;
    occurrence: Date;
  }> = [];

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const baseDate = toDate(data.waktuVisit);
    if (!baseDate) continue;

    const repeat = String(data.repeat || "once");
    const occurrence =
      repeat === "monthly"
        ? monthlyOccurrenceFor(baseDate, targetYear, targetMonthIndex)
        : new Date(baseDate);

    if (formatDateYMD(occurrence, timeZone) !== targetDate) continue;

    const already = String(data.telegramDailyReminderSentForDate || "");
    if (already === targetDate) continue;

    matches.push({
      ref: doc.ref,
      id: doc.id,
      namaDokter: String(data.namaDokter || data.dokter || "-"),
      rumahSakit: String(data.rumahSakit || "-"),
      perawat: String(data.perawat || "-"),
      note: String(data.note || "-"),
      occurrence,
    });
  }

  const mode: Mode = body.mode === "perSchedule" ? "perSchedule" : "summary";

  if (!shouldSend) {
    return NextResponse.json({
      ok: true,
      sent: 0,
      matched: matches.length,
      skipped: snapshot.size - matches.length,
      targetDate,
      timeZone,
      mode,
      note: "TELEGRAM_VISIT_DAILY_NOTIFY/TELEGRAM_VISIT_NOTIFY belum diaktifkan.",
    });
  }

  if (body.dryRun) {
    return NextResponse.json({
      ok: true,
      sent: 0,
      matched: matches.length,
      targetDate,
      timeZone,
      mode,
      preview: matches.slice(0, 20).map((m) => ({
        id: m.id,
        namaDokter: m.namaDokter,
        rumahSakit: m.rumahSakit,
        perawat: m.perawat,
        waktu: m.occurrence.toISOString(),
      })),
    });
  }

  let sent = 0;

  if (mode === "perSchedule") {
    for (const m of matches) {
      const msg = [
        "📅 Jadwal Visit Besok",
        `Tanggal: ${targetDate}`,
        "",
        `Dokter: ${m.namaDokter}`,
        `RS: ${m.rumahSakit}`,
        `Perawat: ${m.perawat}`,
        `Jam: ${formatTimeHM(m.occurrence, timeZone)}`,
        `Catatan: ${m.note}`,
      ].join("\n");

      const r = await sendTelegramMessage(msg);
      if (!r.ok) {
        console.error("Telegram daily (perSchedule) gagal:", r.error);
        continue;
      }

      sent += 1;
      await m.ref.update({
        telegramDailyReminderSentForDate: targetDate,
        telegramDailyReminderSentAt: new Date(),
      });
    }
  } else {
    if (!matches.length) {
      return NextResponse.json({
        ok: true,
        sent: 0,
        matched: 0,
        targetDate,
        timeZone,
        mode,
      });
    }

    const lines = matches
      .sort((a, b) => a.occurrence.getTime() - b.occurrence.getTime())
      .map((m, idx) => {
        const t = formatTimeHM(m.occurrence, timeZone);
        return `${idx + 1}. ${t} • ${m.namaDokter} • ${m.rumahSakit} • ${m.perawat}`;
      });

    const batches = chunk(lines, 25);

    for (let i = 0; i < batches.length; i += 1) {
      const msg = [
        "📅 Jadwal Visit Besok",
        `Tanggal: ${targetDate} (${timeZone})`,
        `Total: ${matches.length}`,
        "",
        ...batches[i],
      ].join("\n");

      const r = await sendTelegramMessage(msg);
      if (!r.ok) {
        console.error("Telegram daily (summary) gagal:", r.error);
        continue;
      }
      sent += 1;
    }

    // Mark all matched docs as sent for that date (even if message split)
    await Promise.all(
      matches.map((m) =>
        m.ref.update({
          telegramDailyReminderSentForDate: targetDate,
          telegramDailyReminderSentAt: new Date(),
        })
      )
    );
  }

  return NextResponse.json({
    ok: true,
    sent,
    matched: matches.length,
    targetDate,
    timeZone,
    mode,
  });
}
