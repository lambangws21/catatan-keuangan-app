"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import {
  ClipboardList,
  Loader2,
  RefreshCw,
  CalendarDays,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import ScheduleForm from "@/components/visit-dokter/form-input";
import DailyTimelineView from "@/components/visit-dokter/daily-timeline-view";
import ScheduleSidebar from "@/components/visit-dokter/schedule-sidebar";
import MobileTimeline from "@/components/timeline/mobile-view";

import type { Schedule } from "@/types/visit-dokter";

export interface Doctor {
  id: string;
  namaDokter: string;
  rumahSakit: string[];
}

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [baseSchedules, setBaseSchedules] = useState<Schedule[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [notifEnabled, setNotifEnabled] = useState(false);

  const REMIND_WITHIN_MINUTES = 60;

  // ========================
  // ✅ GENERATE REPEAT EVENT
  // ========================
  const clampMonthlyOccurrence = (base: Date, year: number, monthIndex: number) => {
    const day = base.getDate();
    const hours = base.getHours();
    const minutes = base.getMinutes();
    const lastDay = new Date(year, monthIndex + 1, 0).getDate();

    const d = new Date(base);
    d.setFullYear(year);
    d.setMonth(monthIndex, Math.min(day, lastDay));
    d.setHours(hours, minutes, 0, 0);
    return d;
  };

  const generateRecurringEvents = (events: Schedule[]): Schedule[] => {
    const result: Schedule[] = [];

    events.forEach(event => {
      result.push({ ...event, sourceId: event.id, isVirtual: false });

      if (event.repeat === "monthly") {
        for (let i = 1; i <= 6; i++) {
          const base = new Date(event.waktuVisit);
          const y = base.getFullYear();
          const m = base.getMonth();
          const date = clampMonthlyOccurrence(base, y, m + i);

          result.push({
            ...event,
            id: `${event.id}-r${i}`,
            waktuVisit: date.toISOString(),
            sourceId: event.id,
            isVirtual: true,
          });
        }
      }
    });

    return result;
  };

  // ========================
  // ✅ FETCH DATA
  // ========================
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [scheduleRes, doctorRes] = await Promise.all([
        fetch("/api/visit-dokter"),
        fetch("/api/list-dokter"),
      ]);

      const scheduleData = await scheduleRes.json();
      const doctorData = await doctorRes.json();

      const base = Array.isArray(scheduleData) ? (scheduleData as Schedule[]) : [];
      setBaseSchedules(base);

      const expandedSchedules = generateRecurringEvents(
        base
      );

      setSchedules(expandedSchedules);
      setDoctors(Array.isArray(doctorData) ? doctorData : []);
    } catch (error) {
      console.error(error);
      toast.error("Gagal memuat data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setNotifEnabled("Notification" in window && Notification.permission === "granted");
  }, []);

  const nextUpcoming = useMemo(() => {
    const now = Date.now();
    return schedules
      .filter((s) => s.status === "Terjadwal")
      .filter((s) => new Date(s.waktuVisit).getTime() >= now)
      .sort((a, b) => new Date(a.waktuVisit).getTime() - new Date(b.waktuVisit).getTime())[0] ?? null;
  }, [schedules]);

  const upcomingSoon = useMemo(() => {
    const now = Date.now();
    const until = now + REMIND_WITHIN_MINUTES * 60_000;
    return schedules
      .filter((s) => s.status === "Terjadwal")
      .filter((s) => {
        const t = new Date(s.waktuVisit).getTime();
        return t >= now && t <= until;
      })
      .sort((a, b) => new Date(a.waktuVisit).getTime() - new Date(b.waktuVisit).getTime());
  }, [schedules]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!upcomingSoon.length) return;

    const s = upcomingSoon[0];
    const when = new Date(s.waktuVisit).getTime();
    const minutes = Math.max(0, Math.round((when - Date.now()) / 60_000));
    const key = `${s.id}:${s.waktuVisit}:${s.status}`;

    try {
      const last = sessionStorage.getItem("visit-reminder:last");
      if (last === key) return;
      sessionStorage.setItem("visit-reminder:last", key);
    } catch {
      // ignore
    }

    toast.message(
      `⏰ Ada jadwal visit${minutes ? ` ${minutes} menit lagi` : ""}: ${s.namaDokter ?? "-"} (${s.rumahSakit ?? "-"})`,
      { duration: 8000 }
    );

    if ("Notification" in window && Notification.permission === "granted") {
      try {
        new Notification("Reminder Visit Dokter", {
          body: `${s.namaDokter ?? "-"} • ${s.rumahSakit ?? "-"} • ${minutes} menit lagi`,
        });
      } catch {
        // ignore
      }
    }
  }, [upcomingSoon]);

  const requestBrowserNotification = async () => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) {
      toast.error("Browser tidak mendukung notifikasi.");
      return;
    }
    try {
      const p = await Notification.requestPermission();
      const ok = p === "granted";
      setNotifEnabled(ok);
      toast[ok ? "success" : "error"](ok ? "Notifikasi diaktifkan." : "Notifikasi ditolak.");
    } catch {
      toast.error("Gagal meminta izin notifikasi.");
    }
  };

  // ========================
  // DELETE
  // ========================
  const handleDeleteSchedule = async (id: string) => {
    try {
      const schedule = schedules.find((s) => s.id === id);
      const actualId = schedule?.isVirtual ? schedule.sourceId : id;

      if (!actualId) {
        toast.error("Jadwal tidak valid");
        return;
      }

      if (schedule?.isVirtual) {
        const ok = window.confirm(
          "Ini jadwal bulanan (virtual). Menghapus akan menghapus jadwal utama dan seluruh repeat. Lanjutkan?"
        );
        if (!ok) return;
      }

      const res = await fetch(`/api/visit-dokter/${actualId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Jadwal dihapus");
      fetchData();
    } catch {
      toast.error("Gagal menghapus jadwal");
    }
  };

  // ========================
  // EDIT
  // ========================
  const handleEdit = (schedule: Schedule) => {
    if (schedule.isVirtual && schedule.sourceId) {
      const original = baseSchedules.find((s) => s.id === schedule.sourceId);
      setEditingSchedule(original ?? schedule);
      return;
    }
    setEditingSchedule(schedule);
  };
  const closeEdit = () => setEditingSchedule(null);

  const handleFormSubmit = async () => {
    closeEdit();
    await fetchData();
  };

  const stats = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    const today = schedules.filter((s) => s.waktuVisit.slice(0, 10) === todayStr);
    const upcoming = schedules.filter((s) => new Date(s.waktuVisit).getTime() >= now.getTime());

    return {
      total: schedules.length,
      today: today.length,
      upcoming: upcoming.length,
      scheduled: schedules.filter((s) => s.status === "Terjadwal").length,
      done: schedules.filter((s) => s.status === "Selesai").length,
      canceled: schedules.filter((s) => s.status === "Dibatalkan").length,
    };
  }, [schedules]);

  const handleQuickStatus = useCallback(
    async (schedule: Schedule, nextStatus: "Selesai" | "Dibatalkan") => {
      const actualId = schedule.isVirtual ? schedule.sourceId : schedule.id;
      if (!actualId) return toast.error("Jadwal tidak valid");

      const targetSchedule =
        schedule.isVirtual && schedule.sourceId
          ? baseSchedules.find((s) => s.id === schedule.sourceId) ?? schedule
          : schedule;

      if (schedule.isVirtual) {
        toast.message("Jadwal bulanan: status diubah pada jadwal utama.");
      }

      try {
        const res = await fetch(`/api/visit-dokter/${actualId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            namaDokter: targetSchedule.namaDokter ?? "",
            rumahSakit: targetSchedule.rumahSakit ?? "",
            note: targetSchedule.note ?? "",
            waktuVisit: targetSchedule.waktuVisit,
            status: nextStatus,
            perawat: targetSchedule.perawat ?? "",
          }),
        });

        if (!res.ok) throw new Error("Gagal update status");
        toast.success(`Status diubah: ${nextStatus}`);
        await fetchData();
      } catch (err) {
        toast.error((err as Error).message);
      }
    },
    [baseSchedules, fetchData]
  );

  // ========================
  // DESKTOP MODE
  // ========================
  return (
    <div className="relative isolate">
      <div className="pointer-events-none absolute -top-24 right-[-10%] h-64 w-64 rounded-full bg-[radial-gradient(circle_at_center,rgba(20,184,166,0.20),transparent_65%)] blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 left-[-15%] h-72 w-72 rounded-full bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.18),transparent_70%)] blur-3xl" />

	      <div className="relative z-10 space-y-6 p-4 sm:p-6 lg:p-8 text-(--dash-ink)]">
	        <header className="rounded-3xl border border-white/10 bg-(--dash-surface)] p-5 sm:p-6 shadow-[0_20px_60px_rgba(2,6,23,0.45)] backdrop-blur">
	          <div className="flex flex-col gap-5">
	            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
	              <div>
                <p className="text-[10px] uppercase tracking-[0.4em] text-(--dash-muted)]">
                  Visit Dokter
                </p>
                <h1 className="mt-2 text-2xl sm:text-3xl font-semibold font-(--font-display)]">
                  Manajemen Jadwal Visit
                </h1>
                <p className="mt-2 text-sm text-(--dash-muted)]">
                  Kelola jadwal, status, repeat bulanan, dan pantau operator/perawat dengan cepat.
                </p>
              </div>

	              <div className="flex flex-wrap items-center gap-2">
	                <Button
	                  onClick={fetchData}
	                  variant="secondary"
	                  className="border border-white/10 bg-white/10 text-(--dash-ink)] hover:bg-white/15"
	                >
	                  <RefreshCw className="mr-2 h-4 w-4" />
	                  Refresh
	                </Button>
                  <Button
                    asChild
                    variant="secondary"
                    className="border border-white/10 bg-white/10 text-(--dash-ink)] hover:bg-white/15 text-slate-50"
                  >
                    <a href="/api/visit-dokter/ics" target="_blank" rel="noreferrer">
                      <CalendarDays className="mr-2 h-4 w-4" />
                      Export ICS
                    </a>
                  </Button>
	                <Button asChild variant="secondary" className="border border-white/10 bg-white/10 text-(--dash-ink)] hover:bg-white/15 text-slate-50">
	                  <Link href="/list-dokter">
	                    <ClipboardList className="mr-2 h-4 w-4" />
	                    List Dokter
	                  </Link>
	                </Button>
	                {!notifEnabled ? (
	                  <Button
	                    type="button"
	                    onClick={requestBrowserNotification}
	                    variant="secondary"
	                    className="border border-cyan-500/30 bg-cyan-500/15 text-(--dash-ink)] hover:bg-cyan-500/20"
	                  >
	                    Aktifkan Notifikasi
	                  </Button>
	                ) : null}
	                <ScheduleForm
	                  onFormSubmit={handleFormSubmit}
	                  doctorsList={doctors}
	                  schedulesList={baseSchedules}
	                />
	              </div>
	            </div>

	            {nextUpcoming ? (
	              <div className="rounded-2xl border border-cyan-500/25 bg-cyan-500/10 p-4">
	                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
	                  <div className="min-w-0">
	                    <p className="text-[10px] uppercase tracking-[0.4em] text-cyan-200/80">
	                      Pengingat
	                    </p>
	                    <p className="mt-1 truncate text-sm font-semibold text-(--dash-ink)]">
	                      Jadwal terdekat: {nextUpcoming.namaDokter ?? "-"} •{" "}
	                      {nextUpcoming.rumahSakit ?? "-"}
	                    </p>
	                    <p className="mt-1 text-xs text-(--dash-muted)]">
	                      {new Date(nextUpcoming.waktuVisit).toLocaleString("id-ID")}
	                    </p>
	                  </div>
	                  <div className="text-xs text-(--dash-muted)]">
	                    {upcomingSoon.length
	                      ? `Dalam ${REMIND_WITHIN_MINUTES} menit ada ${upcomingSoon.length} jadwal.`
	                      : null}
	                  </div>
	                </div>
	              </div>
	            ) : null}

	            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
	              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
	                <p className="text-[10px] uppercase tracking-[0.3em] text-(--dash-muted)]">
	                  Hari Ini
                </p>
                <p className="mt-2 text-lg font-semibold tabular-nums">
                  {stats.today}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-[10px] uppercase tracking-[0.3em] text-(--dash-muted)]">
                  Mendatang
                </p>
                <p className="mt-2 text-lg font-semibold tabular-nums">
                  {stats.upcoming}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-[10px] uppercase tracking-[0.3em] text-(--dash-muted)]">
                  Terjadwal
                </p>
                <p className="mt-2 text-lg font-semibold tabular-nums text-sky-300">
                  {stats.scheduled}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-[10px] uppercase tracking-[0.3em] text-(--dash-muted)]">
                  Selesai
                </p>
                <p className="mt-2 text-lg font-semibold tabular-nums text-emerald-300">
                  {stats.done}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-[10px] uppercase tracking-[0.3em] text-(--dash-muted)]">
                  Dibatalkan
                </p>
                <p className="mt-2 text-lg font-semibold tabular-nums text-rose-300">
                  {stats.canceled}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-[10px] uppercase tracking-[0.3em] text-(--dash-muted)]">
                  Total
                </p>
                <p className="mt-2 text-lg font-semibold tabular-nums">
                  {stats.total}
                </p>
              </div>
            </div>
          </div>
        </header>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 rounded-3xl border border-white/10 bg-(--dash-surface)] p-10 text-sm text-(--dash-muted)]">
          <Loader2 className="h-5 w-5 animate-spin" />
          Memuat jadwal...
        </div>
      ) : (
        <>
          {/* MOBILE */}
          <div className="lg:hidden">
            <Tabs defaultValue="timeline" className="gap-4">
              <TabsList className="w-full justify-start overflow-x-auto border border-white/10 bg-white/10 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <TabsTrigger value="timeline" className="min-w-[120px] text-xs bg-slate-900 text-slate-500 dark:bg-gray-800 dark:text-white">
                  Timeline
                </TabsTrigger>
                <TabsTrigger value="daftar" className="min-w-[120px] text-xs bg-slate-900 text-slate-500 dark:bg-gray-800 dark:text-white">
                  Daftar
                </TabsTrigger>
              </TabsList>

              <TabsContent value="timeline">
                <div className="rounded-3xl border border-white/10 bg-(--dash-surface)] p-5 shadow-[0_20px_60px_rgba(2,6,23,0.45)]">
                  <MobileTimeline
                    schedules={schedules}
                    isLoading={false}
                    doctors={doctors}
                    onRefresh={fetchData}
                    onEdit={handleEdit}
                    onDelete={handleDeleteSchedule}
                    onQuickStatus={handleQuickStatus}
                  />
                </div>
              </TabsContent>

              <TabsContent value="daftar">
                <ScheduleSidebar
                  schedules={schedules}
                  onEdit={handleEdit}
                  onDelete={handleDeleteSchedule}
                  onQuickStatus={handleQuickStatus}
                  sticky={false}
                />
              </TabsContent>
            </Tabs>
          </div>

          {/* DESKTOP */}
          <div className="hidden lg:flex gap-6">
            <div className="flex-1 min-w-0 rounded-3xl border border-white/10 bg-(--dash-surface)] p-5 shadow-[0_20px_60px_rgba(2,6,23,0.45)]">
              <DailyTimelineView
                schedulesData={schedules}
                onDataChange={fetchData}
                onEditSchedule={handleEdit}
              />
            </div>

            <div className="w-full lg:w-[380px]">
              <ScheduleSidebar
                schedules={schedules}
                onEdit={handleEdit}
                onDelete={handleDeleteSchedule}
                onQuickStatus={handleQuickStatus}
              />
            </div>
          </div>
        </>
      )}

      {/* MODAL EDIT */}
      <Dialog open={!!editingSchedule} onOpenChange={(open) => !open && closeEdit()}>
        <DialogContent className="sm:max-w-[560px] border-white/10 bg-(--dash-surface-strong)] text-(--dash-ink)]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-3">
              <span>Edit Jadwal Visit</span>
              {editingSchedule?.isVirtual ? (
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold text-(--dash-muted)]">
                  Bulanan (series)
                </span>
              ) : null}
            </DialogTitle>
          </DialogHeader>

          {editingSchedule ? (
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <p className="text-[10px] uppercase tracking-[0.3em] text-(--dash-muted)]">
                    Tanggal
                  </p>
                  <p className="mt-2 inline-flex items-center gap-2 text-sm font-semibold">
                    <CalendarDays className="h-4 w-4 text-cyan-300" />
                    <span className="tabular-nums">
                      {editingSchedule.waktuVisit.slice(0, 10)}
                    </span>
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <p className="text-[10px] uppercase tracking-[0.3em] text-(--dash-muted)]">
                    Jam
                  </p>
                  <p className="mt-2 inline-flex items-center gap-2 text-sm font-semibold">
                    <Clock className="h-4 w-4 text-cyan-300" />
                    {new Date(editingSchedule.waktuVisit).toLocaleTimeString(
                      "id-ID",
                      {
                        hour: "2-digit",
                        minute: "2-digit",
                      }
                    )}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <p className="text-[10px] uppercase tracking-[0.3em] text-(--dash-muted)]">
                    Status cepat
                  </p>
                  <div className="mt-2 flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="border border-white/10 bg-white/10 text-(--dash-ink)] hover:bg-white/15"
                      onClick={() => handleQuickStatus(editingSchedule, "Selesai")}
                      disabled={editingSchedule.status === "Selesai"}
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-300" />
                      Selesai
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="border border-white/10 bg-white/10 text-(--dash-ink)] hover:bg-white/15"
                      onClick={() => handleQuickStatus(editingSchedule, "Dibatalkan")}
                      disabled={editingSchedule.status === "Dibatalkan"}
                    >
                      <XCircle className="mr-2 h-4 w-4 text-rose-300" />
                      Batal
                    </Button>
                  </div>
                </div>
              </div>

              <ScheduleForm
                initialData={{
                  id: editingSchedule.id ?? "",
                  namaDokter: editingSchedule.namaDokter ?? "",
                  rumahSakit: editingSchedule.rumahSakit ?? "",
                  note: editingSchedule.note ?? "",
                  status: editingSchedule.status ?? "Terjadwal",
                  waktuVisit: editingSchedule.waktuVisit,
                  repeat: editingSchedule.repeat ?? "once",
                  perawat: editingSchedule.perawat ?? "",
                }}
                doctorsList={doctors}
                onFormSubmit={handleFormSubmit}
                schedulesList={baseSchedules}
              />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}
