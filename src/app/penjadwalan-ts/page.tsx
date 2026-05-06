"use client";

import { CalendarDays, Wrench } from "lucide-react";
import TechnicalSupportScheduleManager from "@/components/TechnicalSupportScheduleManager";

export default function PenjadwalanTeknikalSupportPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-(--dash-border) bg-(--dash-surface) p-5 text-(--dash-ink)">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Wrench className="h-6 w-6 text-cyan-300" />
          Penjadwalan Staff Teknikal Support
        </h1>
        <p className="mt-2 flex items-center gap-2 text-sm text-(--dash-muted)">
          <CalendarDays className="h-4 w-4" />
          Kelola agenda operasi, operator, lokasi rumah sakit, foto pre/post-op, dan catatan.
        </p>
      </div>
      <TechnicalSupportScheduleManager />
    </div>
  );
}
