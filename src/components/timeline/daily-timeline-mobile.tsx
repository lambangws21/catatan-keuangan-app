"use client";

import { motion } from "framer-motion";
import { format } from "date-fns";
import {  Circle } from "lucide-react";

export interface TimelineItem {
  id: string;
  title: string;
  subtitle?: string;
  time: string;
  date: string;
  icon?: string;
  members?: string[];
  highlight?: boolean;
}

export default function DailyTimelineMobile({
  items,
  selectedDate,
}: {
  items: TimelineItem[];
  selectedDate: Date;
}) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(selectedDate);
    day.setDate(day.getDate() - day.getDay() + i);
    return day;
  });

  return (
    <div className="w-full max-w-md mx-auto p-4">
      {/* Header tanggal */}
      <div className="mb-4">
        <p className="text-muted-foreground text-sm">
          {format(selectedDate, "MMMM d, yyyy")}
        </p>
        <h1 className="text-3xl font-bold">Today</h1>
      </div>

      {/* Days navigation */}
      <div className="flex justify-between mb-6 text-center text-sm">
        {days.map((d) => {
          const isActive = format(d, "d") === format(selectedDate, "d");
          return (
            <div key={d.toISOString()} className="flex flex-col items-center">
              <span
                className={`${
                  isActive ? "text-primary font-bold" : "text-muted-foreground"
                }`}
              >
                {format(d, "EEE")}
              </span>
              <span
                className={`mt-1 h-7 w-7 flex items-center justify-center rounded-full ${
                  isActive
                    ? "bg-primary text-white"
                    : "text-muted-foreground"
                }`}
              >
                {format(d, "d")}
              </span>
            </div>
          );
        })}
      </div>

      {/* Timeline list */}
      <div className="relative pl-6 border-l-2 border-muted/40">
        {items.map((item) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="relative mb-6"
          >
            {/* Dot indicator */}
            <div className="absolute -left-[11px] top-2">
              <Circle
                size={14}
                className={`${
                  item.highlight
                    ? "text-primary fill-primary"
                    : "text-muted-foreground"
                }`}
              />
            </div>

            {/* Card */}
            <div
              className={`rounded-xl p-4 shadow-sm border transition 
              ${
                item.highlight
                  ? "bg-primary text-white"
                  : "bg-card text-foreground border-border"
              }`}
            >
              <div className="flex justify-between items-start mb-1">
                <p className="font-semibold text-sm">{item.title}</p>
                <p className="text-xs opacity-80">{item.time}</p>
              </div>

              {item.subtitle && (
                <p
                  className={`text-xs ${
                    item.highlight
                      ? "text-white/90"
                      : "text-muted-foreground"
                  }`}
                >
                  {item.subtitle}
                </p>
              )}

              {item.members && item.members.length > 0 && (
                <div className="flex mt-2 space-x-1">
                  {item.members.map((m, i) => (
                    <span key={i} className="text-xl">
                      {m}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Add Button */}
      <div className="flex justify-center pt-4">
        <button className="w-12 h-12 bg-primary text-white rounded-full shadow-lg text-3xl font-bold">
          +
        </button>
      </div>
    </div>
  );
}
