"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, ClipboardList } from "lucide-react"; // Clock dihapus
import Link from "next/link"; 
import { Button } from "@/components/ui/button"; 
// Card komponen dihapus karena hanya digunakan di ScheduleSidebar
import ScheduleForm from "@/components/visit-dokter/form-input"; 
import DailyTimelineView from "@/components/visit-dokter/daily-timeline-view"; 
import ScheduleSidebar from "@/components/visit-dokter/schedule-sidebar"; 
import {toast} from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"; 
// format dihapus


// --- TIPE DATA UTAMA ---
export interface Schedule {
  id: string;
  namaDokter: string;
  rumahSakit: string;
  waktuVisit: string;
  note: string;
  status: string;
}

export interface Doctor {
  id: string;
  namaDokter: string;
  rumahSakit: string;
}
// --- AKHIR TIPE DATA ---


export default function SchedulesPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]); 
  const [isLoading, setIsLoading] = useState(true);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [schedulesRes, doctorsRes] = await Promise.all([
        fetch('/api/visit-dokter'),
        fetch('/api/list-dokter') 
      ]);

      if (!schedulesRes.ok) throw new Error('Gagal mengambil data jadwal.');
      if (!doctorsRes.ok) throw new Error('Gagal mengambil daftar dokter.');

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

  // 💡 FUNGSI DELETE YANG HILANG
  const handleDeleteSchedule = async (scheduleId: string) => {
    try {
      const response = await fetch(`/api/visit-dokter/${scheduleId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Gagal menghapus jadwal.");
      }

      // Setelah berhasil menghapus, muat ulang data jadwal
      await fetchData(); 
      toast.success("Jadwal berhasil dihapus!");
      
    } catch (error) {
      console.error("Error deleting schedule:", error);
      // Gunakan toast jika diimpor, jika tidak, gunakan alert
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
  }

  return (
    <div className="space-y-8 p-4 md:p-8 bg-background min-h-screen text-foreground">
      <header className="flex flex-col md:flex-row justify-between items-center gap-4 pb-4 border-b border-border">
        <div>
            <h1 className="text-3xl font-bold text-foreground">Manajemen Jadwal Visit</h1>
            <p className="text-muted-foreground">Atur semua jadwal visit dokter dan pertemuan penting Anda.</p>
        </div>
        
        {/* Grupkan tombol form dan link */}
        <div className="flex items-center gap-2">
            {/* Form Tambah Baru */}
            <ScheduleForm onFormSubmit={handleFormSubmit} doctorsList={doctors} />
        
            {/* Link List Dokter */}
            <Button asChild variant="outline" className="font-bold transition-all">
                <Link href="/list-dokter">
                    <ClipboardList className="h-5 w-5 mr-2" />
                    List Dokter
                </Link>
            </Button>
        </div>
        
      </header>
      
      {isLoading ? (
        <div className="flex justify-center items-center p-16 text-primary">
            <Loader2 className="h-8 w-8 animate-spin mr-2" /> Memuat Jadwal...
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-8">
            
            {/* Kolom Kiri: Daily Timeline */}
            <div className="flex-1 lg:w-2/3">
                <DailyTimelineView
                   schedulesData={schedules}
                   onDataChange={fetchData}
                   onEditSchedule={handleEdit}
                />
            </div>

            {/* Kolom Kanan: Sidebar Jadwal */}
            <div className="w-full lg:w-1/3">
                <ScheduleSidebar 
                    schedules={schedules} 
                    onEdit={handleEdit} 
                    onDelete={handleDeleteSchedule}
                />
            </div>
        </div>
      )}
      
      {/* Modal/Dialog Edit Jadwal */}
      <Dialog open={!!editingSchedule} onOpenChange={(open) => !open && handleCloseEdit()}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-slate-400">{editingSchedule ? "Edit Jadwal" : "Tambah Jadwal"}</DialogTitle>
            <DialogDescription className="text-slate-400">
              {editingSchedule 
                ? "Ubah detail jadwal kunjungan dokter. Klik tombol Simpan setelah selesai, atau Hapus untuk membatalkan."
                : "Isi detail jadwal kunjungan dokter baru Anda."
              }
            </DialogDescription>
            
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
