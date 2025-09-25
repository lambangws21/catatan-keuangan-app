"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/components/AuthProvider";
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

export default function DashboardPage() {
  const { user } = useAuth();
  // State untuk menyimpan semua data mentah dari API
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [allSaldoData, setAllSaldoData] = useState<Saldo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // State untuk mengontrol filter
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth()); // 0-11
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  // Fungsi untuk mengambil data transaksi (pengeluaran)
  const fetchTransactions = useCallback(async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/transactions', { headers: { 'Authorization': `Bearer ${token}` } });
      if (!response.ok) throw new Error('Gagal mengambil data transaksi.');
      const data = await response.json();
      setAllTransactions(data);
    } catch (error) {
      console.error(error);
      setAllTransactions([]); 
    }
  }, [user]);

  // Fungsi untuk mengambil data saldo
  const fetchSaldo = useCallback(async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/saldo', { headers: { 'Authorization': `Bearer ${token}` } });
      if (!response.ok) throw new Error('Gagal mengambil data saldo.');
      const data = await response.json();
      setAllSaldoData(data);
    } catch (error) {
      console.error(error);
      setAllSaldoData([]); 
    }
  }, [user]);

  // Ambil semua data saat komponen pertama kali dimuat
  useEffect(() => {
    const fetchAllData = async () => {
        setIsLoading(true);
        if(user) {
            await Promise.all([fetchTransactions(), fetchSaldo()]);
        }
        setIsLoading(false);
    }
    fetchAllData();
  }, [user, fetchTransactions, fetchSaldo]);
  
  // Gunakan useMemo untuk menyaring data secara efisien
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
    <div className="space-y-8">
        {/* PERBAIKAN: Header sekarang responsif */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-3xl font-bold text-white">Dashboard Keuangan</h1>
            <p className="text-gray-400 mt-1">Ringkasan aktivitas keuangan Anda.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Filter Bulan dan Tahun */}
            <div className="flex-1 md:flex-none">
                <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(Number(v))}>
                  <SelectTrigger className="w-full md:w-[130px] bg-gray-800 border-gray-700"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-gray-800 text-white border-gray-700">
                    {months.map(m => <SelectItem key={m.value} value={String(m.value)}>{m.name}</SelectItem>)}
                  </SelectContent>
                </Select>
            </div>
             <div className="flex-1 md:flex-none">
                <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
                  <SelectTrigger className="w-full md:w-[100px] bg-gray-800 border-gray-700"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-gray-800 text-white border-gray-700">
                    {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
            </div>
            <div className="w-full md:w-auto flex gap-3">
                <div className="flex-1"><SaldoForm onSaldoAdded={fetchSaldo} /></div>
                <div className="flex-1"><ExpenseForm onTransactionAdded={fetchTransactions} /></div>
            </div>
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
  );
}


