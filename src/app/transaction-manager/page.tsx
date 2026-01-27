"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/components/AuthProvider";
import TransactionManager from "@/components/transaction-manager";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Calendar } from "lucide-react";

// =======================
// ✅ TYPE DATA
// =======================
interface Transaction {
  id: string;
  tanggal: string; // format YYYY-MM-DD
  jenisBiaya: string;
  keterangan: string;
  jumlah: number;
  klaim: string;
  fileUrl?: string;
}

export default function TransactionsPage() {
  const { user } = useAuth();

  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // ✅ FILTER STATE
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // ✅ RANGE DATE FILTER
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // =======================
  // ✅ FETCH DATA
  // =======================
  const fetchTransactions = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/transactions", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Gagal mengambil data transaksi.");

      const data = await response.json();
      setAllTransactions(data);
    } catch (error) {
      console.error(error);
      setAllTransactions([]);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // =======================
  // ✅ PRESET: BULAN INI
  // =======================
  const setThisMonth = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    setStartDate(firstDay.toISOString().split("T")[0]);
    setEndDate(lastDay.toISOString().split("T")[0]);
  };

  // =======================
  // ✅ UNIQUE KATEGORI
  // =======================
  const uniqueCategories = useMemo(() => {
    const categories = new Set(allTransactions.map((tx) => tx.jenisBiaya));
    return ["all", ...Array.from(categories)];
  }, [allTransactions]);

  // =======================
  // ✅ FILTER DATA FINAL
  // =======================
  const filteredTransactions = useMemo(() => {
    return allTransactions
      .filter((tx) => {
        return (
          selectedCategory === "all" || tx.jenisBiaya === selectedCategory
        );
      })
      .filter((tx) => {
        return tx.keterangan
          .toLowerCase()
          .includes(searchTerm.toLowerCase());
      })
      .filter((tx) => {
        if (!startDate && !endDate) return true;

        const txDate = new Date(tx.tanggal).getTime();
        const start = startDate ? new Date(startDate).getTime() : null;
        const end = endDate
          ? new Date(endDate + "T23:59:59").getTime()
          : null;

        if (start && end) return txDate >= start && txDate <= end;
        if (start) return txDate >= start;
        if (end) return txDate <= end;

        return true;
      });
  }, [allTransactions, selectedCategory, searchTerm, startDate, endDate]);

  // =======================
  // ✅ RENDER UI
  // =======================
  return (
    <div className="space-y-8">
      {/* HEADER */}
      <header className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">
            Manajemen Transaksi
          </h1>
          <p className="text-gray-400">
            Lacak, filter, dan cari transaksi dengan mudah.
          </p>
        </div>
      </header>

      {/* ✅ FILTER BAR */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-800/50 rounded-xl border border-gray-700">
        {/* SEARCH */}
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            type="search"
            placeholder="Cari keterangan..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full"
          />
        </div>

        {/* KATEGORI */}
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger>
            <SelectValue placeholder="Semua Kategori" />
          </SelectTrigger>
          <SelectContent className="bg-popover bg-white text-popover-foreground border-border text-slate-500">
            {uniqueCategories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat === "all" ? "Semua Kategori" : cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* PRESET BULAN INI */}
        <button
          onClick={setThisMonth}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white font-semibold transition"
        >
          <Calendar className="h-4 w-4" />
          Bulan Ini
        </button>
      </div>

      {/* ✅ RANGE DATE */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
        <Input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />
      </div>

      {/* ✅ TRANSACTION TABLE */}
      <TransactionManager
        transactions={filteredTransactions}
        isLoading={isLoading}
        onDataChange={fetchTransactions}
      />
    </div>
  );
}
