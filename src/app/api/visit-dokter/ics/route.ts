import { NextRequest, NextResponse } from "next/server";
import admin from "@/lib/firebase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VISIT_COLLECTION = "visitDokter";
const DEFAULT_REPEAT_MONTHS = 6;
const VISIT_DURATION_MINUTES = 60;

const pad2 = (n: number) => String(n).padStart(2, "0");

const formatIcsDateUtc = (d: Date) => {
  return (
    `${d.getUTCFullYear()}${pad2(d.getUTCMonth() + 1)}${pad2(d.getUTCDate())}` +
    `T${pad2(d.getUTCHours())}${pad2(d.getUTCMinutes())}${pad2(d.getUTCSeconds())}Z`
  );
};

const escapeIcsText = (value: unknown) => {
  return String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
};

const clampMonthlyOccurrence = (base: Date, year: number, monthIndex: number) => {
  const day = base.getDate();
  const hours = base.getHours();
  const minutes = base.getMinutes();
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();

  const d = new Date(base);
  d.setFullYear(year);
  d.setMonth(monthIndex, Math.min(day, lastDay));
  d.setHours(hours, minutes, 0, 0);
  return d;
};

const toDate = (value: unknown): Date | null => {
  try {
    if (!value) return null;
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

export async function GET(req: NextRequest) {
  const monthsParam = req.nextUrl.searchParams.get("months");
  const months =
    monthsParam && Number.isFinite(Number(monthsParam))
      ? Math.max(0, Math.min(36, Math.floor(Number(monthsParam))))
      : DEFAULT_REPEAT_MONTHS;

  const db = admin.firestore();
  const snapshot = await db
    .collection(VISIT_COLLECTION)
    .where("status", "==", "Terjadwal")
    .orderBy("waktuVisit", "asc")
    .get();

  const now = new Date();
  const dtstamp = formatIcsDateUtc(now);

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "CALSCALE:GREGORIAN",
    "PRODID:-//catatan-keunangan//visit-dokter//ID",
    "X-WR-CALNAME:Visit Dokter",
    "X-WR-TIMEZONE:UTC",
  ];

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const base = toDate(data.waktuVisit);
    if (!base) continue;

    const repeat = String(data.repeat || "once");
    const occurrences =
      repeat === "monthly"
        ? Array.from({ length: months + 1 }, (_, i) => {
            const y = base.getFullYear();
            const m = base.getMonth();
            return clampMonthlyOccurrence(base, y, m + i);
          })
        : [base];

    for (let i = 0; i < occurrences.length; i += 1) {
      const start = occurrences[i];
      const end = new Date(start.getTime() + VISIT_DURATION_MINUTES * 60_000);

      const namaDokter = data.namaDokter || data.dokter || "-";
      const rumahSakit = data.rumahSakit || "-";
      const perawat = data.perawat || "-";
      const note = data.note || "-";

      lines.push("BEGIN:VEVENT");
      lines.push(`UID:${escapeIcsText(`${doc.id}${occurrences.length > 1 ? `-${i}` : ""}@visit-dokter`)}`);
      lines.push(`DTSTAMP:${dtstamp}`);
      lines.push(`DTSTART:${formatIcsDateUtc(start)}`);
      lines.push(`DTEND:${formatIcsDateUtc(end)}`);
      lines.push(`SUMMARY:${escapeIcsText(`Visit Dokter: ${namaDokter}`)}`);
      lines.push(`LOCATION:${escapeIcsText(rumahSakit)}`);
      lines.push(
        `DESCRIPTION:${escapeIcsText(
          [`Dokter: ${namaDokter}`, `RS: ${rumahSakit}`, `Perawat: ${perawat}`, "", `Catatan: ${note}`].join(
            "\n"
          )
        )}`
      );
      lines.push("STATUS:CONFIRMED");
      lines.push("CATEGORIES:Visit Dokter");
      lines.push("END:VEVENT");
    }
  }

  lines.push("END:VCALENDAR");

  const body = lines.join("\r\n") + "\r\n";
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="visit-dokter.ics"',
      "Cache-Control": "no-store",
    },
  });
}

