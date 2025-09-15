"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";
import SummaryCards from "@/components/SummaryCards";
import ExpenseChart from "@/components/ExpenseChart";

// Definisikan tipe data yang konsisten
interface Transaction {
  id: string;
  tanggal: string;
  jenisBiaya: string;
  keterangan: string;
  jumlah: number;
  klaim: 'Ya' | 'Tidak' | string;
  fileUrl?: string;
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
}

export default function FinancialDashboard({ transactions, saldoData, isLoading }: FinancialDashboardProps) {
  // --- Kalkulasi Data dengan Memoization ---
  const { 
    totalPemasukanKeseluruhan, 
    totalPengeluaranBulanan, 
    saldoKeseluruhan, 
    pemasukanCountBulanan,
    pengeluaranCountBulanan, 
    dataGrafikPengeluaran 
  } = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    // Pastikan data adalah array sebelum melakukan operasi
    const validSaldoData = Array.isArray(saldoData) ? saldoData : [];
    const validTransactions = Array.isArray(transactions) ? transactions : [];

    // --- PERHITUNGAN UNTUK KESELURUHAN WAKTU (ALL-TIME) ---
    // Ini adalah total semua deposit/saldo dari awal
    const totalPemasukanKeseluruhan = validSaldoData.reduce((sum, item) => sum + Number(item.jumlah), 0);
    const totalPengeluaranKeseluruhan = validTransactions.reduce((sum, tx) => sum + Number(tx.jumlah), 0);
    const saldoKeseluruhan = totalPemasukanKeseluruhan - totalPengeluaranKeseluruhan;

    // --- PERHITUNGAN HANYA UNTUK BULAN INI ---
    // Pemasukan bulan ini (hanya untuk hitungan/count)
    const pemasukanBulanIni = validSaldoData.filter(item => {
        const itemDate = new Date(item.tanggal);
        return itemDate.getFullYear() === currentYear && itemDate.getMonth() === currentMonth;
    });
    
    // Pengeluaran bulan ini (untuk kartu total dan grafik)
    const pengeluaranBulanIni = validTransactions.filter(tx => {
        const txDate = new Date(tx.tanggal);
        return txDate.getFullYear() === currentYear && txDate.getMonth() === currentMonth;
    });

    const pemasukanCountBulanan = pemasukanBulanIni.length;
    
    const totalPengeluaranBulanan = pengeluaranBulanIni.reduce((sum, tx) => sum + tx.jumlah, 0);
    const pengeluaranCountBulanan = pengeluaranBulanIni.length;
    
    const dataGrafikPengeluaran = pengeluaranBulanIni
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

    return { 
      totalPemasukanKeseluruhan, 
      totalPengeluaranBulanan, 
      saldoKeseluruhan, 
      pemasukanCountBulanan,
      pengeluaranCountBulanan, 
      dataGrafikPengeluaran 
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
              pemasukan={totalPemasukanKeseluruhan} // PERBAIKAN: Gunakan total pemasukan keseluruhan
              pengeluaran={totalPengeluaranBulanan} 
              saldo={saldoKeseluruhan}
              pemasukanCount={pemasukanCountBulanan}
              pengeluaranCount={pengeluaranCountBulanan}
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

