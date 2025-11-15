"use client";

import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  format,
  isSameDay,
  addDays,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  differenceInMinutes,
  setHours,
  setMinutes,
  addMinutes,
} from "date-fns";
import { id as LOCALE_ID } from "date-fns/locale";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { ChevronLeft, ChevronRight, Search as SearchIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { TimelineItem } from "@/components/visit-dokter/timeline-item";
import {
  Select,
  SelectTrigger,
  SelectItem,
  SelectContent,
  SelectValue,
} from "@/components/ui/select";

import type { Schedule } from "@/types/visit-dokter";

/* =============================
   TYPES
============================= */

// export interface Schedule {
//   id: string;
//   waktuVisit: string;
//   dokter?: string;
//   namaDokter?: string;
//   pasien?: string;
//   status?: string;
//   rumahSakit?: string;
//   note?: string;
// }

// export interface Schedule {
//   id: string;
//   waktuVisit: string;

//   dokter?: string;
//   namaDokter?: string;
//   pasien?: string;

//   status?: string; // FIXED → hilangkan null
//   rumahSakit?: string;
//   note?: string;

//   [key: string]: unknown;
// }

export interface TimelineEvent extends Schedule {
  startTime: Date;
  endTime: Date;
  eventSlot: number;
  slotWidth: number;
  slotOffset: number;
}

/* =============================
   PROPS
============================= */

interface Props {
    schedulesData: Schedule[];               
    onDataChange: () => Promise<void>;       
    onEditSchedule?: (s: Schedule) => void;  
    apiEndpoint?: string;
  }
  

/* =============================
   CONSTANTS
============================= */

const HOURS_START = 8;
const HOURS_END = 20;
const PIXELS_PER_HOUR = 60;
const OVERLAP_TOLERANCE_MINUTES = 30;
const MAX_SLOTS = 2;
const CACHE_KEY = "schedules_cache_v1";

/* =============================
   CACHING
============================= */

function readCache(): Schedule[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed.data ?? null;
  } catch {
    return null;
  }
}

function writeCache(data: Schedule[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data }));
  } catch {}
}

/* =============================
   FETCH API
============================= */

async function fetchSchedules(api: string): Promise<Schedule[]> {
  const res = await fetch(api);
  if (!res.ok) throw new Error("Fetch gagal");
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/* =============================
   SLOT ASSIGNMENT
============================= */

function assignSlotsToSchedules(schedules: Schedule[]): TimelineEvent[] {
  const result: TimelineEvent[] = schedules.map((s) => {
    const startTime = new Date(s.waktuVisit);
    const endTime = addMinutes(startTime, 60);

    return {
      ...s,
      startTime,
      endTime,
      eventSlot: 0,
      slotWidth: 100,
      slotOffset: 0,
    };
  });

  for (let i = 0; i < result.length; i++) {
    const current = result[i];
    const conflicts: TimelineEvent[] = [current];

    for (let j = i + 1; j < result.length; j++) {
      const next = result[j];

      const overlap =
        current.startTime < next.endTime && current.endTime > next.startTime;

      const close =
        Math.abs(differenceInMinutes(current.startTime, next.startTime)) <
        OVERLAP_TOLERANCE_MINUTES;

      if (overlap || close) conflicts.push(next);
    }

    if (conflicts.length > 1) {
      const width = 100 / Math.min(conflicts.length, MAX_SLOTS);

      conflicts.forEach((ev, idx) => {
        if (idx < MAX_SLOTS) {
          ev.eventSlot = idx;
          ev.slotWidth = width;
          ev.slotOffset = idx * width;
        }
      });
    }
  }

  return result;
}

/* =============================
   MINI CALENDAR
============================= */

function getMonthDays(date: Date) {
  return eachDayOfInterval({
    start: startOfMonth(date),
    end: endOfMonth(date),
  });
}

/* =============================
   DEBOUNCE
============================= */

function useDebouncedValue<T>(value: T, ms = 180) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);

  return v;
}

/* =============================
   MAIN COMPONENT
============================= */

export default function DailyTimelineView({
    schedulesData,
    onEditSchedule,
    apiEndpoint = "/api/visit-dokter",
  }: Props) {
  const { theme } = useTheme();
  const [schedules, setSchedules] = useState<Schedule[]>(schedulesData);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarMonth, setCalendarMonth] = useState(new Date());
 

  const [loading, setLoading] = useState(false);
  const [doctorFilter, setDoctorFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const debouncedQuery = useDebouncedValue(searchQuery);
  const WEEK_DAYS = ["M", "T", "W", "T", "F", "S", "S"];

  /* Load cache + revalidate */
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);

      const cache = readCache();
      if (cache && mounted) setSchedules(cache);

      try {
        const fresh = await fetchSchedules(apiEndpoint);
        if (!mounted) return;
        setSchedules(fresh);
        writeCache(fresh);
      } catch (e) {
        console.error(e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [apiEndpoint]);

  /* Dokter List */
  const doctorList = useMemo(() => {
    const setDoc = new Set<string>();
    schedules.forEach((s) => {
      const name = (s.namaDokter || s.dokter || "Tidak diketahui").trim();
      if (name) setDoc.add(name);
    });
    return [...setDoc];
  }, [schedules]);

  /* Filtering */
  const filteredForDay = useMemo(() => {
    const base = schedules.filter((s) =>
      isSameDay(new Date(s.waktuVisit), currentDate)
    );

    const byDoctor =
      doctorFilter === "all"
        ? base
        : base.filter((s) => (s.namaDokter || s.dokter) === doctorFilter);

    if (!debouncedQuery) return byDoctor;

    const q = debouncedQuery.toLowerCase();

    return byDoctor.filter((s) => {
      return (
        (s.pasien?.toLowerCase().includes(q) ?? false) ||
        (s.namaDokter?.toLowerCase().includes(q) ?? false) ||
        (s.dokter?.toLowerCase().includes(q) ?? false) ||
        (s.status?.toLowerCase().includes(q) ?? false) ||
        (s.waktuVisit?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [schedules, currentDate, doctorFilter, debouncedQuery]);

  /* Slotting + Sort */
  const todaySchedules = useMemo(() => {
    const assigned = assignSlotsToSchedules(filteredForDay);
    return assigned.sort(
      (a, b) => a.startTime.getTime() - b.startTime.getTime()
    );
  }, [filteredForDay]);

  /* Timeline Helpers */
  const totalHours = HOURS_END - HOURS_START;
  const hourLabels = Array.from({ length: totalHours + 1 }, (_, i) => {
    const h = HOURS_START + i;
    return format(setMinutes(setHours(new Date(), h), 0), "H:00");
  });

  const timelineHeight = totalHours * PIXELS_PER_HOUR;

  const getTopPosition = (date: Date) => {
    const h = date.getHours();
    const m = date.getMinutes();
    if (h < HOURS_START || h > HOURS_END) return -999;
    const minutesFromStart = (h - HOURS_START) * 60 + m;
    return (minutesFromStart / (totalHours * 60)) * timelineHeight;
  };

  /* Revalidate */
  const revalidate = useCallback(async () => {
    try {
      setLoading(true);
      const fresh = await fetchSchedules(apiEndpoint);
      setSchedules(fresh);
      writeCache(fresh);
      toast.success("Jadwal diperbarui");
    } catch {
      toast.error("Gagal memuat jadwal");
    } finally {
      setLoading(false);
    }
  }, [apiEndpoint]);

  /* PDF EXPORT */
  const handleExportPDF = useCallback(async () => {
    try {
      toast.loading("Mempersiapkan PDF...", { id: "pdf" });

      const element = document.getElementById("timeline-export-area");
      if (!element) return toast.error("Area tidak ditemukan");

      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: theme === "dark" ? "#0f172a" : "#ffff",
      });

      const img = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "pt", "a4");

      const pageWidth = pdf.internal.pageSize.getWidth();
      const imgWidth = pageWidth - 40;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.setFontSize(16);
      pdf.text(
        `Laporan Visit — ${format(currentDate, "d MMM yyyy", {
          locale: LOCALE_ID,
        })}`,
        20,
        40
      );

      pdf.addImage(img, "PNG", 20, 60, imgWidth, imgHeight);
      pdf.save(`visit-${format(currentDate, "yyyy-MM-dd")}.pdf`);

      toast.success("PDF berhasil dibuat!", { id: "pdf" });
    } catch {
      toast.error("Gagal export PDF");
    }
  }, [theme, currentDate]);

  /* Search debounce UI */
  const searchRef = useRef<number | null>(null);
  const onSearchChange = (v: string) => {
    setSearchQuery(v);
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = window.setTimeout(() => {}, 120);
  };

  /* Mini Calendar */
  const monthDays = useMemo(() => getMonthDays(calendarMonth), [calendarMonth]);

  return (
    <div
      className={cn(
        "rounded-xl p-5 transition-all duration-300",
        theme === "dark"
          ? "bg-gradient-to-br from-slate-900/70 via-slate-800/40 to-slate-900/30 border border-white/10 shadow-xl"
          : "bg-slate-600/80 border border-gray-200 shadow-lg"
      )}
    >
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <p className="text-sm text-muted-foreground">
            {format(currentDate, "EEEE, d MMMM yyyy", { locale: LOCALE_ID })}
          </p>
          <h2 className="text-3xl font-bold">
            {isSameDay(currentDate, new Date())
              ? "Hari Ini"
              : format(currentDate, "EEEE", { locale: LOCALE_ID })}
          </h2>
        </div>

        {/* CONTROLS */}
        <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
          {/* Mini calendar month navigation */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCalendarMonth(addDays(calendarMonth, -30))}
            >
              <ChevronLeft />
            </Button>
            <div className="text-sm px-3 py-1 rounded-full bg-slate-400/10 dark:bg-slate-700/40">
              {format(calendarMonth, "MMMM yyyy", { locale: LOCALE_ID })}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCalendarMonth(addDays(calendarMonth, 30))}
            >
              <ChevronRight />
            </Button>
          </div>

          {/* Doctor filter */}
          <Select value={doctorFilter} onValueChange={setDoctorFilter} >
            <SelectTrigger className="w-[180px] rounded-full bg-slate-200">
              <SelectValue placeholder="Filter dokter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Dokter</SelectItem>
              {doctorList.map((d, i) => (
                <SelectItem key={i} value={d} className="bg-white mt-1">
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Search */}
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Cari pasien/dokter/jam..."
              className="pl-10 w-[220px] rounded-full"
            />
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentDate(addDays(currentDate, -1))}
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="secondary"
            onClick={() => setCurrentDate(new Date())}
          >
            Hari Ini
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentDate(addDays(currentDate, 1))}
          >
            <ChevronRight />
          </Button>

          {/* Refresh + Export PDF */}
          <Button
            variant="ghost"
            size="icon"
            onClick={revalidate}
            disabled={loading}
          >
            ⟳
          </Button>
          <Button
            variant="outline"
            className="rounded-full"
            onClick={handleExportPDF}
          >
            Export PDF
          </Button>
        </div>
      </div>

      {/* MAIN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-6 gap-4 mt-6">
        {/* MINI CALENDAR */}
        <div className="col-span-1 border rounded-lg p-3 dark:border-slate-700/30">
          <div className="text-sm font-medium mb-2">Mini Calendar</div>

          {/* Header */}
          <div className="grid grid-cols-7 text-center text-[11px] text-muted-foreground">
            {WEEK_DAYS.map((d, i) => (
              <div key={i}>{d}</div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7 gap-1 mt-2">
            {monthDays.map((day) => {
              const active = isSameDay(day, currentDate);
              const today = isSameDay(day, new Date());
              const count = schedules.filter((s) =>
                isSameDay(new Date(s.waktuVisit), day)
              ).length;

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setCurrentDate(day)}
                  className={cn(
                    "py-1 rounded flex flex-col items-center text-[10px]",
                    active
                      ? "bg-cyan-500 text-white shadow"
                      : "hover:bg-slate-200 dark:hover:bg-slate-700/40",
                    today && !active ? "border border-cyan-400/40" : ""
                  )}
                >
                  <span>{format(day, "d")}</span>
                  <span className="text-[10px]">{count || ""}</span>
                </button>
              );
            })}
          </div>

          <p className="mt-3 text-xs text-muted-foreground text-center">
            Klik tanggal untuk melihat visit
          </p>
        </div>

        {/* TIMELINE */}
        <div className="col-span-1 lg:col-span-5">
          <div
            id="timeline-export-area"
            className="relative flex border rounded-lg overflow-hidden dark:border-slate-700/40"
          >
            {/* Hour Labels */}
            <div className="w-20 py-2">
              {hourLabels.map((label) => (
                <div
                  key={label}
                  className="h-[60px] flex items-start justify-end pr-3 text-xs text-muted-foreground"
                >
                  {label}
                </div>
              ))}
            </div>

            {/* Timeline */}
            <div
              className="flex-1 relative bg-transparent"
              style={{ minHeight: `${timelineHeight}px` }}
            >
              {Array.from({ length: totalHours }, (_, i) => (
                <div
                  key={i}
                  className="absolute left-0 w-full border-t border-slate-300/20 dark:border-slate-700/20"
                  style={{ top: `${(i + 1) * PIXELS_PER_HOUR}px` }}
                />
              ))}

              {/* Current Time Marker */}
              {isSameDay(currentDate, new Date()) && (
                <div
                  className="absolute left-0 w-full h-[2px] bg-red-500"
                  style={{ top: `${getTopPosition(new Date())}px` }}
                >
                  <div className="absolute -left-2 -top-2 w-4 h-4 bg-red-500 rounded-full animate-pulse" />
                </div>
              )}

              {/* Events */}
              <AnimatePresence>
                {todaySchedules.map((event) => {
                  const top = getTopPosition(event.startTime);
                  if (top < 0 || top > timelineHeight) return null;

                  const height =
                    (differenceInMinutes(event.endTime, event.startTime) / 60) *
                    PIXELS_PER_HOUR;

                  return (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, y: -6, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.97 }}
                      transition={{ duration: 0.2 }}
                      style={{
                        top,
                        height,
                        left: `${event.slotOffset}%`,
                        width: `${event.slotWidth}%`,
                        position: "absolute",
                        padding: "6px",
                      }}
                    >
                      {/* FIX: always provide required fields */}
                      <TimelineItem
                        schedule={{
                          ...event,
                          namaDokter:
                            event.namaDokter ??
                            event.dokter ??
                            "Dokter Tidak Diketahui",
                          rumahSakit: event.rumahSakit ?? "-",
                          note: event.note ?? "",
                          status: event.status ?? "Tidak diketahui", // ✔ FIX
                        }}
                        onClick={() => onEditSchedule?.(event)}
                      />
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {todaySchedules.length === 0 && (
                <div className="absolute inset-0 flex justify-center items-center text-muted-foreground">
                  Tidak ada jadwal visit.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
