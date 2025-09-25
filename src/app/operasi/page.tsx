"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";


// Import komponen UI baru
import OperationDashboard from "@/components/OperationDashboard";
import OperationManager from "@/components/OperationManager";
import OperationForm from "@/components/OperationForm";

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
  const { user } = useAuth();
  const [operations, setOperations] = useState<Operation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fungsi untuk mengambil data operasi dari API
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
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchOperations();
  }, [fetchOperations]);

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
      />
    </div>
  );
}
