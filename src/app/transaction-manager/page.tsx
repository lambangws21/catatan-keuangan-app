"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/components/AuthProvider";
import ExpenseForm from "@/components/ExepenseForm";
import TransactionManager from "@/components/transaction-manager";
// Impor komponen UI untuk filter
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";

// Definisikan tipe data Transaction agar konsisten
interface Transaction {
  id: string;
  tanggal: string;
  jenisBiaya: string;
  keterangan: string;
  jumlah: number;
  klaim: string;
  fileUrl?: string;
}

export default function TransactionsPage() {
  const { user } = useAuth();
  // State untuk menyimpan data mentah dari API
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // State BARU untuk filter
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all"); // 'all' berarti tidak ada filter

  // Fungsi untuk mengambil semua data transaksi dari API
  const fetchTransactions = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/transactions', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Gagal mengambil data transaksi.');
      const data = await response.json();
      setAllTransactions(data);
    } catch (error) {
      console.error(error);
      setAllTransactions([]); // Set ke array kosong jika gagal untuk menghindari error
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Ambil data saat komponen pertama kali dimuat atau saat user berubah
  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);
  
  // Memoize daftar kategori unik untuk dropdown filter
  const uniqueCategories = useMemo(() => {
    if (!Array.isArray(allTransactions)) return [];
    // Buat Set untuk mendapatkan nilai unik, lalu ubah kembali ke array
    const categories = new Set(allTransactions.map(tx => tx.jenisBiaya));
    return ['all', ...Array.from(categories)];
  }, [allTransactions]);

  // Gunakan useMemo untuk menyaring data secara efisien
  // Kalkulasi ini hanya akan berjalan jika data mentah atau filter berubah
  const filteredTransactions = useMemo(() => {
    if (!Array.isArray(allTransactions)) return [];
    
    return allTransactions
      .filter(tx => {
        // Filter berdasarkan kategori
        return selectedCategory === 'all' || tx.jenisBiaya === selectedCategory;
      })
      .filter(tx => {
        // Filter berdasarkan kata kunci pencarian (tidak case-sensitive)
        return tx.keterangan.toLowerCase().includes(searchTerm.toLowerCase());
      });
  }, [allTransactions, selectedCategory, searchTerm]);


  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
            <h1 className="text-3xl font-bold text-white">Manajemen Transaksi</h1>
            <p className="text-gray-400">Lacak, saring, dan cari semua pengeluaran Anda di sini.</p>
        </div>
        {/* Tombol untuk menambah transaksi baru, akan me-refresh data di halaman ini */}
        <ExpenseForm onTransactionAdded={fetchTransactions} />
      </header>
      
      {/* Bagian BARU untuk Kontrol Filter dan Pencarian */}
      <div className="flex flex-col md:flex-row gap-4 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input 
            type="search"
            placeholder="Cari berdasarkan keterangan..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full"
          />
        </div>
        <div className="flex-shrink-0">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Semua Kategori" />
            </SelectTrigger>
            <SelectContent>
              {uniqueCategories.map(category => (
                <SelectItem key={category} value={category}>
                  {category === 'all' ? 'Semua Kategori' : category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Komponen TransactionManager sekarang menampilkan data yang SUDAH DIFILTER */}
      <TransactionManager
        transactions={filteredTransactions} // Gunakan data yang sudah difilter
        isLoading={isLoading}
        onDataChange={fetchTransactions} // onDataChange tetap mengambil semua data
      />
    </div>
  );
}

