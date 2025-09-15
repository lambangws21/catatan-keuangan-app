"use client";

import { useState, useEffect, useCallback } from "react";

// Impor semua komponen yang akan ditampilkan di halaman
import ExpenseForm from "@/components/ExepenseForm";
import FinancialDashboard from "@/components/FinalcialDashboard";
import TransactionManager from "@/components/transaction-manager";
import ImageGallery from "@/components/ImagePreview";
import SaldoForm from "@/components/FormSaldo";
import SaldoManager from "@/components/ManajerSaldo"; // Komponen yang ada di Canvas Anda



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



export default function Home() {
  // State untuk menyimpan semua data aplikasi
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [saldoData, setSaldoData] = useState<Saldo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fungsi untuk mengambil data transaksi (pengeluaran)
  const fetchTransactions = useCallback(async () => {
    try {
      const response = await fetch('/api/transactions');
      if (!response.ok) throw new Error('Gagal mengambil data transaksi.');
      const data = await response.json();
      setTransactions(data);
    } catch (error) {
      console.error(error);
      setTransactions([]); // Set ke array kosong jika gagal
    }
  }, []);

  // Fungsi untuk mengambil data saldo
  const fetchSaldo = useCallback(async () => {
    try {
      const response = await fetch('/api/saldo');
      if (!response.ok) throw new Error('Gagal mengambil data saldo.');
      const data = await response.json();
      setSaldoData(data);
    } catch (error) {
      console.error(error);
      setSaldoData([]); // Set ke array kosong jika gagal
    }
  }, []);

  // Ambil semua data saat komponen pertama kali dimuat
  useEffect(() => {
    const fetchAllData = async () => {
        setIsLoading(true);
        // Jalankan kedua fetch secara bersamaan untuk efisiensi
        await Promise.all([fetchTransactions(), fetchSaldo()]);
        setIsLoading(false);
    }
    fetchAllData();
  }, [fetchTransactions, fetchSaldo]);

  return (
  
    <main className="min-h-screen bg-gray-900 p-4 md:p-8 text-white">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="flex justify-between items-center">
          <h1 className="text-4xl font-bold">Dashboard Keuangan</h1>
          <div className="flex gap-4">
            {/* Tombol untuk menambah saldo, akan me-refresh data saldo */}
            <SaldoForm onSaldoAdded={fetchSaldo} />
            {/* Tombol untuk menambah biaya, akan me-refresh data transaksi */}
            <ExpenseForm onTransactionAdded={fetchTransactions} />
          </div>
        </header>

        {/* Kirim data transaksi ke komponen dashboard */}
        <FinancialDashboard transactions={transactions}  saldoData={saldoData} isLoading={isLoading} />
        
        {/* Kirim data saldo ke komponen SaldoManager */}
        <SaldoManager
          saldoData={saldoData}
          isLoading={isLoading}
          onDataChange={fetchSaldo}
        />
        
        {/* Kirim data transaksi ke komponen TransactionManager */}
        <TransactionManager 
          transactions={transactions} 
          isLoading={isLoading}
          onDataChange={fetchTransactions} 
        />
        
        {/* Kirim data transaksi ke komponen galeri gambar */}
        <ImageGallery transactions={transactions} isLoading={isLoading}/>
      </div>
    </main>

  );
}

