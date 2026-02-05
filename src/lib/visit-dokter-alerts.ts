import type { Schedule } from "@/types/visit-dokter";

export type VisitAlert = {
  /** Stable id for UI lists */
  id: string;
  /** Source schedule id in Firestore */
  sourceId: string;
  namaDokter: string;
  rumahSakit: string;
  perawat?: string;
  /** ISO string for the occurrence time */
  waktuVisit: string;
  /** 0 = today, 1 = tomorrow, ... */
  dayOffset: number;
};

const startOfDayLocal = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

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

const nextMonthlyOccurrence = (base: Date, from: Date) => {
  const y = from.getFullYear();
  const m = from.getMonth();
  const thisMonth = clampMonthlyOccurrence(base, y, m);
  if (thisMonth.getTime() >= from.getTime()) return thisMonth;
  return clampMonthlyOccurrence(base, y, m + 1);
};

export const getVisitAlertsForNextDays = (
  schedules: Schedule[] | undefined,
  daysAhead: number,
  now: Date = new Date()
): VisitAlert[] => {
  if (!Array.isArray(schedules) || schedules.length === 0) return [];
  const todayKey = startOfDayLocal(now);

  const results: VisitAlert[] = [];

  for (const s of schedules) {
    if (!s?.waktuVisit) continue;
    if (s.status && s.status !== "Terjadwal") continue;
    if ((s as unknown as { isVirtual?: boolean }).isVirtual) continue;

    const base = new Date(s.waktuVisit);
    if (Number.isNaN(base.getTime())) continue;

    const repeat = s.repeat || "once";
    const occ = repeat === "monthly" ? nextMonthlyOccurrence(base, now) : base;

    const dayOffset = Math.round((startOfDayLocal(occ) - todayKey) / 86_400_000);
    if (dayOffset < 0 || dayOffset > daysAhead) continue;

    results.push({
      id: `${s.id}:${occ.toISOString()}`,
      sourceId: s.id,
      namaDokter: s.namaDokter || s.dokter || "-",
      rumahSakit: s.rumahSakit || "-",
      perawat: s.perawat || undefined,
      waktuVisit: occ.toISOString(),
      dayOffset,
    });
  }

  results.sort((a, b) => new Date(a.waktuVisit).getTime() - new Date(b.waktuVisit).getTime());
  return results;
};

