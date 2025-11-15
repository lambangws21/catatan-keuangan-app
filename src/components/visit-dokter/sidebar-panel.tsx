"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import type { EventInput } from "@fullcalendar/core";

interface CalendarEvent extends EventInput {
  id?: string;
  title: string;
  start: string;
  end?: string;
  progress?: number;
  status?: string;
}

interface SidebarPanelProps {
  selectedEvent: CalendarEvent | null;
  onUpdate: (event: CalendarEvent | null, deleted?: boolean) => void;
}

export default function SidebarPanel({ selectedEvent, onUpdate }: SidebarPanelProps) {
  const [progress, setProgress] = useState<number>(selectedEvent?.progress || 0);
  const [status, setStatus] = useState<string>(selectedEvent?.status || "todo");

  if (!selectedEvent) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Pilih jadwal di kalender untuk melihat detail
      </div>
    );
  }

  const handleSave = async () => {
    const updated: CalendarEvent = { ...selectedEvent, progress, status };
    await fetch("/api/events", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    });
    onUpdate(updated);
  };

  const handleDelete = async () => {
    if (!selectedEvent?.id) return;
    await fetch("/api/events", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: selectedEvent.id }),
    });
    onUpdate(null, true);
  };

  return (
    <div className="space-y-4 text-foreground">
      {/* Title */}
      <h2 className="text-lg font-semibold">{selectedEvent.title}</h2>

      {/* STATUS */}
      <div>
        <Label>Status</Label>
        <RadioGroup
          value={status}
          onValueChange={setStatus}
          className="mt-2 space-y-2"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="todo" id="todo" />
            <Label htmlFor="todo">To Do</Label>
          </div>

          <div className="flex items-center space-x-2">
            <RadioGroupItem value="inprogress" id="inprogress" />
            <Label htmlFor="inprogress">In Progress</Label>
          </div>

          <div className="flex items-center space-x-2">
            <RadioGroupItem value="done" id="done" />
            <Label htmlFor="done">Done</Label>
          </div>
        </RadioGroup>
      </div>

      {/* PROGRESS */}
      <div>
        <Label>Progress</Label>

        <div className="flex items-center gap-2 mt-2">
          <Progress value={progress} className="w-[80%]" />
          <span className="text-sm text-muted-foreground">{progress}%</span>
        </div>

        <input
          type="range"
          min="0"
          max="100"
          step="10"
          value={progress}
          onChange={(e) => setProgress(Number(e.target.value))}
          className="
            w-full mt-2
            accent-primary 
            bg-muted 
            rounded-lg 
            cursor-pointer
          "
        />
      </div>

      {/* BUTTONS */}
      <div className="flex gap-2">
        <Button className="w-full" onClick={handleSave}>
          Simpan
        </Button>

        <Button variant="destructive" className="w-full" onClick={handleDelete}>
          Hapus
        </Button>
      </div>
    </div>
  );
}
