'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, FileDown, FileText, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import OperasiGoogleForm from '@/components/operasi/GoogleFormTabs';
import { AnimatePresence, motion } from 'framer-motion';

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
  const [googleFormState, setGoogleFormState] = useState<'open' | 'minimized'>('minimized');
  const isGoogleFormOpen = googleFormState === 'open';
  const setGoogleFormOpen = (open: boolean) => setGoogleFormState(open ? 'open' : 'minimized');

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

      const rows = operations
        .slice()
        .sort((a, b) => a.date.localeCompare(b.date))
        .map(op =>
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
    } catch  {
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
    } catch  {
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

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isMobile = window.matchMedia('(max-width: 767px)').matches;
    if (!isMobile || !isGoogleFormOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isGoogleFormOpen]);

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
  const manageContent = (
    <>
      {/* ================= HEADER ================= */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-(--dash-ink)] tracking-tight flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-cyan-300" />
            Manajemen Operasi
          </h1>
          <p className="text-(--dash-muted)]">
            Pantau, edit, filter, dan export seluruh data operasi.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setGoogleFormOpen(!isGoogleFormOpen)}
            className="border border-white/10 bg-white/10 text-(--dash-ink)] hover:bg-white/15"
          >
            {isGoogleFormOpen ? (
              <>
                <ChevronRight className="mr-2 h-4 w-4" />
                Minimize Form
              </>
            ) : (
              <>
                <ChevronLeft className="mr-2 h-4 w-4" />
                 Google Form
              </>
            )}
          </Button>

          <Button
            onClick={handleExportExcel}
            disabled={isExporting || operations.length === 0}
            className="border border-white/10 bg-white/10 text-(--dash-ink)] hover:bg-white/15 disabled:opacity-50"
          >
            <FileDown className="mr-2 h-4 w-4" />
            {isExporting ? 'Exporting...' : 'Export CSV'}
          </Button>

          <Button
            onClick={handleExportPDF}
            disabled={isExporting || operations.length === 0}
            className="border border-white/10 bg-white/10 text-(--dash-ink)] hover:bg-white/15 disabled:opacity-50"
          >
            <FileText className="mr-2 h-4 w-4" />
            {isExporting ? 'Exporting...' : 'Export PDF'}
          </Button>

          <OperationForm onFormSubmit={fetchOperations} />
        </div>
      </div>

      {/* ================= DASHBOARD ================= */}
      <OperationDashboard operations={operations} isLoading={isLoading} />
    </>
  );

  return (
    <div className="space-y-8">
      {manageContent}

      <div
        className={[
          'flex flex-col gap-6',
          'md:flex-row md:items-start md:gap-0',
          isGoogleFormOpen ? 'md:gap-6' : '',
        ].join(' ')}
      >
        <div className="min-w-0 flex-1">
          <OperationManager
            operationsData={operations}
            isLoading={isLoading}
            onDataChange={fetchOperations}
            user={user}
            compact={isGoogleFormOpen}
          />
        </div>

        <motion.aside
          className={[
            'hidden md:block',
            'min-w-0 overflow-hidden',
            'md:sticky md:top-24 md:h-[calc(100vh-7rem)]',
            isGoogleFormOpen ? 'pointer-events-auto' : 'pointer-events-none',
          ].join(' ')}
          initial={false}
          animate={isGoogleFormOpen ? 'open' : 'closed'}
          variants={{
            open: { maxWidth: 680, opacity: 1, x: 0 },
            closed: { maxWidth: 0, opacity: 0, x: 24 },
          }}
          transition={{ type: 'spring', stiffness: 320, damping: 34 }}
          style={{ width: 'clamp(420px, 42vw, 680px)' }}
        >
          <div className="h-full overflow-hidden rounded-3xl border border-white/10 bg-(--dash-surface) text-(--dash-ink) shadow-[0_20px_60px_rgba(2,6,23,0.45)]">
            <OperasiGoogleForm embedded onClose={() => setGoogleFormOpen(false)} />
          </div>
        </motion.aside>
      </div>

      <AnimatePresence>
        {!isGoogleFormOpen ? (
          <motion.button
            type="button"
            onClick={() => setGoogleFormOpen(true)}
            className="hidden md:flex fixed right-0 top-1/2 z-40 -translate-y-1/2 items-center gap-2 rounded-l-xl border border-white/10 bg-(--dash-surface) px-3 py-3 text-(--dash-ink) shadow-[0_20px_60px_rgba(2,6,23,0.35)] hover:bg-white/10"
            title="Google Form"
            initial={{ x: 36, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 36, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 360, damping: 28 }}
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="text-xs font-semibold tracking-wide">Google Form</span>
          </motion.button>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {!isGoogleFormOpen ? (
          <motion.button
            type="button"
            onClick={() => setGoogleFormOpen(true)}
            className="md:hidden fixed bottom-4 right-4 z-40 inline-flex items-center gap-2 rounded-full border border-white/10 bg-(--dash-surface) px-4 py-3 text-(--dash-ink) shadow-[0_20px_60px_rgba(2,6,23,0.45)]"
            title="Buka Google Form"
            initial={{ y: 18, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 18, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="text-sm font-semibold">Google Form</span>
          </motion.button>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {isGoogleFormOpen ? (
          <motion.div
            className="md:hidden fixed inset-0 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <button
              type="button"
              className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
              onClick={() => setGoogleFormOpen(false)}
              aria-label="Tutup Google Form"
            />

            <motion.div
              className="absolute inset-x-3 top-3 bottom-3 overflow-hidden rounded-3xl border border-white/10 bg-(--dash-surface) text-(--dash-ink) shadow-[0_20px_80px_rgba(2,6,23,0.55)]"
              initial={{ y: 24, scale: 0.985, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              exit={{ y: 24, scale: 0.985, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 420, damping: 34 }}
            >
              <OperasiGoogleForm embedded onClose={() => setGoogleFormOpen(false)} />
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
