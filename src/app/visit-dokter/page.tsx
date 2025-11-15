"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, ClipboardList, Stethoscope, Hospital, Clock } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import ScheduleForm from "@/components/visit-dokter/form-input";
import DailyTimelineView from "@/components/visit-dokter/daily-timeline-view";
import ScheduleSidebar from "@/components/visit-dokter/schedule-sidebar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import type { Schedule } from "@/types/visit-dokter";

export interface Doctor {
  id: string;
  namaDokter: string;
  rumahSakit: string;
}

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [schedulesRes, doctorsRes] = await Promise.all([
        fetch("/api/visit-dokter"),
        fetch("/api/list-dokter"),
      ]);

      if (!schedulesRes.ok) throw new Error("Gagal mengambil data jadwal.");
      if (!doctorsRes.ok) throw new Error("Gagal mengambil daftar dokter.");

      const schedulesData = await schedulesRes.json();
      const doctorsData = await doctorsRes.json();

      setSchedules(schedulesData);
      setDoctors(doctorsData);
    } catch (error) {
      console.error(error);
      setSchedules([]);
      setDoctors([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleDeleteSchedule = async (scheduleId: string) => {
    try {
      const response = await fetch(`/api/visit-dokter/${scheduleId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Gagal menghapus jadwal.");
      }

      await fetchData();
      toast.success("Jadwal berhasil dihapus!");
    } catch (error) {
      console.error("Error deleting schedule:", error);
      toast.error(`Gagal menghapus: ${(error as Error).message}`);
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleEdit = (schedule: Schedule) => {
    setEditingSchedule(schedule);
  };

  const handleCloseEdit = () => {
    setEditingSchedule(null);
  };

  const handleFormSubmit = async () => {
    handleCloseEdit();
    await fetchData();
  };

  // --- DARK MODE FRIENDLY DETAILS ---
  const renderScheduleDetails = (schedule: Schedule) => {
    if (!schedule) return null;

    const date = new Date(schedule.waktuVisit);

    return (
      <div className="mt-4 p-3 bg-muted rounded-lg border border-border space-y-2 text-sm transition-colors">
        <div className="flex items-center text-foreground">
          <Stethoscope className="w-4 h-4 mr-2 text-primary" />
          <span className="font-semibold">{schedule.namaDokter}</span>
        </div>

        <div className="flex items-center text-muted-foreground">
          <Hospital className="w-4 h-4 mr-2 text-primary" />
          <span className="font-medium">{schedule.rumahSakit}</span>
        </div>

        <div className="flex items-center text-muted-foreground">
          <Clock className="w-4 h-4 mr-2 text-primary" />
          <span className="font-medium">
            {format(date, "EEEE, dd MMMM yyyy")} | {format(date, "HH:mm")}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 p-4 md:p-6 min-h-screen text-foreground bg-background">

      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 pb-4 border-b border-border">
        <div>
          <h1 className="text-3xl font-bold">Manajemen Jadwal Visit</h1>
          <p className="text-muted-foreground text-sm">
            Atur semua jadwal visit dokter secara terorganisir dan efisien.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <ScheduleForm onFormSubmit={handleFormSubmit} doctorsList={doctors} />

          <Button asChild variant="outline" className="font-semibold rounded-lg">
            <Link href="/list-dokter">
              <ClipboardList className="h-5 w-5 mr-2" />
              List Dokter
            </Link>
          </Button>
        </div>
      </header>

      {/* Loader */}
      {isLoading ? (
        <div className="flex justify-center items-center py-20 text-primary">
          <Loader2 className="h-8 w-8 animate-spin mr-2" />
          Memuat Jadwal...
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-6">

          {/* Timeline */}
          <div className="flex-1 w-full lg:w-2/3">
            <div className="rounded-xl shadow-md border border-border bg-card p-4">
              <DailyTimelineView
                schedulesData={schedules}
                onDataChange={fetchData}
                onEditSchedule={handleEdit}
              />
            </div>
          </div>

          {/* Sidebar */}
          <div className="w-full lg:w-1/3">
            <div className="rounded-xl shadow-md border border-border bg-card p-4">
              <ScheduleSidebar
                schedules={schedules}
                onEdit={handleEdit}
                onDelete={handleDeleteSchedule}
              />
            </div>
          </div>

        </div>
      )}

      {/* Modal Edit */}
      <Dialog open={!!editingSchedule} onOpenChange={(open) => !open && handleCloseEdit()}>
        <DialogContent className="sm:max-w-[480px] bg-card text-foreground border border-border rounded-xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-primary text-lg">
              Edit Jadwal Kunjungan
            </DialogTitle>

            {editingSchedule && (
              <div className="mt-3 bg-muted p-3 rounded-lg border border-border">
                {renderScheduleDetails(editingSchedule)}
              </div>
            )}
          </DialogHeader>

          {editingSchedule && (
            <ScheduleForm
              onFormSubmit={handleFormSubmit}
              doctorsList={doctors}
              initialData={editingSchedule}
            />
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
