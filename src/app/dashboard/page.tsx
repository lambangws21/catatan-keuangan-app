// "use client";

// import { useState, useEffect, useCallback, useMemo } from "react";
// import { useAuth } from "@/components/AuthProvider";
// import ExpenseForm from "@/components/ExepenseForm";
// import FinancialDashboard from "@/components/FinalcialDashboard";
// import TransactionManager from "@/components/transaction-manager";
// import SaldoForm from "@/components/FormSaldo";
// import ImageGallery from "@/components/ImagePreview";
// import SaldoManager from "@/components/ManajerSaldo";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";

// interface Transaction {
//   id: string;
//   tanggal: string;
//   jenisBiaya: string;
//   keterangan: string;
//   jumlah: number;
//   klaim: "Ya" | "Tidak" | string;
//   fileUrl?: string;
// }

// interface Saldo {
//   id: string;
//   tanggal: string;
//   keterangan: string;
//   jumlah: number;
// }

// export default function DashboardPage() {
//   const { user } = useAuth();
//   const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
//   const [allSaldoData, setAllSaldoData] = useState<Saldo[]>([]);
//   const [isLoading, setIsLoading] = useState(true);

//   const [selectedMonth, setSelectedMonth] = useState<number>(
//     new Date().getMonth()
//   );
//   const [selectedYear, setSelectedYear] = useState<number>(
//     new Date().getFullYear()
//   );

//   const fetchTransactions = useCallback(async () => {
//     if (!user) return;
//     try {
//       const token = await user.getIdToken();
//       const response = await fetch("/api/transactions", {
//         headers: { Authorization: `Bearer ${token}` },
//       });

//       if (!response.ok) throw new Error("Gagal mengambil data transaksi.");
//       const data = await response.json();
//       setAllTransactions(data);
//     } catch (error) {
//       console.error(error);
//       setAllTransactions([]);
//     }
//   }, [user]);

//   const fetchSaldo = useCallback(async () => {
//     if (!user) return;
//     try {
//       const token = await user.getIdToken();
//       const response = await fetch("/api/saldo", {
//         headers: { Authorization: `Bearer ${token}` },
//       });

//       if (!response.ok) throw new Error("Gagal mengambil data saldo.");
//       const data = await response.json();
//       setAllSaldoData(data);
//     } catch (error) {
//       console.error(error);
//       setAllSaldoData([]);
//     }
//   }, [user]);

//   useEffect(() => {
//     const fetchAll = async () => {
//       setIsLoading(true);
//       if (user) {
//         await Promise.all([fetchTransactions(), fetchSaldo()]);
//       }
//       setIsLoading(false);
//     };

//     fetchAll();
//   }, [user, fetchTransactions, fetchSaldo]);

//   const filteredTransactions = useMemo(() => {
//     return allTransactions.filter((tx) => {
//       const d = new Date(tx.tanggal);
//       return (
//         d.getMonth() === selectedMonth && d.getFullYear() === selectedYear
//       );
//     });
//   }, [allTransactions, selectedMonth, selectedYear]);

//   const filteredSaldoData = useMemo(() => {
//     return allSaldoData.filter((s) => {
//       const d = new Date(s.tanggal);
//       return (
//         d.getMonth() === selectedMonth && d.getFullYear() === selectedYear
//       );
//     });
//   }, [allSaldoData, selectedMonth, selectedYear]);

//   const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
//   const months = [
//     { value: 0, name: "Januari" },
//     { value: 1, name: "Februari" },
//     { value: 2, name: "Maret" },
//     { value: 3, name: "April" },
//     { value: 4, name: "Mei" },
//     { value: 5, name: "Juni" },
//     { value: 6, name: "Juli" },
//     { value: 7, name: "Agustus" },
//     { value: 8, name: "September" },
//     { value: 9, name: "Oktober" },
//     { value: 10, name: "November" },
//     { value: 11, name: "Desember" },
//   ];

//   return (
//     <div className="space-y-8 p-4 md:p-6 min-h-screen text-foreground bg-background">

//       {/* Header */}
//       <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-4 border-b border-border">
//         <div>
//           <h1 className="text-3xl font-bold">Dashboard Keuangan</h1>
//           <p className="text-muted-foreground mt-1">
//             Ringkasan aktivitas keuangan Anda.
//           </p>
//         </div>

//         <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">

//           {/* Pilihan Bulan */}
//           <div className="flex-1 md:flex-none">
//             <Select
//               value={String(selectedMonth)}
//               onValueChange={(v) => setSelectedMonth(Number(v))}
//             >
//               <SelectTrigger className="w-full md:w-[140px] bg-card border-border">
//                 <SelectValue placeholder="Bulan" />
//               </SelectTrigger>
//               <SelectContent className="bg-popover text-popover-foreground border-border">
//                 {months.map((m) => (
//                   <SelectItem key={m.value} value={String(m.value)}>
//                     {m.name}
//                   </SelectItem>
//                 ))}
//               </SelectContent>
//             </Select>
//           </div>

//           {/* Pilihan Tahun */}
//           <div className="flex-1 md:flex-none">
//             <Select
//               value={String(selectedYear)}
//               onValueChange={(v) => setSelectedYear(Number(v))}
//             >
//               <SelectTrigger className="w-full md:w-[120px] bg-card border-border">
//                 <SelectValue placeholder="Tahun" />
//               </SelectTrigger>
//               <SelectContent className="bg-popover text-popover-foreground border-border">
//                 {years.map((y) => (
//                   <SelectItem key={y} value={String(y)}>
//                     {y}
//                   </SelectItem>
//                 ))}
//               </SelectContent>
//             </Select>
//           </div>

//           {/* Tombol tambah saldo + transaksi */}
//           <div className="w-full md:w-auto flex gap-3">
//             <div className="flex-1">
//               <SaldoForm onSaldoAdded={fetchSaldo} />
//             </div>
//             <div className="flex-1">
//               <ExpenseForm onTransactionAdded={fetchTransactions} />
//             </div>
//           </div>
//         </div>
//       </header>

//       {/* Dashboard Utama */}
//       <FinancialDashboard
//         transactions={filteredTransactions}
//         saldoData={filteredSaldoData}
//         isLoading={isLoading}
//       />

//       <SaldoManager
//         saldoData={filteredSaldoData}
//         isLoading={isLoading}
//         onDataChange={fetchSaldo}
//       />

//       <TransactionManager
//         transactions={filteredTransactions}
//         isLoading={isLoading}
//         onDataChange={fetchTransactions}
//       />

//       <ImageGallery
//         transactions={filteredTransactions}
//         isLoading={isLoading}
//       />
//     </div>
//   );
// }


// src/app/dashboard/page.tsx  (ganti isi dengan ini or integrate)
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/components/AuthProvider";
import FinancialDashboard from "@/components/FinalcialDashboard";
import TransactionManager from "@/components/transaction-manager";
import ImageGallery from "@/components/ImagePreview";
import SaldoManager from "@/components/ManajerSaldo";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import FinancialChart from "@/components/financial-chart";
import FinancialReportPDF from "@/components/financial-report";
import { Button } from "@/components/ui/button";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MealsMeetingManager from "@/components/MealsMeetingManager";

/* types (same as before) */
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
  const { theme, setTheme } = useTheme();

  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [allSaldoData, setAllSaldoData] = useState<Saldo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const [viewMode, setViewMode] = useState<"compact" | "expanded">("expanded");

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

  const filteredTransactionsNonMeals = useMemo(() => {
    return filteredTransactions.filter((tx) => tx.jenisBiaya !== "Meals Metting");
  }, [filteredTransactions]);

  const years = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i);
  const months = [
    { value: 0, name: 'Januari' }, { value: 1, name: 'Februari' }, { value: 2, name: 'Maret' },
    { value: 3, name: 'April' }, { value: 4, name: 'Mei' }, { value: 5, name: 'Juni' },
    { value: 6, name: 'Juli' }, { value: 7, name: 'Agustus' }, { value: 8, name: 'September' },
    { value: 9, name: 'Oktober' }, { value: 10, name: 'November' }, { value: 11, name: 'Desember' }
  ];

  return (
    <div className="relative isolate">
      <div className="pointer-events-none absolute -top-32 right-[-10%] h-72 w-72 rounded-full bg-[radial-gradient(circle_at_center,_rgba(20,184,166,0.25),transparent_65%)] blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 left-[-15%] h-80 w-80 rounded-full bg-[radial-gradient(circle_at_center,_rgba(245,158,11,0.22),transparent_70%)] blur-3xl" />

      <div className="relative z-10 space-y-6 sm:space-y-8 font-[var(--font-body)] text-[color:var(--dash-ink)]">
        <header className="dashboard-surface rounded-3xl border border-white/10 bg-[var(--dash-surface)] p-4 sm:p-6 lg:p-8 backdrop-blur">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-2">
                <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-[color:var(--dash-muted)]">
                  Dashboard
                </span>
                <h1 className="text-2xl sm:text-4xl font-[var(--font-display)] font-semibold tracking-tight">
                  Dashboard Keuangan
                </h1>
                <p className="text-sm text-[color:var(--dash-muted)]">
                  Ringkasan aktivitas keuangan yang rapi, responsif, dan mudah dipantau.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewMode((v) => (v === "compact" ? "expanded" : "compact"))}
                  className="hidden sm:inline-flex rounded-full border border-white/10 bg-white/5 text-[color:var(--dash-ink)] hover:bg-white/10"
                >
                  {viewMode === "compact" ? "Mode Detail" : "Mode Ringkas"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className="rounded-full border border-white/10 bg-white/5 text-[color:var(--dash-ink)] hover:bg-white/10"
                >
                  {theme === "dark" ? <Sun /> : <Moon />}
                  <span className="hidden sm:inline text-xs font-medium">Tema</span>
                </Button>
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
              <div className="flex flex-col sm:flex-row gap-3">
                <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(Number(v))}>
                  <SelectTrigger className="w-full sm:w-[180px] rounded-full border-white/10 bg-white/5 text-[color:var(--dash-ink)] shadow-inner">
                    <SelectValue placeholder="Bulan" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-white/10 bg-slate-950 text-slate-100">
                    {months.map((m) => (
                      <SelectItem key={m.value} value={String(m.value)}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
                  <SelectTrigger className="w-full sm:w-[150px] rounded-full border-white/10 bg-white/5 text-[color:var(--dash-ink)] shadow-inner">
                    <SelectValue placeholder="Tahun" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-white/10 bg-slate-950 text-slate-100">
                    {years.map((y) => (
                      <SelectItem key={y} value={String(y)}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

            </div>
          </div>
        </header>

        {/* MOBILE: minimal, no long scroll */}
        <div className="lg:hidden">
          <Tabs defaultValue="overview" className="gap-4">
            <TabsList className="w-full justify-start overflow-x-auto border border-white/10 bg-white/5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <TabsTrigger value="overview" className="min-w-[92px] text-xs">
                Overview
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

            <TabsContent value="overview" className="space-y-4">
              <div className="min-w-0">
                <FinancialChart transactions={filteredTransactions} />
              </div>

              <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-[var(--dash-surface-strong)] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold font-[var(--font-display)] text-[color:var(--dash-ink)]">
                      Ringkasan
                    </h3>
                    <p className="text-xs text-[color:var(--dash-muted)]">
                      {months[selectedMonth].name} — {selectedYear}
                    </p>
                  </div>
                  <FinancialReportPDF
                    transactions={filteredTransactions}
                    saldoData={filteredSaldoData}
                    buttonClassName="rounded-full bg-white text-slate-950 hover:bg-slate-100"
                  />
                </div>

                <FinancialDashboard
                  transactions={filteredTransactions}
                  saldoData={filteredSaldoData}
                  isLoading={isLoading}
                  compactMode
                />
              </div>
            </TabsContent>

            <TabsContent value="saldo">
              <SaldoManager
                saldoData={filteredSaldoData}
                isLoading={isLoading}
                onDataChange={fetchSaldo}
              />
            </TabsContent>

            <TabsContent value="transaksi">
              <TransactionManager
                transactions={filteredTransactionsNonMeals}
                isLoading={isLoading}
                onDataChange={fetchTransactions}
              />
            </TabsContent>

            <TabsContent value="meals">
              <MealsMeetingManager
                transactions={filteredTransactions}
                isLoading={isLoading}
                onDataChange={fetchTransactions}
              />
            </TabsContent>

            <TabsContent value="galeri">
              <ImageGallery transactions={filteredTransactions} isLoading={isLoading} />
            </TabsContent>
          </Tabs>
        </div>

        {/* DESKTOP: full layout */}
        <div className="hidden lg:block space-y-6">
          <div
            className={
              viewMode === "compact"
                ? "grid gap-6 lg:grid-cols-[1.2fr_0.8fr]"
                : "grid gap-6"
            }
          >
            <div className="min-w-0">
              <FinancialChart transactions={filteredTransactions} />
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-white/10 bg-[var(--dash-surface-strong)] p-4">
                <div>
                  <h3 className="text-lg font-semibold font-[var(--font-display)] text-[color:var(--dash-ink)]">
                    Ringkasan Bulanan
                  </h3>
                  <p className="text-sm text-[color:var(--dash-muted)]">
                    {months[selectedMonth].name} — {selectedYear}
                  </p>
                </div>
                <FinancialReportPDF
                  transactions={filteredTransactions}
                  saldoData={filteredSaldoData}
                  buttonClassName="rounded-full bg-white text-slate-950 hover:bg-slate-100"
                />
              </div>

              <FinancialDashboard
                transactions={filteredTransactions}
                saldoData={filteredSaldoData}
                isLoading={isLoading}
                compactMode={viewMode === "compact"}
              />
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
            <div className="min-w-0">
              <SaldoManager
                saldoData={filteredSaldoData}
                isLoading={isLoading}
                onDataChange={fetchSaldo}
              />
            </div>
            <div className="min-w-0">
              <TransactionManager
                transactions={filteredTransactionsNonMeals}
                isLoading={isLoading}
                onDataChange={fetchTransactions}
              />
            </div>
          </div>

          <MealsMeetingManager
            transactions={filteredTransactions}
            isLoading={isLoading}
            onDataChange={fetchTransactions}
          />

          <ImageGallery transactions={filteredTransactions} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
}
