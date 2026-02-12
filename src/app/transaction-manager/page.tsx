"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/components/AuthProvider";
import TransactionManager from "@/components/transaction-manager";
import MealsMeetingManager from "@/components/MealsMeetingManager";
import { toast } from "sonner";
import { isCountedAsExpense, isReimbursement } from "@/lib/transactions";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Calendar } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getUserBudgetSettings, type BudgetSettings } from "@/lib/userSettingService";

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
  sumberBiaya?: string | null;
}

export default function TransactionsPage() {
  const { user } = useAuth();

  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"transaksi" | "meals">("transaksi");
  const [budget, setBudget] = useState<BudgetSettings | null>(null);

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

  useEffect(() => {
    if (!user) {
      setBudget(null);
      return;
    }
    getUserBudgetSettings(user.uid)
      .then((data) => setBudget(data))
      .catch(() => setBudget(null));
  }, [user]);

  useEffect(() => {
    if (selectedCategory === "Meals Metting") setActiveTab("meals");
  }, [selectedCategory]);

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
  const filteredBase = useMemo(() => {
    return allTransactions
      .filter((tx) => {
        if (activeTab === "meals") return tx.jenisBiaya === "Meals Metting";
        return selectedCategory === "all" || tx.jenisBiaya === selectedCategory;
      })
      .filter((tx) => tx.keterangan.toLowerCase().includes(searchTerm.toLowerCase()))
      .filter((tx) => {
        if (!startDate && !endDate) return true;
        const txDate = new Date(tx.tanggal).getTime();
        const start = startDate ? new Date(startDate).getTime() : null;
        const end = endDate ? new Date(endDate + "T23:59:59").getTime() : null;
        if (start && end) return txDate >= start && txDate <= end;
        if (start) return txDate >= start;
        if (end) return txDate <= end;
        return true;
      });
  }, [allTransactions, selectedCategory, searchTerm, startDate, endDate, activeTab]);

  // Untuk tab transaksi: selalu ambil seluruh transaksi (bukan hanya view tab) lalu filter expense.
  const expenseBase = useMemo(() => {
    return allTransactions
      .filter((tx) => selectedCategory === "all" || tx.jenisBiaya === selectedCategory)
      .filter((tx) => tx.keterangan.toLowerCase().includes(searchTerm.toLowerCase()))
      .filter((tx) => {
        if (!startDate && !endDate) return true;
        const txDate = new Date(tx.tanggal).getTime();
        const start = startDate ? new Date(startDate).getTime() : null;
        const end = endDate ? new Date(endDate + "T23:59:59").getTime() : null;
        if (start && end) return txDate >= start && txDate <= end;
        if (start) return txDate >= start;
        if (end) return txDate <= end;
        return true;
      });
  }, [allTransactions, selectedCategory, searchTerm, startDate, endDate]);

  const filteredTransactionsNonMeals = useMemo(() => {
    return expenseBase.filter((tx) => isCountedAsExpense(tx));
  }, [expenseBase]);

  // Reimbursement list: Meals Metting yang dibayar personal/mandiri.
  const reimbursementList = useMemo(() => {
    return expenseBase.filter((tx) => isReimbursement(tx));
  }, [expenseBase]);

  const monthKey = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }, []);

  const monthExpenseTotal = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).getTime();
    return allTransactions
      .filter((tx) => {
        const t = new Date(tx.tanggal).getTime();
        return t >= start && t <= end;
      })
      .filter((tx) => isCountedAsExpense(tx))
      .reduce((sum, tx) => sum + Number(tx.jumlah || 0), 0);
  }, [allTransactions]);

  const budgetPercent = useMemo(() => {
    if (!budget?.enabled) return null;
    const limit = Number(budget.monthlyExpenseBudget || 0);
    if (!Number.isFinite(limit) || limit <= 0) return null;
    return Math.round((monthExpenseTotal / limit) * 100);
  }, [budget, monthExpenseTotal]);

  useEffect(() => {
    if (!user) return;
    if (!budget?.enabled) return;
    if (budgetPercent === null) return;

    const warnAt = Math.max(0, Math.min(100, Number(budget.warnAtPercent ?? 80)));
    if (budgetPercent < warnAt) return;

    const storageKey = `budget-alert:${user.uid}:${monthKey}`;
    try {
      if (localStorage.getItem(storageKey) === String(warnAt)) return;
      localStorage.setItem(storageKey, String(warnAt));
    } catch {
      // ignore
    }

    if (budgetPercent >= 100) {
      toast.error(`Budget bulan ini terlewati (${budgetPercent}%).`);
    } else {
      toast.warning(`Peringatan budget: ${budgetPercent}% dari limit bulan ini.`);
    }
  }, [budget, budgetPercent, user, monthKey]);

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

      {budget?.enabled && budgetPercent !== null ? (
        <div className="rounded-xl border border-white/10 bg-gray-800/50 p-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-white">
              Budget Bulan Ini:{" "}
              <span className="font-semibold text-cyan-300">
                {new Intl.NumberFormat("id-ID").format(monthExpenseTotal)}
              </span>{" "}
              /{" "}
              <span className="font-semibold text-white">
                {new Intl.NumberFormat("id-ID").format(budget.monthlyExpenseBudget)}
              </span>{" "}
              ({budgetPercent}%)
            </p>
            <p className="text-xs text-gray-400">
              Peringatan di {budget.warnAtPercent}% • Ubah di menu Settings → Budget
            </p>
          </div>
          <div className="mt-3 h-2 w-full rounded-full bg-white/10">
            <div
              className={`h-2 rounded-full ${budgetPercent >= 100 ? "bg-red-500" : budgetPercent >= Number(budget.warnAtPercent ?? 80) ? "bg-amber-400" : "bg-cyan-500"}`}
              style={{ width: `${Math.min(100, Math.max(0, budgetPercent))}%` }}
            />
          </div>
        </div>
      ) : null}

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "transaksi" | "meals")} className="gap-4">
        <TabsList className="w-full  dark:bg-gray-800 dark:text-white justify-start overflow-x-auto bg-white/10 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <TabsTrigger value="transaksi" className="min-w-[120px] text-xs bg-slate-900 dark:bg-gray-800 dark:text-white text-slate-500">
            Transaksi
          </TabsTrigger>
          <TabsTrigger value="meals" className="min-w-[120px] text-xs bg-slate-900 dark:bg-gray-800 dark:text-white text-slate-500">
            Meals Metting
          </TabsTrigger>
        </TabsList>

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
        {activeTab === "transaksi" ? (
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Semua Kategori" />
            </SelectTrigger>
            <SelectContent className="bg-popover bg-slate-900 dark:bg-gray-800 dark:text-white text-popover-foreground border-border text-slate-500">
              {uniqueCategories
                .filter((cat) => cat !== "Meals Metting")
                .map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat === "all" ? "Semua Kategori" : cat}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        ) : (
          <div className="rounded-lg border border-gray-700 bg-gray-900/40 px-4 py-2 text-sm text-gray-300 flex items-center">
            Kategori: <span className="ml-2 font-semibold text-amber-300">Meals Metting</span>
          </div>
        )}

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
        <TabsContent value="transaksi">
          <TransactionManager
            transactions={filteredTransactionsNonMeals}
            reimbursements={reimbursementList}
            isLoading={isLoading}
            onDataChange={fetchTransactions}
          />
        </TabsContent>

        <TabsContent value="meals">
          <MealsMeetingManager
            transactions={filteredBase}
            isLoading={isLoading}
            onDataChange={fetchTransactions}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
