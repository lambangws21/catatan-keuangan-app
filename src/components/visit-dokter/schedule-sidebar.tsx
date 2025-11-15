"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import type { Schedule } from "@/types/visit-dokter";
import { cn } from "@/lib/utils";
import {
  Trash2,
  Edit,
  Notebook,
  CalendarDays,
  Clock,
  History,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";

// Warna status mengikuti sistem + dark mode
const getStatusIndicator = (status: string) => {
  const map: Record<string, string> = {
    Terjadwal: "bg-blue-500",
    Selesai: "bg-green-500",
    Dibatalkan: "bg-red-500",
  };
  return map[status] || "bg-gray-400 dark:bg-gray-600";
};

interface ScheduleSidebarProps {
  schedules: Schedule[];
  onEdit: (schedule: Schedule) => void;
  onDelete: (scheduleId: string) => void;
}

type FilterMode = "upcoming" | "past";

export default function ScheduleSidebar({
  schedules,
  onEdit,
  onDelete,
}: ScheduleSidebarProps) {
  const [filterMode, setFilterMode] = useState<FilterMode>("upcoming");

  const handleDeleteClick = (
    e: React.MouseEvent,
    scheduleId?: string | null
  ) => {
    e.stopPropagation();
    if (!scheduleId) return;

    if (confirm("Yakin ingin menghapus jadwal ini?")) {
      onDelete(scheduleId);
    }
  };

  const now = Date.now();

  const filteredSchedules = schedules
    .filter((s) => {
      const t = new Date(s.waktuVisit).getTime();
      return filterMode === "upcoming" ? t >= now : t < now;
    })
    .sort((a, b) => {
      const ta = new Date(a.waktuVisit).getTime();
      const tb = new Date(b.waktuVisit).getTime();
      return filterMode === "upcoming" ? ta - tb : tb - ta;
    });

  const title =
    filterMode === "upcoming"
      ? "Jadwal Mendatang"
      : "Jadwal Sebelumnya (Histori)";

  return (
    <Card className="h-full sticky top-4 max-h-[calc(100vh-4rem)] overflow-y-auto border-border bg-card shadow-xl">
      <CardHeader className="py-4 border-b border-border/60">
        <CardTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
          {filterMode === "upcoming" ? (
            <Clock className="w-5 h-5 text-blue-500 dark:text-blue-400" />
          ) : (
            <History className="w-5 h-5 text-gray-500 dark:text-gray-300" />
          )}
          {title} ({filteredSchedules.length})
        </CardTitle>

        <ToggleGroup
          type="single"
          value={filterMode}
          onValueChange={(v) => v && setFilterMode(v as FilterMode)}
          className="justify-start gap-2 bg-muted p-1 rounded-lg"
        >
          <ToggleGroupItem
            value="upcoming"
            className="flex-1 text-sm h-8 rounded-md 
               data-[state=on]:bg-blue-600 
               data-[state=on]:text-white 
               data-[state=on]:shadow-md"
          >
            <CalendarDays className="h-4 w-4 mr-1" />
            Mendatang
          </ToggleGroupItem>

          <ToggleGroupItem
            value="past"
            className="flex-1 text-sm h-8 rounded-md 
               data-[state=on]:bg-gray-600 
               data-[state=on]:text-white 
               data-[state=on]:shadow-md"
          >
            <History className="h-4 w-4 mr-1" />
            Sebelumnya
          </ToggleGroupItem>
        </ToggleGroup>
      </CardHeader>

      <CardContent className="p-0">
        {filteredSchedules.length === 0 ? (
          <p className="text-center text-muted-foreground p-6 text-sm">
            {filterMode === "upcoming"
              ? "Tidak ada jadwal yang akan datang."
              : "Tidak ada jadwal yang telah selesai atau dibatalkan."}
          </p>
        ) : (
          <div className="divide-y divide-border/40">
            {filteredSchedules.map((schedule) => (
              <SidebarItem
                key={schedule.id}
                schedule={schedule}
                onEdit={onEdit}
                onDeleteClick={handleDeleteClick}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

//
// ITEM COMPONENT
//
function SidebarItem({
  schedule,
  onEdit,
  onDeleteClick,
}: {
  schedule: Schedule;
  onEdit: (s: Schedule) => void;
  onDeleteClick: (e: React.MouseEvent, id?: string) => void;
}) {
  const dateObj = new Date(schedule.waktuVisit || "");

  return (
    <div className="relative group flex items-center gap-3 p-3 transition-colors 
                    hover:bg-muted/60 dark:hover:bg-muted/40">
      {/* Klik = edit */}
      <div
        onClick={() => onEdit(schedule)}
        className="flex items-start gap-3 flex-1 min-w-0 pr-10 cursor-pointer"
      >
        {/* Status Indicator */}
        <div
          className={cn(
            "w-2 h-2 rounded-full mt-2 flex-shrink-0",
            getStatusIndicator(schedule.status || "")
          )}
        ></div>

        {/* Detail */}
        <div className="flex-1 min-w-0 text-foreground">
          <p className="text-sm font-semibold truncate">{schedule.namaDokter}</p>

          <p className="text-xs text-muted-foreground truncate">
            {schedule.rumahSakit}
          </p>

          <p className="flex items-center text-xs text-muted-foreground truncate">
            <Notebook className="w-3 h-3 mr-1" />
            {schedule.note}
          </p>

          <div className="flex justify-between items-center mt-1">
            <span className="text-xs font-medium text-primary">
              {format(dateObj, "EEE, d MMM")}
            </span>

            <span className="text-xs font-bold bg-muted text-foreground px-2 py-0.5 rounded-full">
              {format(dateObj, "HH:mm")}
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="
        absolute right-2 top-1/2 -translate-y-1/2 
        flex items-center gap-1 
        opacity-0 group-hover:opacity-100 
        transition-opacity
      ">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-red-500 hover:bg-red-500/15"
          onClick={(e) => onDeleteClick(e, schedule.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-yellow-500 hover:bg-yellow-500/15"
          onClick={() => onEdit(schedule)}
        >
          <Edit className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
