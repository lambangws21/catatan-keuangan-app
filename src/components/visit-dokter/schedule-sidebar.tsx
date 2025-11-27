"use client";

import { useState, useMemo } from "react";
import { format } from "date-fns";
import type { Schedule } from "@/types/visit-dokter";
import { cn } from "@/lib/utils";
import {
  Trash2,
  Edit,
  BarChart3,
  CalendarClock,
  Search,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";

/* ================= UTIL ================= */

const getStatusIndicator = (status: string) => {
  const map: Record<string, string> = {
    Terjadwal: "bg-blue-500",
    Selesai: "bg-green-500",
    Dibatalkan: "bg-red-500",
  };
  return map[status] || "bg-gray-400";
};

interface ScheduleSidebarProps {
  schedules: Schedule[];
  onEdit: (schedule: Schedule) => void;
  onDelete: (scheduleId: string) => void;
}

type FilterMode = "upcoming" | "past" | "today";
type StatusFilter = "all" | "Terjadwal" | "Selesai" | "Dibatalkan";

/* ================= COMPONENT ================= */

export default function ScheduleSidebar({
  schedules,
  onEdit,
  onDelete,
}: ScheduleSidebarProps) {

  const now = useMemo(() => new Date(), []);
  const todayStr = format(now, "yyyy-MM-dd");

  const [filterMode, setFilterMode] = useState<FilterMode>("upcoming");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"compact" | "detail">("detail");

  /* ================= FILTER & SORT ================= */

  const filteredSchedules = useMemo(() => {
    const lowerSearch = searchTerm.toLowerCase().trim();

    return schedules
      .filter((s) => {
        const visitDate = new Date(s.waktuVisit);
        const dateStr = format(visitDate, "yyyy-MM-dd");

        // Filter waktu
        const passTime =
          filterMode === "today"
            ? dateStr === todayStr
            : filterMode === "upcoming"
            ? visitDate.getTime() >= now.getTime()
            : visitDate.getTime() < now.getTime();

        // Filter status
        const passStatus =
          statusFilter === "all" ? true : s.status === statusFilter;

        // Filter search
        const passSearch =
          lowerSearch.length === 0
            ? true
            : (s.namaDokter || "")
                .toLowerCase()
                .includes(lowerSearch) ||
              (s.rumahSakit || "")
                .toLowerCase()
                .includes(lowerSearch) ||
              (s.note || "").toLowerCase().includes(lowerSearch);

        return passTime && passStatus && passSearch;
      })
      .sort((a, b) => {
        const ta = new Date(a.waktuVisit).getTime();
        const tb = new Date(b.waktuVisit).getTime();

        if (filterMode === "past") {
          // histori → terbaru dulu
          return tb - ta;
        }
        // upcoming & today → terdekat dulu
        return ta - tb;
      });
  }, [schedules, filterMode, statusFilter, searchTerm, now, todayStr]);

  /* ================= NEXT UPCOMING ================= */

  const nextUpcoming = useMemo(() => {
    const upcoming = schedules
      .filter((s) => new Date(s.waktuVisit).getTime() >= now.getTime())
      .sort(
        (a, b) =>
          new Date(a.waktuVisit).getTime() -
          new Date(b.waktuVisit).getTime()
      );

    return upcoming[0] ?? null;
  }, [schedules, now]);

  /* ================= STATS ================= */

  const stats = useMemo(
    () => ({
      total: schedules.length,
      scheduled: schedules.filter((s) => s.status === "Terjadwal").length,
      done: schedules.filter((s) => s.status === "Selesai").length,
      canceled: schedules.filter((s) => s.status === "Dibatalkan").length,
    }),
    [schedules]
  );

  const StatBox = ({
    label,
    value,
    color,
    filter,
  }: {
    label: string;
    value: number;
    color: string;
    filter: StatusFilter;
  }) => (
    <motion.button
      type="button"
      whileTap={{ scale: 0.96 }}
      onClick={() => setStatusFilter(filter)}
      className={cn(
        "rounded-lg p-3 text-left text-xs transition-all border",
        statusFilter === filter
          ? "border-primary bg-primary/10"
          : "border-transparent hover:bg-muted/80",
        color
      )}
    >
      <p className="uppercase tracking-wide text-[10px] opacity-80">
        {label}
      </p>
      <p className="text-xl font-semibold leading-tight">{value}</p>
      <div className="mt-2 h-1 bg-muted rounded">
        <div
          className="h-full bg-primary rounded"
          style={{
            width: `${stats.total ? (value / stats.total) * 100 : 0}%`,
          }}
        />
      </div>
    </motion.button>
  );

  /* ================= RENDER ================= */

  return (
    <Card className="h-full sticky top-4 max-h-[calc(100vh-4rem)] overflow-y-auto bg-card border-border shadow-xl">
      <CardHeader className="space-y-4 border-b border-border/60">
        {/* TITLE */}
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-lg font-bold">
            <BarChart3 className="h-5 w-5 text-primary" />
            Jadwal Visit Dokter
          </CardTitle>

          <ToggleGroup
            type="single"
            value={viewMode}
            onValueChange={(v) => v && setViewMode(v as "compact" | "detail")}
            className="hidden md:flex"
          >
            <ToggleGroupItem value="compact" className="text-[11px] px-2">
              Ringkas
            </ToggleGroupItem>
            <ToggleGroupItem value="detail" className="text-[11px] px-2">
              Detail
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        {/* FILTER MODE WAKTU */}
        <ToggleGroup
          type="single"
          value={filterMode}
          onValueChange={(v) => v && setFilterMode(v as FilterMode)}
          className="justify-start gap-1 bg-muted/60 p-1 rounded-lg"
        >
          <ToggleGroupItem value="upcoming" className="text-xs px-2 py-1">
            Mendatang
          </ToggleGroupItem>
          <ToggleGroupItem value="today" className="text-xs px-2 py-1">
            <CalendarClock className="h-3 w-3 mr-1" />
            Hari Ini
          </ToggleGroupItem>
          <ToggleGroupItem value="past" className="text-xs px-2 py-1">
            Histori
          </ToggleGroupItem>
        </ToggleGroup>

        {/* SEARCH */}
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari dokter / RS / catatan..."
            className="pl-8 text-xs bg-background/60"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* STATS PANEL */}
        <div className="grid grid-cols-2 gap-2">
          <StatBox
            label="Terjadwal"
            value={stats.scheduled}
            color="text-blue-600 dark:text-blue-400"
            filter="Terjadwal"
          />
          <StatBox
            label="Selesai"
            value={stats.done}
            color="text-green-600 dark:text-green-400"
            filter="Selesai"
          />
          <StatBox
            label="Dibatalkan"
            value={stats.canceled}
            color="text-red-600 dark:text-red-400"
            filter="Dibatalkan"
          />
          <StatBox
            label="Total"
            value={stats.total}
            color="text-foreground"
            filter="all"
          />
        </div>

        {/* NEXT UPCOMING BANNER */}
        {nextUpcoming && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between gap-2 bg-primary/10 border border-primary/30 rounded-lg px-3 py-2"
          >
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wide text-primary/80 mb-0.5">
                Next Visit
              </span>
              <span className="text-xs font-semibold truncate">
                {nextUpcoming.namaDokter}
              </span>
              <span className="text-[11px] text-muted-foreground truncate">
                {format(new Date(nextUpcoming.waktuVisit), "EEE, dd MMM HH:mm")}
              </span>
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => setFilterMode("upcoming")}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </motion.div>
        )}
      </CardHeader>

      <CardContent className="divide-y divide-border/60 p-0">
        {filteredSchedules.length === 0 ? (
          <p className="text-center py-6 text-muted-foreground text-sm">
            Tidak ada jadwal untuk filter ini.
          </p>
        ) : (
          filteredSchedules.map((schedule) => (
            <SidebarItem
              key={schedule.id}
              schedule={schedule}
              onEdit={onEdit}
              onDelete={onDelete}
              viewMode={viewMode}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}

/* ================= ITEM ================= */

function SidebarItem({
  schedule,
  onEdit,
  onDelete,
  viewMode,
}: {
  schedule: Schedule;
  onEdit: (s: Schedule) => void;
  onDelete: (id: string) => void;
  viewMode: "compact" | "detail";
}) {
  const dateObj = new Date(schedule.waktuVisit);

  const containerClasses =
    "flex items-start gap-3 px-3 py-3 hover:bg-muted/70 transition cursor-pointer";

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={containerClasses}
    >
      {/* STATUS DOT */}
      <div
        className={cn(
          "w-2 h-2 rounded-full mt-2 flex-shrink-0",
          getStatusIndicator(schedule.status || "")
        )}
      />

      {/* MAIN CONTENT */}
      <div
        className="flex-1 min-w-0"
        onClick={() => onEdit(schedule)}
      >
        <div className="flex justify-between items-center gap-2">
          <p className="text-sm font-semibold truncate">
            {schedule.namaDokter}
          </p>
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
            {format(dateObj, "HH:mm")}
          </span>
        </div>

        <p className="text-[11px] text-muted-foreground truncate">
          {schedule.rumahSakit}
        </p>

        {viewMode === "detail" && (
          <>
            <p className="text-[11px] mt-0.5 line-clamp-2">
              {schedule.note}
            </p>
            <div className="flex justify-between items-center mt-1 text-[11px] text-muted-foreground">
              <span>{format(dateObj, "EEE, dd MMM yyyy")}</span>
              <span className="capitalize">
                {schedule.status || "Terjadwal"}
              </span>
            </div>
          </>
        )}
      </div>

      {/* ACTIONS */}
      <div className="flex flex-col gap-1 ml-1">
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(schedule);
          }}
        >
          <Edit className="h-4 w-4 text-yellow-500" />
        </Button>
        {schedule.id && (
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(schedule.id as string);
            }}
          >
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        )}
      </div>
    </motion.div>
  );
}
