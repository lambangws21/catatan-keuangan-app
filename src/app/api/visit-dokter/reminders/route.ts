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
    // ISO string
    if (typeof value === "string") {
      const d = new Date(value);
      return Number.isNaN(d.getTime()) ? null : d;
    }
    return null;
  } catch {
    return null;
  }
};

const nextMonthlyOccurrence = (base: Date, now: Date): Date => {
  const candidate = new Date(base);
  if (candidate.getTime() >= now.getTime()) return candidate;

  const monthsDiff =
    (now.getFullYear() - base.getFullYear()) * 12 +
    (now.getMonth() - base.getMonth());

  const next = new Date(base);
  next.setMonth(base.getMonth() + Math.max(0, monthsDiff));

  if (next.getTime() < now.getTime()) {
    next.setMonth(next.getMonth() + 1);
  }

  return next;
};

const formatReminderMessage = (payload: {
  namaDokter?: string;
  rumahSakit?: string;
  note?: string;
  perawat?: string;
  waktuVisitIso: string;
}) => {
  const doctor = payload.namaDokter || "-";
  const rs = payload.rumahSakit || "-";
  const perawat = payload.perawat || "-";
  const note = payload.note || "-";

  return [
    "⏰ Reminder Visit Dokter",
    "",
    `Dokter: ${doctor}`,
    `RS: ${rs}`,
    `Perawat: ${perawat}`,
    `Waktu: ${payload.waktuVisitIso}`,
    `Catatan: ${note}`,
  ].join("\n");
};

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
    minutesAhead?: number;
  };

  const minutesAhead =
    typeof body.minutesAhead === "number" && Number.isFinite(body.minutesAhead)
      ? Math.max(1, Math.min(24 * 60, body.minutesAhead))
      : 60;

  const now = new Date();
  const until = new Date(now.getTime() + minutesAhead * 60_000);

  const db = admin.firestore();
  const snapshot = await db
    .collection(VISIT_COLLECTION)
    .where("status", "==", "Terjadwal")
    .get();

  let checked = 0;
  let sent = 0;

  for (const doc of snapshot.docs) {
    checked += 1;
    const data = doc.data();

    const baseDate = toDate(data.waktuVisit);
    if (!baseDate) continue;

    const repeat = String(data.repeat || "once");
    const occurrence =
      repeat === "monthly"
        ? nextMonthlyOccurrence(baseDate, now)
        : new Date(baseDate);

    if (occurrence.getTime() < now.getTime()) continue;
    if (occurrence.getTime() > until.getTime()) continue;

    const occurrenceIso = occurrence.toISOString();
    const alreadySentFor = String(data.telegramReminderSentFor || "");
    if (alreadySentFor === occurrenceIso) continue;

    const message = formatReminderMessage({
      namaDokter: data.namaDokter,
      rumahSakit: data.rumahSakit,
      note: data.note,
      perawat: data.perawat,
      waktuVisitIso: occurrenceIso,
    });

    const shouldSend = process.env.TELEGRAM_VISIT_NOTIFY === "1";
    if (!shouldSend) continue;

    const r = await sendTelegramMessage(message);
    if (!r.ok) {
      console.error("Telegram reminder gagal:", r.error);
      continue;
    }

    sent += 1;

    await doc.ref.update({
      telegramReminderSentFor: occurrenceIso,
      telegramReminderSentAt: new Date(),
    });
  }

  return NextResponse.json({
    ok: true,
    minutesAhead,
    checked,
    sent,
  });
}
