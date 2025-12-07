'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { toast } from 'sonner';

import jsPDF from 'jspdf';
import 'jspdf-autotable';

import OperationDashboard from '@/components/OperationDashboard';
import OperationManager from '@/components/OperationManager';
import OperationForm from '@/components/OperationForm';
import Spinner from '@/components/Spinner';

// ======================
// ✅ TYPE
// ======================
export interface Operation {
  id: string;
  date: string;
  dokter: string;
  tindakanOperasi: string;
  rumahSakit: string;
  jumlah: number;
  klaim: string;
  namaPerawat: string;
}

// ======================
// ✅ CSV ESCAPER
// ======================
const escapeCSV = (str: string | number): string => {
  let value = String(str);
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    value = '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
};

export default function OperationsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [operations, setOperations] = useState<Operation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // ======================
  // ✅ FETCH DATA
  // ======================
  const fetchOperations = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/operasi', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Gagal mengambil data operasi.');
      const data = await response.json();
      setOperations(data);
    } catch (error) {
      setOperations([]);
      toast.error((error as Error).message || 'Gagal memuat data.');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // ======================
  // ✅ EXPORT CSV
  // ======================
  const handleExportExcel = useCallback(async () => {
    if (!user || operations.length === 0) return;
    setIsExporting(true);

    try {
      const headers = ["ID", "Tanggal", "Dokter", "Tindakan Operasi", "Rumah Sakit", "Jumlah", "Klaim"];

      const rows = operations.map(op =>
        [
          escapeCSV(op.id),
          escapeCSV(op.date),
          escapeCSV(op.dokter),
          escapeCSV(op.tindakanOperasi),
          escapeCSV(op.rumahSakit),
          escapeCSV(op.jumlah),
          escapeCSV(op.klaim),
        ].join(',')
      );

      const csvContent = [headers.join(','), ...rows].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `data_operasi_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast.success('✅ Export CSV berhasil!');
    } catch (error) {
      toast.error('❌ Gagal export CSV');
    } finally {
      setIsExporting(false);
    }
  }, [user, operations]);

  // ======================
  // ✅ EXPORT PDF
  // ======================
  const handleExportPDF = useCallback(async () => {
    if (!user || operations.length === 0) return;
    setIsExporting(true);

    try {
      const doc = new jsPDF();

      const tableCols = ["Tanggal", "Dokter", "Tindakan", "Rumah Sakit", "Jumlah", "Klaim", "Perawat"];
      const tableRows = operations.map(op => [
        op.date,
        op.dokter,
        op.tindakanOperasi,
        op.rumahSakit,
        op.jumlah,
        op.klaim,
        op.namaPerawat,
      ]);

      doc.text("LAPORAN DATA OPERASI", 14, 15);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (doc as any).autoTable({
        head: [tableCols],
        body: tableRows,
        startY: 20,
        theme: 'striped',
        headStyles: { fillColor: [30, 64, 175] },
      });

      doc.save(`laporan_operasi_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('✅ Export PDF berhasil!');
    } catch (error) {
      toast.error('❌ Gagal export PDF');
    } finally {
      setIsExporting(false);
    }
  }, [user, operations]);

  // ======================
  // ✅ AUTH CHECK
  // ======================
  useEffect(() => {
    if (!loading && !user) {
      toast.error('Sesi habis, silakan login kembali');
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!loading && user) {
      fetchOperations();
    }
  }, [user, loading, fetchOperations]);

  if (loading || !user) {
    return (
      <div className="flex justify-center items-center min-h-[70vh]">
        <Spinner />
      </div>
    );
  }

  // ======================
  // ✅ UI FINAL
  // ======================
  return (
    <div className="space-y-8">
      {/* ================= HEADER ================= */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Manajemen Operasi
          </h1>
          <p className="text-gray-400">
            Pantau, edit, filter, dan export seluruh data operasi.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleExportExcel}
            disabled={isExporting || operations.length === 0}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold disabled:opacity-50"
          >
            {isExporting ? 'Exporting...' : 'Export Excel'}
          </button>

          <button
            onClick={handleExportPDF}
            disabled={isExporting || operations.length === 0}
            className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold disabled:opacity-50"
          >
            {isExporting ? 'Exporting...' : 'Export PDF'}
          </button>

          <OperationForm onFormSubmit={fetchOperations} />
        </div>
      </div>

      {/* ================= DASHBOARD ================= */}
      <OperationDashboard operations={operations} isLoading={isLoading} />

      {/* ================= TABLE + FILTER ================= */}
      <OperationManager
        operationsData={operations}
        isLoading={isLoading}
        onDataChange={fetchOperations}
        user={user}
      />
    </div>
  );
}
