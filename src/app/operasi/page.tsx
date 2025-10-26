"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider"; // Menggunakan provider Anda
import { toast } from "sonner";

// Import komponen UI
import OperationDashboard from "@/components/OperationDashboard";
import OperationManager from "@/components/OperationManager";
import OperationForm from "@/components/OperationForm";
import Spinner from "@/components/Spinner"; 

// Tipe data untuk operasi
export interface Operation {
  id: string;
  date: string;
  dokter: string;
  tindakanOperasi: string;
  rumahSakit: string;
  jumlah: number; 
  klaim: string;
}


export default function OperationsPage() {
  // PERBAIKAN: Menggunakan 'loading' sesuai AuthProvider Anda
  const { user, loading } = useAuth(); 
  const router = useRouter();

  const [operations, setOperations] = useState<Operation[]>([]);
  const [isLoading, setIsLoading] = useState(true); // Loading untuk data fetch

  const fetchOperations = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/operasi', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Gagal mengambil data operasi.');
      const data = await response.json();
      setOperations(data);
    } catch (error) {
      console.error(error);
      setOperations([]);
      toast.error((error as Error).message || "Gagal memuat data.");
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // useEffect untuk memantau auth
  useEffect(() => {
    // PERBAIKAN: Menggunakan 'loading'
    if (loading) {
      return; // Tunggu sampai auth selesai memeriksa
    }
    // PERBAIKAN: Menggunakan 'loading'
    if (!loading && !user) {
      toast.error("Sesi Anda telah habis. Harap login kembali.");
      router.push("/login"); 
    }
  }, [user, loading, router]); // PERBAIKAN: Dependensi diubah ke 'loading'

  // useEffect untuk fetch data
  useEffect(() => {
    // PERBAIKAN: Menggunakan 'loading'
    if (!loading && user) {
      fetchOperations();
    }
  }, [user, loading, fetchOperations]); // PERBAIKAN: Dependensi diubah ke 'loading'

  // Tampilan loading utama
  // PERBAIKAN: Menggunakan 'loading'
  if (loading || !user) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-200px)]">
        <Spinner />
      </div>
    );
  }

  // Render halaman
  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
            <h1 className="text-3xl font-bold text-white">Manajemen Operasi</h1>
            <p className="text-gray-400">Lacak semua data terkait tindakan operasi.</p>
        </div>
        <OperationForm onFormSubmit={fetchOperations} />
      </header>

      <OperationDashboard operations={operations} isLoading={isLoading} />
      
      <OperationManager
        operationsData={operations}
        isLoading={isLoading}
        onDataChange={fetchOperations}
        user={user} // Prop 'user' ini penting untuk perbaikan file kedua
      />
    </div>
  );
}