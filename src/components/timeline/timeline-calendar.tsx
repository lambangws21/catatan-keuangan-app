"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { motion } from "framer-motion";

export default function TimelineCalendar({
  selectedDate,
  onSelectDate,
}: {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
}) {
  const [month, setMonth] = useState(new Date());

  const days = eachDayOfInterval({
    start: startOfMonth(month),
    end: endOfMonth(month),
  });

  const goPrev = () => setMonth(new Date(month.setMonth(month.getMonth() - 1)));
  const goNext = () => setMonth(new Date(month.setMonth(month.getMonth() + 1)));

  return (
    <div className="rounded-xl bg-card p-4 shadow border border-border">
      {/* Header */}
      <div className="flex justify-between items-center mb-3">
        <button onClick={goPrev} className="p-2 hover:bg-muted rounded-lg">
          <ChevronLeft />
        </button>
        <h2 className="font-semibold">{format(month, "MMMM yyyy")}</h2>
        <button onClick={goNext} className="p-2 hover:bg-muted rounded-lg">
          <ChevronRight />
        </button>
      </div>

      {/* Grid tanggal */}
      <div className="grid grid-cols-7 gap-2 text-center text-xs">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="text-muted-foreground font-medium">
            {d}
          </div>
        ))}

        {days.map((day) => {
          const isActive =
            format(selectedDate, "yyyy-MM-dd") ===
            format(day, "yyyy-MM-dd");

          return (
            <motion.button
              whileTap={{ scale: 0.9 }}
              key={day.toISOString()}
              onClick={() => onSelectDate(day)}
              className={`h-9 w-9 flex items-center justify-center rounded-full text-sm
                ${
                  isActive
                    ? "bg-primary text-white"
                    : "hover:bg-muted text-foreground"
                }
              `}
            >
              {format(day, "d")}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
