"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  ListPlus,
  CheckCircle2,
  ClipboardList,
  Pencil,
  Trash2,
  XCircle,
} from "lucide-react";
import clsx from "clsx";
import ScheduleForm from "@/components/visit-dokter/form-input";
import type { Schedule } from "@/types/visit-dokter";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function MobileTimeline({
  schedules,
  isLoading,
  doctors,
  onRefresh,
  onEdit,
  onDelete,
  onQuickStatus,
}: {
  schedules: Schedule[];
  isLoading: boolean;
  doctors: { id: string; namaDokter: string; rumahSakit: string[] }[];
  onRefresh: () => Promise<void>;
  onEdit: (schedule: Schedule) => void;
  onDelete: (scheduleId: string) => void;
  onQuickStatus?: (schedule: Schedule, nextStatus: "Selesai" | "Dibatalkan") => void;
}) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const [showAllDates, setShowAllDates] = useState(false);
  const [showAllEvents, setShowAllEvents] = useState(false);

  // ✅ FILTER EVENT BY DATE ATAU ALL
  const filteredEvents = useMemo(() => {
    if (showAllEvents) return schedules;

    const d = selectedDate.toISOString().slice(0, 10);

    return schedules.filter(
      (item) =>
        item?.waktuVisit &&
        item.waktuVisit.split("T")[0] === d
    );
  }, [selectedDate, schedules, showAllEvents]);

  // ✅ FULL DATE RANGE
  const fullDateList = useMemo(() => {
    return Array.from({ length: 31 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - 15 + i);
      return d;
    });
  }, []);

  // ✅ MINI WEEK
  const weekDates = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - 3 + i);
      return d;
    });
  }, []);

  const moveDate = (value: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + value);
    setSelectedDate(d);
    setShowAllEvents(false);
  };

  return (
    <div className="space-y-5">

      {/* HEADER */}
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">
            {format(selectedDate, "MMMM dd, yyyy")}
          </p>
          <h1 className="text-2xl font-bold">
            {showAllEvents ? "Semua Jadwal" : "Jadwal Hari Ini"}
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Tap item untuk edit. Gunakan tombol cepat untuk selesai/batal.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-900 dark:bg-gray-800 dark:text-white text-slate-500">
          <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
            <Link href="/list-dokter">
              <ClipboardList className="mr-2 h-4 w-4" />
              List Dokter
            </Link>
          </Button>
          <ScheduleForm onFormSubmit={onRefresh} doctorsList={doctors} />
        </div>
      </header>

      {!showAllEvents && (
        <div className="flex justify-between items-center">
          <button
            onClick={() => moveDate(-1)}
            className="p-2 rounded-lg bg-muted hover:bg-muted/70"
          >
            <ChevronLeft size={18} />
          </button>

          <span className="text-sm font-semibold text-muted-foreground">
            {format(selectedDate, "EEEE")}
          </span>

          <button
            onClick={() => moveDate(1)}
            className="p-2 rounded-lg bg-muted hover:bg-muted/70"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}

      {/* TOGGLE MODE */}
      <div className="flex gap-3">
        <button
          className="flex-1 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold"
          onClick={() => {
            setShowAllEvents(false);
            setShowAllDates(!showAllDates);
          }}
        >
          <CalendarDays className="inline w-4 h-4 mr-1" />
          {showAllDates ? "Tutup Kalender" : "Semua Tanggal"}
        </button>

        <button
          className="flex-1 py-2 rounded-xl bg-secondary text-secondary-foreground text-sm font-semibold"
          onClick={() => {
            setShowAllDates(false);
            setShowAllEvents(!showAllEvents);
          }}
        >
          <ListPlus className="inline w-4 h-4 mr-1" />
          Semua Event
        </button>
      </div>

      {!showAllEvents && (
        <div className="grid grid-cols-7 bg-muted/40 rounded-xl p-2">
          {(showAllDates ? fullDateList : weekDates).map((d) => {
            const active =
              d.toISOString().slice(0, 10) ===
              selectedDate.toISOString().slice(0, 10);

            return (
              <button
                key={d.toISOString()}
                onClick={() => setSelectedDate(d)}
                className={clsx(
                  "rounded-lg py-2 text-sm transition",
                  active
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                <div>{format(d, "EEE")}</div>
                <div>{format(d, "d")}</div>
              </button>
            );
          })}
        </div>
      )}

      {isLoading && (
        <p className="text-center text-sm text-muted-foreground py-8">
          Memuat jadwal...
        </p>
      )}

      {!isLoading && filteredEvents.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-8">
          Tidak ada jadwal.
        </p>
      )}

      <div className="space-y-4">
        {filteredEvents.map((item) => {
          const dateObj = item.waktuVisit ? new Date(item.waktuVisit) : new Date();

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className={clsx(
                "rounded-xl p-4 border shadow-sm transition",
                item.status === "Terjadwal"
                  ? "bg-primary/10 border-primary/30"
                  : "bg-card border-border"
              )}
              onClick={() => onEdit(item)}
            >
              <div className="flex justify-between gap-3">
                <h3 className="font-semibold">
                  {item.namaDokter || "-"}
                </h3>
                <span className="text-sm text-muted-foreground">
                  {format(dateObj, "HH:mm")}
                </span>
              </div>

              <p className="text-sm text-muted-foreground">
                {item.rumahSakit || "-"}
              </p>

              <p className="text-sm mt-1">
                {item.note || "-"}
              </p>

              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                <Clock className="w-4 h-4" />
                {format(dateObj, "EEEE, dd MMM yyyy")}
              </div>

              <div className="mt-3 flex flex-wrap justify-end gap-2">
                {item.status === "Terjadwal" && onQuickStatus ? (
                  <>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onQuickStatus(item, "Selesai");
                      }}
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Selesai
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onQuickStatus(item, "Dibatalkan");
                      }}
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Batal
                    </Button>
                  </>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(item);
                  }}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(item.id);
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Hapus
                </Button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
