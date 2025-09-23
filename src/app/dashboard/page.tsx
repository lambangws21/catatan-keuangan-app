"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import ExpenseForm from "@/components/ExepenseForm";
import FinancialDashboard from "@/components/FinalcialDashboard";
import TransactionManager from "@/components/transaction-manager";
import SaldoForm from "@/components/FormSaldo";
import ImageGallery from "@/components/ImagePreview";
import SaldoManager from "@/components/ManajerSaldo";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


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

export default function TransactionManagerPage() {
  // State untuk menyimpan semua data mentah dari API
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [allSaldoData, setAllSaldoData] = useState<Saldo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // State BARU untuk mengontrol filter
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth()); // 0-11
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  // Fungsi untuk mengambil data transaksi (pengeluaran)
  const fetchTransactions = useCallback(async () => {
    try {
      const response = await fetch('/api/transactions');
      if (!response.ok) throw new Error('Gagal mengambil data transaksi.');
      const data = await response.json();
      setAllTransactions(data);
    } catch (error) {
      console.error(error);
      setAllTransactions([]); 
    }
  }, []);

  // Fungsi untuk mengambil data saldo
  const fetchSaldo = useCallback(async () => {
    try {
      const response = await fetch('/api/saldo');
      if (!response.ok) throw new Error('Gagal mengambil data saldo.');
      const data = await response.json();
      setAllSaldoData(data);
    } catch (error) {
      console.error(error);
      setAllSaldoData([]); 
    }
  }, []);

  // Ambil semua data saat komponen pertama kali dimuat
  useEffect(() => {
    const fetchAllData = async () => {
        setIsLoading(true);
        await Promise.all([fetchTransactions(), fetchSaldo()]);
        setIsLoading(false);
    }
    fetchAllData();
  }, [fetchTransactions, fetchSaldo]);
  
  // Gunakan useMemo untuk menyaring data secara efisien
  // Kalkulasi ini hanya akan berjalan jika data mentah atau filter berubah
  const filteredTransactions = useMemo(() => {
    if (!Array.isArray(allTransactions)) return [];
    return allTransactions.filter(tx => {
      const txDate = new Date(tx.tanggal);
      return txDate.getMonth() === selectedMonth && txDate.getFullYear() === selectedYear;
    });
  }, [allTransactions, selectedMonth, selectedYear]);

  const filteredSaldoData = useMemo(() => {
    if (!Array.isArray(allSaldoData)) return [];
    return allSaldoData.filter(item => {
      const itemDate = new Date(item.tanggal);
      return itemDate.getMonth() === selectedMonth && itemDate.getFullYear() === selectedYear;
    });
  }, [allSaldoData, selectedMonth, selectedYear]);
  
  // Opsi untuk dropdown filter
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
  const months = [
    { value: 0, name: 'Januari' }, { value: 1, name: 'Februari' }, { value: 2, name: 'Maret' },
    { value: 3, name: 'April' }, { value: 4, name: 'Mei' }, { value: 5, name: 'Juni' },
    { value: 6, name: 'Juli' }, { value: 7, name: 'Agustus' }, { value: 8, name: 'September' },
    { value: 9, name: 'Oktober' }, { value: 10, name: 'November' }, { value: 11, name: 'Desember' }
  ];

  return (
    <main className="min-h-screen bg-gray-900 p-4 md:p-8 text-white">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row justify-between items-center gap-4">
          <h1 className="text-4xl font-bold">Dashboard Keuangan</h1>
          <div className="flex items-center gap-4">
            {/* Filter Bulan dan Tahun */}
            <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(Number(v))}>
              <SelectTrigger className="w-[120px] bg-gray-800 border-gray-700"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-gray-800 text-white border-gray-700">
                {months.map(m => <SelectItem key={m.value} value={String(m.value)}>{m.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
              <SelectTrigger className="w-[100px] bg-gray-800 border-gray-700"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-gray-800 text-white border-gray-700">
                {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
            <SaldoForm onSaldoAdded={fetchSaldo}  />
            <ExpenseForm onTransactionAdded={fetchTransactions} />
          </div>
        </header>

        {/* Kirim data yang SUDAH DIFILTER ke komponen anak */}
        <FinancialDashboard transactions={filteredTransactions}  saldoData={filteredSaldoData} isLoading={isLoading} />
        
        <SaldoManager
          saldoData={filteredSaldoData}
          isLoading={isLoading}
          onDataChange={fetchSaldo}
        />
        
        <TransactionManager 
          transactions={filteredTransactions} 
          isLoading={isLoading}
          onDataChange={fetchTransactions} 
        />
        
        <ImageGallery transactions={filteredTransactions} isLoading={isLoading}/>
      </div>
    </main>
  );
}

