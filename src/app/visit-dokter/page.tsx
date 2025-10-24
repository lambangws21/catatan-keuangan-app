"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, ClipboardList } from "lucide-react"; // Impor ikon
import Link from "next/link"; // Impor Link
import { Button } from "@/components/ui/button"; // Impor Button
import ScheduleManager from "@/components/visit-dokter/table-visit";
import ScheduleForm from "@/components/visit-dokter/form-input";


// Tipe data untuk jadwal
export interface Schedule {
  id: string;
  namaDokter: string;
  rumahSakit: string;
  waktuVisit: string;
  status: string;
}

// Tipe data baru untuk dokter
export interface Doctor {
  id: string;
  namaDokter: string;
  rumahSakit: string;
}

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]); // State baru untuk list dokter
  const [isLoading, setIsLoading] = useState(true);

  // Fungsi untuk mengambil SEMUA data yang diperlukan halaman ini
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Ambil data jadwal dan data dokter secara bersamaan
      // PERBAIKAN: Menggunakan path API yang konsisten
      const [schedulesRes, doctorsRes] = await Promise.all([
        fetch('/api/visit-dokter'),
        fetch('/api/list-dokter') // Mengambil list dokter utama
      ]);

      if (!schedulesRes.ok) throw new Error('Gagal mengambil data jadwal.');
      if (!doctorsRes.ok) throw new Error('Gagal mengambil daftar dokter.');

      const schedulesData = await schedulesRes.json();
      const doctorsData = await doctorsRes.json();

      setSchedules(schedulesData);
      setDoctors(doctorsData); // Simpan list dokter ke state
    } catch (error) {
      console.error(error);
      setSchedules([]);
      setDoctors([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
            <h1 className="text-3xl font-bold text-white">Manajemen Jadwal Visit</h1>
            <p className="text-gray-400">Atur semua jadwal visit dokter dan pertemuan penting Anda.</p>
        </div>
        
        {/* Grupkan tombol form dan link */}
        <div className="flex items-center gap-2">
            {/* Kirim list dokter ke form "Tambah Baru" */}
            <ScheduleForm onFormSubmit={fetchData} doctorsList={doctors} />
        
            {/* Link baru ke /doctors (sesuai halaman yang kita buat) */}
            <Button asChild variant="outline" className="font-bold md:rounded-lg rounded-full p-3 md:px-4 md:py-2 transition-all">
                <Link href="/list-dokter">
                    <ClipboardList className="h-5 w-5 md:mr-2" />
                    <span className="hidden md:inline">List Dokter</span>
                </Link>
            </Button>
        </div>
        
      </header>
      
      {isLoading ? (
        <div className="flex justify-center items-center p-16"><Loader2 className="h-8 w-8 animate-spin text-cyan-400" /></div>
      ) : (
        <ScheduleManager
          schedulesData={schedules}
          isLoading={isLoading}
          onDataChange={fetchData}
          doctorsList={doctors} // Kirim list dokter ke manager
        />
      )}
    </div>
  );
}

