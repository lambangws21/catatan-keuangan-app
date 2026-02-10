"use client";

import { useState, useEffect, useCallback, useMemo } from "react";

// Impor semua komponen yang akan ditampilkan di halaman
import FinancialDashboard from "@/components/FinalcialDashboard";
import TransactionManager from "@/components/transaction-manager";
import ImageGallery from "@/components/ImagePreview";
import SaldoManager from "@/components/ManajerSaldo"; 
import {useAuth} from "@/components/AuthProvider";// Komponen yang ada di Canvas Anda
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MealsMeetingManager from "@/components/MealsMeetingManager";
import { isCountedAsExpense } from "@/lib/transactions";



// Definisikan tipe data untuk konsistensi
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

  const transactionsNonMeals = useMemo(() => {
    return transactions.filter((tx) => isCountedAsExpense(tx));
  }, [transactions]);

  return (
    <main className="min-h-screen bg-gray-900 p-4 sm:p-6 md:p-8 text-white">
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        <header className="flex justify-between items-center">
          <h1 className="text-2xl sm:text-4xl font-bold">Dashboard Keuangan</h1>
        </header>

        {/* MOBILE: tampil per-tab biar tidak panjang */}
        <div className="lg:hidden">
          <Tabs defaultValue="ringkasan" className="gap-4">
            <TabsList className="w-full justify-start overflow-x-auto bg-white/10 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <TabsTrigger value="ringkasan" className="min-w-[92px] text-xs">
                Ringkasan
              </TabsTrigger>
              <TabsTrigger value="saldo" className="min-w-[92px] text-xs">
                Saldo
              </TabsTrigger>
              <TabsTrigger value="transaksi" className="min-w-[92px] text-xs">
                Transaksi
              </TabsTrigger>
              <TabsTrigger value="meals" className="min-w-[92px] text-xs">
                Meals
              </TabsTrigger>
              <TabsTrigger value="galeri" className="min-w-[92px] text-xs">
                Galeri
              </TabsTrigger>
            </TabsList>

            <TabsContent value="ringkasan">
              <FinancialDashboard
                transactions={transactions}
                saldoData={saldoData}
                isLoading={isLoading}
                compactMode
              />
            </TabsContent>

            <TabsContent value="saldo">
              <SaldoManager
                saldoData={saldoData}
                isLoading={isLoading}
                onDataChange={fetchSaldo}
              />
            </TabsContent>

            <TabsContent value="transaksi">
              <TransactionManager
                transactions={transactionsNonMeals}
                isLoading={isLoading}
                onDataChange={fetchTransactions}
              />
            </TabsContent>

            <TabsContent value="meals">
              <MealsMeetingManager
                transactions={transactions}
                isLoading={isLoading}
                onDataChange={fetchTransactions}
              />
            </TabsContent>

            <TabsContent value="galeri">
              <ImageGallery transactions={transactions} isLoading={isLoading} />
            </TabsContent>
          </Tabs>
        </div>

        {/* DESKTOP */}
        <div className="hidden lg:block space-y-8">
          <FinancialDashboard
            transactions={transactions}
            saldoData={saldoData}
            isLoading={isLoading}
          />

          <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
            <div className="min-w-0">
              <SaldoManager
                saldoData={saldoData}
                isLoading={isLoading}
                onDataChange={fetchSaldo}
              />
            </div>
            <div className="min-w-0">
              <TransactionManager
                transactions={transactionsNonMeals}
                isLoading={isLoading}
                onDataChange={fetchTransactions}
              />
            </div>
          </div>

          <MealsMeetingManager
            transactions={transactions}
            isLoading={isLoading}
            onDataChange={fetchTransactions}
          />

          <ImageGallery transactions={transactions} isLoading={isLoading}/>
        </div>
      </div>
    </main>
  );
}
