"use client";

import { useState, useEffect, useCallback } from "react";

// Impor semua komponen yang akan ditampilkan di halaman
import ExpenseForm from "@/components/ExepenseForm";
import FinancialDashboard from "@/components/FinalcialDashboard";
import TransactionManager from "@/components/transaction-manager";
import ImageGallery from "@/components/ImagePreview";
import SaldoForm from "@/components/FormSaldo";
import SaldoManager from "@/components/ManajerSaldo"; 
import {useAuth} from "@/components/AuthProvider";// Komponen yang ada di Canvas Anda



// Definisikan tipe data untuk konsistensi
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
  const { user } = useAuth(); // 2. Dapatkan informasi pengguna yang login
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [saldoData, setSaldoData] = useState<Saldo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fungsi untuk mengambil data transaksi (pengeluaran)
  const fetchTransactions = useCallback(async () => {
    if (!user) return; // Jangan lakukan fetch jika user belum login
    try {
      const token = await user.getIdToken(); // Dapatkan token
      const response = await fetch('/api/transactions', {
        headers: { 'Authorization': `Bearer ${token}` } // Sertakan token di header
      });
      if (!response.ok) throw new Error('Gagal mengambil data transaksi.');
      const data = await response.json();
      setTransactions(data);
    } catch (error) {
      console.error(error);
      setTransactions([]);
    }
  }, [user]); // 3. Tambahkan user sebagai dependensi

  // Fungsi untuk mengambil data saldo
  const fetchSaldo = useCallback(async () => {
    if (!user) return; // Jangan lakukan fetch jika user belum login
    try {
      const token = await user.getIdToken(); // Dapatkan token
      const response = await fetch('/api/saldo', {
        headers: { 'Authorization': `Bearer ${token}` } // Sertakan token di header
      });
      if (!response.ok) throw new Error('Gagal mengambil data saldo.');
      const data = await response.json();
      setSaldoData(data);
    } catch (error) {
      console.error(error);
      setSaldoData([]);
    }
  }, [user]); // 4. Tambahkan user sebagai dependensi

  // Ambil semua data saat komponen pertama kali dimuat
  useEffect(() => {
    const fetchAllData = async () => {
        setIsLoading(true);
        // Pastikan user sudah ada sebelum mengambil data
        if (user) {
            await Promise.all([fetchTransactions(), fetchSaldo()]);
        }
        setIsLoading(false);
    }
    fetchAllData();
  }, [user, fetchTransactions, fetchSaldo]); // Tambahkan user di sini juga

  return (
    <main className="min-h-screen bg-gray-900 p-4 md:p-8 text-white">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="flex justify-between items-center">
          <h1 className="text-4xl font-bold">Dashboard Keuangan</h1>
          <div className="flex gap-4">
            <SaldoForm onSaldoAdded={fetchSaldo} />
            <ExpenseForm onTransactionAdded={fetchTransactions} />
          </div>
        </header>

        <FinancialDashboard transactions={transactions} saldoData={saldoData} isLoading={isLoading} />
        
        <SaldoManager
          saldoData={saldoData}
          isLoading={isLoading}
          onDataChange={fetchSaldo}
        />
        
        <TransactionManager 
          transactions={transactions} 
          isLoading={isLoading}
          onDataChange={fetchTransactions} 
        />
        
        <ImageGallery transactions={transactions} isLoading={isLoading}/>
      </div>
    </main>
  );
}


