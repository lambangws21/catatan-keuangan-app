"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2 } from "lucide-react";
import DoctorList from "@/components/visit-dokter/list-dokter-tabel";
import DoctorForm from "@/components/visit-dokter/form-input-dokter";

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
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
            <h1 className="text-3xl font-bold text-white">Manajemen Daftar Dokter</h1>
            <p className="text-gray-400">Kelola daftar utama dokter dan rumah sakit.</p>
        </div>
        <DoctorForm onDoctorAdded={fetchDoctors} />
      </header>
      
      {isLoading ? (
        <div className="flex justify-center items-center p-16"><Loader2 className="h-8 w-8 animate-spin text-cyan-400" /></div>
      ) : (
        <DoctorList
          doctorsData={doctors}
          isLoading={isLoading}
          onDataChange={fetchDoctors}
        />
      )}
    </div>
  );
}
