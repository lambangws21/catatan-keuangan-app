"use client";

import { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  ListPlus,
} from "lucide-react";
import clsx from "clsx";
import ScheduleForm from "@/components/visit-dokter/form-input";

interface TimelineItem {
  id: string;
  namaDokter?: string;
  rumahSakit?: string;
  note?: string;
  waktuVisit?: string;
  status?: string;
}

export default function TimelinePage() {
  const [allEvents, setAllEvents] = useState<TimelineItem[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState(true);

  const [showAllDates, setShowAllDates] = useState(false);
  const [showAllEvents, setShowAllEvents] = useState(false);

  const fetchEvents = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/visit-dokter");
      const data = await res.json();
      setAllEvents(Array.isArray(data) ? data : []);
    } catch {
      setAllEvents([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  // ✅ FILTER EVENT BY DATE ATAU ALL
  const filteredEvents = useMemo(() => {
    if (showAllEvents) return allEvents;

    const d = selectedDate.toISOString().slice(0, 10);

    return allEvents.filter(
      (item) =>
        item?.waktuVisit &&
        item.waktuVisit.split("T")[0] === d
    );
  }, [selectedDate, allEvents, showAllEvents]);

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
    <div className="p-5 max-w-2xl mx-auto space-y-5 min-h-screen">

      {/* HEADER */}
      <header className="flex justify-between items-start">
        <div>
          <p className="text-xs text-muted-foreground">
            {format(selectedDate, "MMMM dd, yyyy")}
          </p>
          <h1 className="text-2xl font-bold">
            {showAllEvents ? "Semua Jadwal" : "Jadwal Hari Ini"}
          </h1>
        </div>

        <ScheduleForm onFormSubmit={fetchEvents} doctorsList={[]} />
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
          const dateObj = item.waktuVisit
            ? new Date(item.waktuVisit)
            : new Date();

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
            >
              <div className="flex justify-between">
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
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
