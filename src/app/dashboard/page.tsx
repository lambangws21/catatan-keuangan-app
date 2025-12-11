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
import ExpenseForm from "@/components/ExepenseForm";
import FinancialDashboard from "@/components/FinalcialDashboard";
import TransactionManager from "@/components/transaction-manager";
import SaldoForm from "@/components/FormSaldo";
import ImageGallery from "@/components/ImagePreview";
import SaldoManager from "@/components/ManajerSaldo";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import FinancialChart from "@/components/financial-chart";
import FinancialReportPDF from "@/components/financial-report";
import { Button } from "@/components/ui/button";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";

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

  const years = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i);
  const months = [
    { value: 0, name: 'Januari' }, { value: 1, name: 'Februari' }, { value: 2, name: 'Maret' },
    { value: 3, name: 'April' }, { value: 4, name: 'Mei' }, { value: 5, name: 'Juni' },
    { value: 6, name: 'Juli' }, { value: 7, name: 'Agustus' }, { value: 8, name: 'September' },
    { value: 9, name: 'Oktober' }, { value: 10, name: 'November' }, { value: 11, name: 'Desember' }
  ];

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard Keuangan</h1>
          <p className="text-gray-400 mt-1">Ringkasan aktivitas keuangan Anda.</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
              {theme === "dark" ? <Sun /> : <Moon />}
            </Button>

            <Button variant="outline" onClick={() => setViewMode((v) => (v === "compact" ? "expanded" : "compact"))}>
              {viewMode === "compact" ? "Expanded View" : "Compact View"}
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(Number(v))}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-white ">
                {months.map(m => <SelectItem key={m.value} value={String(m.value)}>{m.name}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
              <SelectTrigger className="w-[110px]"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-white ">
                {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <SaldoForm onSaldoAdded={fetchSaldo} />
            <ExpenseForm onTransactionAdded={fetchTransactions} />
          </div>
        </div>
      </header>

      {/* Chart + PDF + Summary */}
      <div className={viewMode === "compact" ? "grid grid-cols-1 md:grid-cols-2 gap-4" : "grid grid-cols-1 gap-4"}>
        <div className={viewMode === "compact" ? "col-span-1" : ""}>
          <FinancialChart transactions={filteredTransactions}  />
        </div>

        <div className={viewMode === "compact" ? "col-span-1 flex flex-col gap-3" : "flex flex-col gap-3"}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-white">Ringkasan Bulanan</h3>
              <p className="text-sm text-gray-400">{months[selectedMonth].name} — {selectedYear}</p>
            </div>
            <FinancialReportPDF transactions={filteredTransactions} saldoData={filteredSaldoData} />
          </div> 
          <FinancialDashboard transactions={filteredTransactions} saldoData={filteredSaldoData} isLoading={isLoading} />
        </div>
      </div>

      <SaldoManager saldoData={filteredSaldoData} isLoading={isLoading} onDataChange={fetchSaldo} />

      <TransactionManager transactions={filteredTransactions} isLoading={isLoading} onDataChange={fetchTransactions} />

      <ImageGallery transactions={filteredTransactions} isLoading={isLoading} />
    </div>
  );
}

