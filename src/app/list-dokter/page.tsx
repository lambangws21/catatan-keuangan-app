"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2 } from "lucide-react";
import DoctorList from "@/components/visit-dokter/list-dokter-tabel";
import DoctorForm from "@/components/visit-dokter/form-input-dokter";
import NurseLister from "@/components/nurse-list/nurse-lister";

// Tipe data untuk dokter
export interface Doctor {
  id: string;
  namaDokter: string;
  rumahSakit: string;
}

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fungsi untuk mengambil data dokter dari API
  const fetchDoctors = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/list-dokter');
      if (!response.ok) throw new Error('Gagal mengambil daftar dokter.');
      const data = await response.json();
      setDoctors(data);
    } catch (error) {
      console.error(error);
      setDoctors([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDoctors();
  }, [fetchDoctors]);

  return (
    // 'space-y-8' akan memberi jarak antara header dan kontainer flex di bawah
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
            <h1 className="text-3xl font-bold text-white">Manajemen Daftar Dokter</h1>
            <p className="text-gray-400">Kelola daftar utama dokter dan rumah sakit.</p>
        </div>
        <DoctorForm onDoctorAdded={fetchDoctors} />
      </header>
      
      {/* PERUBAHAN DIMULAI DI SINI:
        - Kita buat kontainer flex baru
        - 'flex-col' untuk mobile (bertumpuk)
        - 'md:flex-row' untuk desktop (berdampingan)
        - 'gap-8' untuk memberi jarak antar komponen
      */}
      <div className="flex flex-col md:flex-row gap-8">
        
        {/* Kolom 1: Daftar Dokter (60% lebar di desktop) */}
        <div className="w-full md:w-3/5">
          {isLoading ? (
            <div className="flex justify-center items-center p-16">
              <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
            </div>
          ) : (
            <DoctorList
              doctorsData={doctors}
              isLoading={isLoading}
              onDataChange={fetchDoctors}
            />
          )}
        </div>

        {/* Kolom 2: Daftar Perawat (40% lebar di desktop) */}
        <div className="w-full md:w-2/5">
          <NurseLister />
        </div>
        
      </div>
      {/* PERUBAHAN SELESAI */}
      
    </div>
  );
}