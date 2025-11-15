'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { toast } from 'sonner';

// 🔹 Import library PDF
import jsPDF from 'jspdf';
import 'jspdf-autotable'; // 🔹 Impor autoTable (plugin untuk jsPDF)

// Import komponen UI
import OperationDashboard from '@/components/OperationDashboard';
import OperationManager from '@/components/OperationManager';
import OperationForm from '@/components/OperationForm';
import Spinner from '@/components/Spinner';

// Tipe data untuk operasi
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

// 🔹 Helper function untuk 'escape' data CSV
// ✅ FIX 1: Tipe 'any' diganti menjadi 'string | number'
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
      toast.error((error as Error).message || 'Gagal memuat data.');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // 🔹 FUNGSI BARU: Export ke Excel (Client-Side CSV)
  const handleExportExcel = useCallback(async () => {
    if (!user || operations.length === 0) return;
    
    setIsExporting(true);
    
    try {
      // 1. Tentukan Header
      const headers = ["ID", "Tanggal", "Dokter", "Tindakan Operasi", "Rumah Sakit", "Jumlah", "Klaim"];
      
      // 2. Ubah data JSON menjadi baris CSV
      const rows = operations.map(op =>
        [
          escapeCSV(op.id),
          escapeCSV(op.date),
          escapeCSV(op.dokter),
          escapeCSV(op.tindakanOperasi),
          escapeCSV(op.rumahSakit),
          escapeCSV(op.jumlah),
          escapeCSV(op.klaim)
        ].join(',')
      );
      
      // 3. Gabungkan header dan baris
      const csvContent = [headers.join(','), ...rows].join('\n');
      
      // 4. Buat Blob
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      
      // 5. Buat link download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `data_operasi_${new Date().toISOString().split('T')[0]}.csv`; // Nama file
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Data berhasil diekspor ke CSV!');
      
    } catch (error) {
      console.error('Export Excel Error:', error);
      toast.error((error as Error).message || 'Gagal mengekspor data ke Excel.'); 
    } finally {
      setIsExporting(false);
    }
  }, [user, operations]);

  // 🔹 FUNGSI BARU: Export ke PDF (Client-Side jsPDF)
  const handleExportPDF = useCallback(async () => {
    if (!user || operations.length === 0) return;
    
    setIsExporting(true);
    
    try {
      const doc = new jsPDF();
      
      // Tentukan kolom dan baris untuk tabel
      const tableCols = ["Tanggal", "Dokter", "Tindakan", "Rumah Sakit", "Jumlah", "Klaim", "Petugas Kamar Operasi"];
      const tableRows = operations.map(op => [
        op.date,
        op.dokter,
        op.tindakanOperasi, // Disingkat agar muat
        op.rumahSakit,
        op.jumlah,
        op.klaim,
        op.namaPerawat
      ]);

      // Tambahkan judul
      doc.text("Laporan Data Operasi", 14, 15);

      // Gunakan autoTable
      // ✅ FIX 2: Nonaktifkan ESLint untuk baris ini
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (doc as any).autoTable({
        head: [tableCols],
        body: tableRows,
        startY: 20, // Mulai tabel di bawah judul
        theme: 'striped',
        headStyles: { fillColor: [30, 64, 175] }, // Warna header (biru)
      });

      // Simpan file
      doc.save(`laporan_operasi_${new Date().toISOString().split('T')[0]}.pdf`);
      
      toast.success('Laporan berhasil diekspor ke PDF!');
      
    } catch (error) {
      console.error('Export PDF Error:', error);
      toast.error((error as Error).message || 'Gagal mengekspor laporan ke PDF.');
    } finally {
      setIsExporting(false);
    }
  }, [user, operations]);


  // useEffect untuk memantau auth (Tidak Berubah)
  useEffect(() => {
    if (loading) {
      return;
    }
    if (!loading && !user) {
      toast.error('Sesi Anda telah habis. Harap login kembali.');
      router.push('/login');
    }
  }, [user, loading, router]);

  // useEffect untuk fetch data (Tidak Berubah)
  useEffect(() => {
    if (!loading && user) {
      fetchOperations();
    }
  }, [user, loading, fetchOperations]);

  // Tampilan loading utama (Tidak Berubah)
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
        <div className="flex flex-col sm:flex-row gap-3">
            {/* Tombol Export (Tidak berubah, tapi sekarang memanggil fungsi baru) */}
            <button
                onClick={handleExportExcel}
                disabled={isLoading || isExporting || operations.length === 0}
                className="bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700 transition disabled:opacity-50 flex items-center justify-center"
            >
                {isExporting ? <Spinner size="sm" className="mr-2" /> : 'Export Excel'}
            </button>
             <button
                onClick={handleExportPDF}
                disabled={isLoading || isExporting || operations.length === 0}
                className="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700 transition disabled:opacity-50 flex items-center justify-center"
            >
                {isExporting ? <Spinner size="sm" className="mr-2" /> : 'Export PDF'}
            </button>
            
            <OperationForm onFormSubmit={fetchOperations} />
        </div>
      </header>

      <OperationDashboard operations={operations} isLoading={isLoading} />
      
      <OperationManager
        operationsData={operations}
        isLoading={isLoading}
        onDataChange={fetchOperations}
        user={user}
      />
    </div>
  );
}