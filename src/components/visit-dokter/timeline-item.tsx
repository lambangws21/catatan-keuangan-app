"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  NotebookPen,
  Star,
  XCircle,
  CheckCircle,
} from "lucide-react";

import type { Schedule } from "@/types/visit-dokter";


interface TimelineItemProps {
  schedule: Schedule;           // TERIMA Schedule (TimelineEvent juga kompatibel)
  isFocused?: boolean;
  onClick: (schedule: Schedule) => void; 
}

// --- STATUS STYLE MAP ---
const getStatusStyles = (status?: string) => {
  switch (status) {
    case "Terjadwal":
      return "bg-blue-600 text-white border-blue-700 dark:bg-blue-700/80 hover:bg-blue-700";
    case "Selesai":
      return "bg-green-600 text-white border-green-700 dark:bg-green-700/80 hover:bg-green-700";
    case "Dibatalkan":
      return "bg-red-600 text-white border-red-700 dark:bg-red-700/80 hover:bg-red-700";
    default:
      return "bg-amber-500 text-white border-amber-600 dark:bg-amber-600/80 hover:bg-amber-600";
  }
};

export function TimelineItem({
  schedule,
  isFocused = false,
  onClick,
}: TimelineItemProps) {
  const time = format(new Date(schedule.waktuVisit), "HH:mm");
  const styles = getStatusStyles(schedule.status);

  const showSpecialContent =
    schedule.status === "Selesai" || schedule.status === "Dibatalkan";

  const SpecialIcon =
    schedule.status === "Selesai"
      ? CheckCircle
      : schedule.status === "Dibatalkan"
      ? XCircle
      : Star;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02, zIndex: 20 }}
      transition={{ type: "spring", stiffness: 260, damping: 30 }}
      onClick={() => onClick(schedule)}
      className={cn(
        "w-full p-2 rounded-xl cursor-pointer select-none relative group transition-all duration-300 border",
        styles,
        isFocused ? "scale-[1.03] ring-2 ring-white/20" : "hover:shadow-xl",
        showSpecialContent ? "min-h-[75px]" : "min-h-[50px]"
      )}
    >
      {/* --- TOOLTIP DETAIL --- */}
      <div className="absolute top-0 left-full ml-4 p-3 w-64 bg-gray-900 text-white rounded-lg shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-50 border border-gray-700 hidden sm:block">
        <h4 className="text-sm font-bold text-cyan-400 border-b border-gray-700 pb-1 mb-1">
          Detail Jadwal
        </h4>

        <div className="text-xs space-y-1">
          <p>
            <span className="text-gray-400">Dokter:</span> {schedule.namaDokter ?? "-"}
          </p>
          <p>
            <span className="text-gray-400">RS:</span> {schedule.rumahSakit ?? "-"}
          </p>
          <p>
            <span className="text-gray-400">Perawat:</span> {schedule.perawat ?? "Belum ditentukan"}
          </p>
          <p>
            <span className="text-gray-400">Waktu:</span>{" "}
            {format(new Date(schedule.waktuVisit), "dd MMM yyyy, HH:mm")}
          </p>

          {schedule.note && (
            <p className="pt-1 border-t border-gray-700">
              <span className="text-gray-400">Catatan:</span> {schedule.note}
            </p>
          )}
        </div>

        {/* segitiga */}
        <div className="absolute left-[-8px] top-3 w-0 h-0 border-t-8 border-t-transparent border-b-8 border-b-transparent border-r-8 border-r-gray-900"></div>
      </div>

      {/* --- MAIN CONTENT --- */}
      <div className="flex justify-between items-start gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold truncate text-white">
            {schedule.namaDokter ?? "Dokter Tidak Diketahui"}
          </h3>
          <p className="text-xs text-white/80 truncate">
            {schedule.rumahSakit ?? "Rumah Sakit Tidak Diketahui"}
          </p>
          <p className="text-[11px] text-white/60 truncate">
            Perawat: {schedule.perawat ?? "Belum ditentukan"}
          </p>
        </div>

        <span className="font-semibold text-sm text-white">{time}</span>
      </div>

      {/* --- SPECIAL CONTENT (SELESAI / DIBATALKAN) --- */}
      {showSpecialContent && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          transition={{ duration: 0.25 }}
          className="flex justify-between items-center mt-2 pt-2 border-t border-white/30"
        >
          <div className="flex items-center gap-1.5 text-xs text-white/90 truncate">
            <NotebookPen className="w-3 h-3 text-white" />
            {schedule.note || schedule.status}
          </div>

          <div className="p-1 bg-white/20 rounded-full">
            <SpecialIcon className="w-3 h-3 text-white" />
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
