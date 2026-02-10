"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";
import SummaryCards from "@/components/SummaryCards";
import ExpenseChart from "@/components/ExpenseChart";
import { isCountedAsExpense } from "@/lib/transactions";

// Definisikan tipe data yang konsisten
interface Transaction {
  id: string;
  tanggal: string;
  jenisBiaya: string;
  keterangan: string;
  jumlah: number;
  klaim: 'Ya' | 'Tidak' | string;
  fileUrl?: string;
  sumberBiaya?: string | null;
}

interface Saldo {
  id: string;
  tanggal: string;
  keterangan: string;
  jumlah: number;
}

// Definisikan props yang diterima, sekarang termasuk saldoData
interface FinancialDashboardProps {
    transactions: Transaction[];
    saldoData: Saldo[];
    isLoading: boolean;
    compactMode?: boolean;
}

export default function FinancialDashboard({ transactions, saldoData, isLoading, compactMode }: FinancialDashboardProps) {
  // --- Kalkulasi Data dengan Memoization ---
  const { 
    totalPemasukan, 
    totalPengeluaran, 
    saldoSaatIni, 
    pemasukanCount,
    pengeluaranCount, 
    dataGrafikPengeluaran,
    reimbursementAmount,
  } = useMemo(() => {
    // Pastikan data adalah array sebelum melakukan operasi
    const validSaldoData = Array.isArray(saldoData) ? saldoData : [];
    const validTransactions = Array.isArray(transactions) ? transactions : [];
    const expenseTransactions = validTransactions.filter((tx) => isCountedAsExpense(tx));

    // Gunakan data yang diterima apa adanya (bisa all-time atau hasil filter bulanan dari parent).
    const totalPemasukan = validSaldoData.reduce((sum, item) => sum + Number(item.jumlah), 0);
    const totalPengeluaran = expenseTransactions.reduce((sum, tx) => sum + Number(tx.jumlah), 0);
    const saldoSaatIni = totalPemasukan - totalPengeluaran;
    const pemasukanCount = validSaldoData.length;
    const pengeluaranCount = expenseTransactions.length;
    
    const dataGrafikPengeluaran = expenseTransactions
      .reduce((acc, tx) => {
        const kategori = tx.jenisBiaya;
        const existing = acc.find(item => item.name === kategori);
        if (existing) {
          existing.value += tx.jumlah;
        } else {
          acc.push({ name: kategori, value: tx.jumlah });
        }
        return acc;
      }, [] as { name: string; value: number }[]);

    // Reimburse = defisit saat pengeluaran melebihi pemasukan (saldo minus).
    const reimbursementAmount =
      saldoSaatIni < 0 && totalPengeluaran > 0 ? Math.abs(saldoSaatIni) : 0;

    return { 
      totalPemasukan, 
      totalPengeluaran, 
      saldoSaatIni, 
      pemasukanCount,
      pengeluaranCount, 
      dataGrafikPengeluaran,
      reimbursementAmount,
    };
  }, [transactions, saldoData]);


  return (
    <div className="space-y-8">
      <AnimatePresence>
        {isLoading ? (
          <motion.div
            key="loader"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex justify-center items-center p-16"
          >
            <Loader2 className="h-12 w-12 animate-spin text-cyan-400" />
          </motion.div>
        ) : (
          <motion.div
            key="dashboard-content"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <SummaryCards 
              pemasukan={totalPemasukan}
              pengeluaran={totalPengeluaran}
              saldo={saldoSaatIni}
              pemasukanCount={pemasukanCount}
              pengeluaranCount={pengeluaranCount}
              reimbursementAmount={reimbursementAmount}
            compact={compactMode}
            />
            
            <div className="mt-8">
              {dataGrafikPengeluaran.length > 0 ? (
                  <ExpenseChart data={dataGrafikPengeluaran} />
              ) : (
                  <div className="p-8 text-center bg-gray-800 rounded-lg">
                      <p className="text-gray-400">Belum ada data pengeluaran bulan ini untuk ditampilkan di grafik.</p>
                  </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
