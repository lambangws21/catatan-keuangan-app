"use client";

import React, { useState, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { EventInput, DateSelectArg, EventClickArg } from "@fullcalendar/core";

interface CalendarEvent extends EventInput {
  id?: string;
  title: string;
  start: string;
  end?: string;
  progress?: number;
  status?: string;
}

export default function VisitCalendar({
  onSelectEvent,
}: {
  onSelectEvent: (event: CalendarEvent) => void;
}) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  useEffect(() => {
    fetch("/api/events")
      .then((res) => res.json())
      .then((data) => setEvents(data))
      .catch((err) => console.error("Error fetching events:", err));
  }, []);

  const handleDateSelect = async (info: DateSelectArg) => {
    const title = prompt("Masukkan nama jadwal:");
    if (title) {
      const newEvent: CalendarEvent = {
        title,
        start: info.startStr,
        end: info.endStr,
        progress: 0,
        status: "todo",
      };

      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newEvent),
      });
      const saved = await res.json();
      setEvents((prev) => [...prev, saved]);
    }
  };

  const handleEventClick = (info: EventClickArg) => {
    const clicked = events.find((e) => e.id === info.event.id);
    if (clicked) onSelectEvent(clicked);
  };

  return (
    <FullCalendar
      plugins={[timeGridPlugin, interactionPlugin]}
      initialView="timeGridWeek"
      selectable={true}
      select={handleDateSelect}
      eventClick={handleEventClick}
      events={events}
      slotMinTime="08:00:00"
      slotMaxTime="18:00:00"
      allDaySlot={false}
      height="auto"
      headerToolbar={false}
    />
  );
}
