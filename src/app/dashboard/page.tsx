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
import Link from "next/link";
import {
  CalendarDays, Clock, Hospital, Stethoscope,
  TrendingDown, TrendingUp, Wallet, Handshake, ArrowUpRight,
  BarChart3, ChevronRight, Activity, Sparkles,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MealsMeetingManager from "@/components/MealsMeetingManager";
import FinanceFloatingActions from "@/components/FinanceFloatingActions";
import { useVisitSchedules } from "@/hooks/use-visit-schedules";
import { getVisitAlertsForNextDays } from "@/lib/visit-dokter-alerts";
import { isCountedAsExpense, isReimbursement, reimbursementTotal } from "@/lib/transactions";

interface Transaction {
  id: string;
  tanggal: string;
  jenisBiaya: string;
  keterangan: string;
  jumlah: number;
  klaim: "Ya" | "Tidak" | string;
  fileUrl?: string;
  sumberBiaya?: string | null;
}
interface Saldo {
  id: string;
  tanggal: string;
  keterangan: string;
  jumlah: number;
}

const NAV_TABS = [
  { id: "ikhtisar", label: "Ikhtisar" },
  { id: "transaksi", label: "Transaksi" },
  { id: "saldo", label: "Saldo & Dana" },
  { id: "meals", label: "Meals & Meeting" },
  { id: "galeri", label: "Galeri Berkas" },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const { schedules: visitSchedules } = useVisitSchedules();

  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [allSaldoData, setAllSaldoData] = useState<Saldo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeNav, setActiveNav] = useState("ikhtisar");

  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const fetchTransactions = useCallback(async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/transactions", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error();
      setAllTransactions(await res.json());
    } catch {
      setAllTransactions([]);
    }
  }, [user]);

  const fetchSaldo = useCallback(async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/saldo", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error();
      setAllSaldoData(await res.json());
    } catch {
      setAllSaldoData([]);
    }
  }, [user]);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      if (user) await Promise.all([fetchTransactions(), fetchSaldo()]);
      setIsLoading(false);
    };
    load();
  }, [user, fetchTransactions, fetchSaldo]);

  const filteredTransactions = useMemo(() => {
    if (!Array.isArray(allTransactions)) return [];
    return allTransactions.filter((tx) => {
      const d = new Date(tx.tanggal);
      return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
    });
  }, [allTransactions, selectedMonth, selectedYear]);

  const filteredSaldoData = useMemo(() => {
    if (!Array.isArray(allSaldoData)) return [];
    return allSaldoData.filter((item) => {
      const d = new Date(item.tanggal);
      return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
    });
  }, [allSaldoData, selectedMonth, selectedYear]);

  const expenseTransactions = useMemo(
    () => filteredTransactions.filter((tx) => isCountedAsExpense(tx)),
    [filteredTransactions]
  );
  const reimbursementTransactions = useMemo(
    () => filteredTransactions.filter((tx) => isReimbursement(tx)),
    [filteredTransactions]
  );

  const visitAlerts = useMemo(
    () => getVisitAlertsForNextDays(visitSchedules, 1),
    [visitSchedules]
  );

  const totalPengeluaran = useMemo(
    () => expenseTransactions.reduce((s, tx) => s + Number(tx.jumlah || 0), 0),
    [expenseTransactions]
  );
  const totalSaldo = useMemo(
    () => filteredSaldoData.reduce((s, item) => s + Number(item.jumlah || 0), 0),
    [filteredSaldoData]
  );
  const totalReimburse = useMemo(
    () => reimbursementTotal(reimbursementTransactions),
    [reimbursementTransactions]
  );
  const saldoBersih = totalSaldo - totalPengeluaran;

  const defaultDate = useMemo(() => {
    const today = new Date();
    if (selectedMonth === today.getMonth() && selectedYear === today.getFullYear()) {
      return today.toISOString().split("T")[0];
    }
    return `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-01`;
  }, [selectedMonth, selectedYear]);

  const years = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i);
  const months = [
    { value: 0, name: "Januari" }, { value: 1, name: "Februari" }, { value: 2, name: "Maret" },
    { value: 3, name: "April" }, { value: 4, name: "Mei" }, { value: 5, name: "Juni" },
    { value: 6, name: "Juli" }, { value: 7, name: "Agustus" }, { value: 8, name: "September" },
    { value: 9, name: "Oktober" }, { value: 10, name: "November" }, { value: 11, name: "Desember" },
  ];

  const fmt = (v: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(v);

  return (
    <div className="relative isolate w-full font-(--font-body)">
      {/* ── AMBIENT BACKGROUND GLOWS ─────────────────── */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-40 right-0 h-[500px] w-[500px] rounded-full bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.09),transparent_65%)] blur-3xl" />
        <div className="absolute left-1/3 top-1/4 h-[400px] w-[400px] rounded-full bg-[radial-gradient(circle_at_center,rgba(139,92,246,0.06),transparent_65%)] blur-3xl" />
        <div className="absolute bottom-0 left-0 h-[300px] w-[300px] rounded-full bg-[radial-gradient(circle_at_center,rgba(20,184,166,0.06),transparent_65%)] blur-3xl" />
      </div>

      <div className="relative z-10">

        {/* ══════════════════════════════════════════════
            TOP NAV BAR
        ══════════════════════════════════════════════ */}
        <nav className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/80 backdrop-blur-2xl">
          <div className="mx-auto flex max-w-[1600px] items-center gap-3 px-4 py-2.5 sm:px-6">

            {/* Brand */}
            <Link href="/dashboard" className="flex shrink-0 items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-linear-to-br from-cyan-400 to-cyan-600 shadow-[0_0_20px_rgba(6,182,212,0.45)]">
                <BarChart3 className="h-4 w-4 text-white" />
              </span>
              <span className="hidden text-sm font-bold tracking-tight text-white sm:block">Keuanganku</span>
            </Link>

            {/* Divider */}
            <div className="h-5 w-px shrink-0 bg-white/15" />

            {/* Nav tabs */}
            <div className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {NAV_TABS.map((tab) => {
                const active = activeNav === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveNav(tab.id)}
                    className={[
                      "shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-150",
                      active
                        ? "bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-500/40"
                        : "text-slate-400 hover:bg-white/5 hover:text-slate-200",
                    ].join(" ")}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Right actions */}
            <div className="flex shrink-0 items-center gap-2">
              <FinancialReportPDF
                transactions={filteredTransactions}
                saldoData={filteredSaldoData}
                buttonClassName="h-8 rounded-lg bg-cyan-500 px-3.5 text-xs font-semibold text-white shadow-[0_0_16px_rgba(6,182,212,0.35)] transition hover:bg-cyan-400"
              />
            </div>
          </div>
        </nav>

        {/* ══════════════════════════════════════════════
            PAGE HEADER
        ══════════════════════════════════════════════ */}
        <div className="border-b border-white/8 bg-slate-950/60 backdrop-blur-xl">
          <div className="mx-auto max-w-[1600px] px-4 py-4 sm:px-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

              {/* Title area */}
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-(--dash-muted)">
                  <Activity className="h-3.5 w-3.5 text-cyan-500" />
                  <span className="text-[10px] uppercase tracking-widest">Dashboard Keuangan</span>
                  <ChevronRight className="h-3 w-3 opacity-50" />
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-300">
                    {months[selectedMonth].name} {selectedYear}
                  </span>
                </div>
                <h1 className="mt-1.5 text-xl font-semibold text-white sm:text-2xl">
                  Catatan Keuangan
                </h1>
              </div>

              {/* Period selectors */}
              <div className="flex items-center gap-2">
                <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(Number(v))}>
                  <SelectTrigger className="h-9 w-[140px] rounded-xl border-white/10 bg-white/5 text-xs text-slate-300 ring-0 focus:ring-0 focus:ring-offset-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-white/10 bg-slate-900 text-slate-100">
                    {months.map((m) => (
                      <SelectItem key={m.value} value={String(m.value)} className="text-xs">
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
                  <SelectTrigger className="h-9 w-[90px] rounded-xl border-white/10 bg-white/5 text-xs text-slate-300 ring-0 focus:ring-0 focus:ring-offset-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-white/10 bg-slate-900 text-slate-100">
                    {years.map((y) => (
                      <SelectItem key={y} value={String(y)} className="text-xs">
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════
            STAT CARDS ROW
        ══════════════════════════════════════════════ */}
        <div className="border-b border-white/8 bg-slate-950/40">
          <div className="mx-auto max-w-[1600px] px-4 py-4 sm:px-6">
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">

              {/* Pengeluaran */}
              <div className="group relative overflow-hidden rounded-2xl border border-rose-500/20 bg-linear-to-br from-rose-500/10 via-rose-500/5 to-transparent p-4 shadow-[0_4px_24px_rgba(244,63,94,0.08)] transition-all duration-200 hover:border-rose-500/35 hover:shadow-[0_8px_32px_rgba(244,63,94,0.14)]">
                <div className="pointer-events-none absolute right-0 top-0 h-24 w-24 translate-x-6 -translate-y-6 rounded-full bg-rose-500/10 blur-2xl" />
                <div className="relative flex items-start justify-between gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-rose-500/30 bg-rose-500/15">
                    <TrendingDown className="h-4 w-4 text-rose-400" />
                  </div>
                  <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-semibold text-rose-400">
                    {expenseTransactions.length} tx
                  </span>
                </div>
                <div className="relative mt-3">
                  <p className="text-[10px] font-medium uppercase tracking-widest text-slate-500">Pengeluaran</p>
                  <p className="mt-1 truncate text-lg font-bold tabular-nums text-white sm:text-xl">
                    {isLoading ? <span className="opacity-30">—</span> : fmt(totalPengeluaran)}
                  </p>
                </div>
              </div>

              {/* Saldo Masuk */}
              <div className="group relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-linear-to-br from-emerald-500/10 via-emerald-500/5 to-transparent p-4 shadow-[0_4px_24px_rgba(16,185,129,0.08)] transition-all duration-200 hover:border-emerald-500/35 hover:shadow-[0_8px_32px_rgba(16,185,129,0.14)]">
                <div className="pointer-events-none absolute right-0 top-0 h-24 w-24 translate-x-6 -translate-y-6 rounded-full bg-emerald-500/10 blur-2xl" />
                <div className="relative flex items-start justify-between gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/15">
                    <TrendingUp className="h-4 w-4 text-emerald-400" />
                  </div>
                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                    {filteredSaldoData.length} entri
                  </span>
                </div>
                <div className="relative mt-3">
                  <p className="text-[10px] font-medium uppercase tracking-widest text-slate-500">Saldo Masuk</p>
                  <p className="mt-1 truncate text-lg font-bold tabular-nums text-white sm:text-xl">
                    {isLoading ? <span className="opacity-30">—</span> : fmt(totalSaldo)}
                  </p>
                </div>
              </div>

              {/* Saldo Bersih */}
              <div className={[
                "group relative overflow-hidden rounded-2xl border p-4 transition-all duration-200",
                saldoBersih >= 0
                  ? "border-cyan-500/20 bg-linear-to-br from-cyan-500/10 via-cyan-500/5 to-transparent shadow-[0_4px_24px_rgba(6,182,212,0.08)] hover:border-cyan-500/35 hover:shadow-[0_8px_32px_rgba(6,182,212,0.14)]"
                  : "border-rose-500/20 bg-linear-to-br from-rose-500/10 via-rose-500/5 to-transparent shadow-[0_4px_24px_rgba(244,63,94,0.08)] hover:border-rose-500/35",
              ].join(" ")}>
                <div className={[
                  "pointer-events-none absolute right-0 top-0 h-24 w-24 translate-x-6 -translate-y-6 rounded-full blur-2xl",
                  saldoBersih >= 0 ? "bg-cyan-500/10" : "bg-rose-500/10",
                ].join(" ")} />
                <div className="relative flex items-start justify-between gap-2">
                  <div className={[
                    "flex h-9 w-9 items-center justify-center rounded-xl border",
                    saldoBersih >= 0
                      ? "border-cyan-500/30 bg-cyan-500/15"
                      : "border-rose-500/30 bg-rose-500/15",
                  ].join(" ")}>
                    <Wallet className={["h-4 w-4", saldoBersih >= 0 ? "text-cyan-400" : "text-rose-400"].join(" ")} />
                  </div>
                  <span className={[
                    "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                    saldoBersih >= 0 ? "bg-cyan-500/15 text-cyan-400" : "bg-rose-500/15 text-rose-400",
                  ].join(" ")}>
                    {saldoBersih >= 0 ? "Surplus" : "Defisit"}
                  </span>
                </div>
                <div className="relative mt-3">
                  <p className="text-[10px] font-medium uppercase tracking-widest text-slate-500">Saldo Bersih</p>
                  <p className={[
                    "mt-1 truncate text-lg font-bold tabular-nums sm:text-xl",
                    saldoBersih >= 0 ? "text-cyan-300" : "text-rose-400",
                  ].join(" ")}>
                    {isLoading ? <span className="opacity-30">—</span> : fmt(saldoBersih)}
                  </p>
                </div>
              </div>

              {/* Klaim Pending */}
              <div className={[
                "group relative overflow-hidden rounded-2xl border p-4 transition-all duration-200",
                reimbursementTransactions.length > 0
                  ? "border-amber-500/20 bg-linear-to-br from-amber-500/10 via-amber-500/5 to-transparent shadow-[0_4px_24px_rgba(245,158,11,0.08)] hover:border-amber-500/35 hover:shadow-[0_8px_32px_rgba(245,158,11,0.14)]"
                  : "border-white/10 bg-white/5 hover:border-white/15",
              ].join(" ")}>
                <div className="pointer-events-none absolute right-0 top-0 h-24 w-24 translate-x-6 -translate-y-6 rounded-full bg-amber-500/8 blur-2xl" />
                <div className="relative flex items-start justify-between gap-2">
                  <div className={[
                    "flex h-9 w-9 items-center justify-center rounded-xl border",
                    reimbursementTransactions.length > 0
                      ? "border-amber-500/30 bg-amber-500/15"
                      : "border-white/10 bg-white/5",
                  ].join(" ")}>
                    <Handshake className={["h-4 w-4", reimbursementTransactions.length > 0 ? "text-amber-400" : "text-slate-500"].join(" ")} />
                  </div>
                  <span className={[
                    "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                    reimbursementTransactions.length > 0
                      ? "bg-amber-500/15 text-amber-400"
                      : "bg-white/5 text-slate-500",
                  ].join(" ")}>
                    {reimbursementTransactions.length} klaim
                  </span>
                </div>
                <div className="relative mt-3">
                  <p className="text-[10px] font-medium uppercase tracking-widest text-slate-500">Klaim Pending</p>
                  {isLoading ? (
                    <p className="mt-1 text-lg font-bold text-white opacity-30">—</p>
                  ) : reimbursementTransactions.length === 0 ? (
                    <p className="mt-1 text-lg font-bold text-emerald-400">Aman</p>
                  ) : (
                    <p className="mt-1 truncate text-lg font-bold tabular-nums text-amber-300 sm:text-xl">
                      {fmt(totalReimburse)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Visit Alert Banner ───────────────────────── */}
        {visitAlerts.length > 0 && (
          <div className="border-b border-cyan-500/20 bg-cyan-950/30">
            <div className="mx-auto max-w-[1600px] px-4 py-2 sm:px-6">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                <span className="flex shrink-0 items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-cyan-400">
                  <Sparkles className="h-3 w-3" />
                  Alert Visit
                </span>
                {visitAlerts.slice(0, 3).map((v) => (
                  <Link key={v.id} href="/visit-dokter"
                    className="flex items-center gap-1.5 text-xs text-slate-300 transition hover:text-cyan-300">
                    <Clock className="h-3 w-3 text-cyan-500" />
                    <span className="font-medium">{v.namaDokter}</span>
                    <span className="text-slate-500">
                      · {v.dayOffset === 0 ? "Hari ini" : "Besok"}{" "}
                      {new Date(v.waktuVisit).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <ArrowUpRight className="h-3 w-3 text-slate-500" />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════
            MOBILE TABS
        ══════════════════════════════════════════════ */}
        <div className="mx-auto max-w-[1600px] px-3 py-4 lg:hidden sm:px-4">
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="w-full justify-start gap-1 overflow-x-auto rounded-xl border border-white/10 bg-slate-900/80 p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <TabsTrigger value="overview" className="rounded-lg text-xs">Ikhtisar</TabsTrigger>
              <TabsTrigger value="saldo" className="rounded-lg text-xs">Saldo</TabsTrigger>
              <TabsTrigger value="transaksi" className="rounded-lg text-xs">Transaksi</TabsTrigger>
              <TabsTrigger value="meals" className="rounded-lg text-xs">Meals</TabsTrigger>
              <TabsTrigger value="galeri" className="rounded-lg text-xs">Galeri</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60">
                <div className="border-b border-white/8 px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Analitik</p>
                  <h3 className="mt-0.5 text-sm font-semibold text-white">Tren Pengeluaran</h3>
                </div>
                <div className="p-4">
                  <FinancialChart transactions={filteredTransactions} />
                </div>
              </div>
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60">
                <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Ringkasan Bulanan</p>
                    <h3 className="mt-0.5 text-sm font-semibold text-white">{months[selectedMonth].name} {selectedYear}</h3>
                  </div>
                  <FinancialReportPDF transactions={filteredTransactions} saldoData={filteredSaldoData}
                    buttonClassName="rounded-lg bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-900 hover:bg-slate-100" />
                </div>
                <div className="p-4">
                  <FinancialDashboard transactions={filteredTransactions} saldoData={filteredSaldoData} isLoading={isLoading} compactMode />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="saldo" className="space-y-4">
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60">
                <div className="border-b border-white/8 px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Sirkulasi Dana</p>
                  <h3 className="mt-0.5 text-sm font-semibold text-white">Manajemen Saldo</h3>
                </div>
                <div className="p-4">
                  <SaldoManager saldoData={filteredSaldoData} isLoading={isLoading} onDataChange={fetchSaldo}
                    floatingActionOffset="stacked" showCreateAction={false} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="transaksi">
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60">
                <div className="border-b border-white/8 px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Riwayat Transaksi</p>
                  <h3 className="mt-0.5 text-sm font-semibold text-white">Catatan Pengeluaran</h3>
                </div>
                <div className="p-4">
                  <TransactionManager transactions={expenseTransactions} saldoData={filteredSaldoData}
                    reimbursements={reimbursementTransactions} isLoading={isLoading}
                    onDataChange={fetchTransactions} showCreateAction={false} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="meals">
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60">
                <div className="border-b border-white/8 px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Kategori Khusus</p>
                  <h3 className="mt-0.5 text-sm font-semibold text-white">Meals & Meeting</h3>
                </div>
                <div className="p-4">
                  <MealsMeetingManager transactions={filteredTransactions} isLoading={isLoading}
                    onDataChange={fetchTransactions} defaultDate={defaultDate} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="galeri">
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60">
                <div className="border-b border-white/8 px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Lampiran</p>
                  <h3 className="mt-0.5 text-sm font-semibold text-white">Galeri Berkas</h3>
                </div>
                <div className="p-4">
                  <ImageGallery transactions={filteredTransactions} isLoading={isLoading} />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* ══════════════════════════════════════════════
            DESKTOP LAYOUT
        ══════════════════════════════════════════════ */}
        <div className="mx-auto hidden max-w-[1600px] space-y-5 px-5 py-5 lg:block">

          {/* ─ ROW 1: Chart + Ringkasan ─ */}
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.6fr)]">

            {/* Chart panel */}
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70 shadow-[0_8px_32px_rgba(2,6,23,0.4)]">
              <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Analitik</p>
                  <h2 className="mt-0.5 text-base font-semibold text-white">Tren Pengeluaran</h2>
                </div>
                <span className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-slate-400">
                  {months[selectedMonth].name} {selectedYear}
                </span>
              </div>
              <div className="p-5">
                <FinancialChart transactions={filteredTransactions} />
              </div>
            </div>

            {/* Ringkasan panel */}
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70 shadow-[0_8px_32px_rgba(2,6,23,0.4)]">
              <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Ringkasan Bulanan</p>
                  <h2 className="mt-0.5 text-base font-semibold text-white">
                    {months[selectedMonth].name} {selectedYear}
                  </h2>
                </div>
                <FinancialReportPDF
                  transactions={filteredTransactions}
                  saldoData={filteredSaldoData}
                  buttonClassName="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 shadow-sm transition hover:bg-slate-100"
                />
              </div>
              <div className="p-5">
                <FinancialDashboard
                  transactions={filteredTransactions}
                  saldoData={filteredSaldoData}
                  isLoading={isLoading}
                  compactMode
                />
              </div>
            </div>
          </div>

          {/* ─ ROW 2: Transaksi + Saldo ─ */}
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.6fr)]">

            {/* Transaction panel */}
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70 shadow-[0_8px_32px_rgba(2,6,23,0.4)]">
              <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Riwayat Transaksi</p>
                  <h2 className="mt-0.5 text-base font-semibold text-white">Catatan Pengeluaran</h2>
                </div>
                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-slate-400">
                  {expenseTransactions.length} transaksi
                </span>
              </div>
              <div className="p-5">
                <TransactionManager
                  transactions={expenseTransactions}
                  saldoData={filteredSaldoData}
                  reimbursements={reimbursementTransactions}
                  isLoading={isLoading}
                  onDataChange={fetchTransactions}
                  showCreateAction={false}
                />
              </div>
            </div>

            {/* Saldo panel */}
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70 shadow-[0_8px_32px_rgba(2,6,23,0.4)]">
              <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Sirkulasi Dana Terkini</p>
                  <h2 className="mt-0.5 text-base font-semibold text-white">Manajemen Saldo</h2>
                </div>
                <Link href="/saldo-manager"
                  className="flex items-center gap-1 text-[11px] text-cyan-400 transition hover:text-cyan-300">
                  <span>Lihat semua</span>
                  <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="p-5">
                <SaldoManager
                  saldoData={filteredSaldoData}
                  isLoading={isLoading}
                  onDataChange={fetchSaldo}
                  floatingActionOffset="stacked"
                  showCreateAction={false}
                />
              </div>
            </div>
          </div>

          {/* ─ ROW 3: Meals & Meeting ─ */}
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70 shadow-[0_8px_32px_rgba(2,6,23,0.4)]">
            <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Kategori Khusus</p>
                <h2 className="mt-0.5 text-base font-semibold text-white">Meals & Meeting</h2>
              </div>
              <div className="flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-400">
                <Handshake className="h-3 w-3" />
                <span>{filteredTransactions.filter((tx) => tx.jenisBiaya === "Meals Metting").length} entri</span>
              </div>
            </div>
            <div className="p-5">
              <MealsMeetingManager
                transactions={filteredTransactions}
                isLoading={isLoading}
                onDataChange={fetchTransactions}
                defaultDate={defaultDate}
              />
            </div>
          </div>

          {/* ─ ROW 4: Visit Dokter (only when alerts exist) ─ */}
          {visitAlerts.length > 0 && (
            <div className="overflow-hidden rounded-2xl border border-cyan-500/20 bg-slate-900/70 shadow-[0_8px_32px_rgba(6,182,212,0.06)]">
              <div className="flex items-center justify-between border-b border-cyan-500/15 bg-cyan-500/5 px-5 py-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-cyan-600">Jadwal Terkini</p>
                  <h2 className="mt-0.5 text-base font-semibold text-white">Visit Dokter</h2>
                </div>
                <Button asChild variant="ghost" size="sm"
                  className="h-8 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 text-xs text-cyan-300 hover:bg-cyan-500/20">
                  <Link href="/visit-dokter">
                    <CalendarDays className="mr-1.5 h-3.5 w-3.5" /> Buka Jadwal
                  </Link>
                </Button>
              </div>
              <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-3">
                {visitAlerts.slice(0, 3).map((v) => {
                  const when = new Date(v.waktuVisit);
                  return (
                    <Link key={v.id} href="/visit-dokter"
                      className="group rounded-xl border border-white/10 bg-white/5 p-4 transition hover:border-cyan-500/40 hover:bg-cyan-500/8">
                      <div className="flex items-center justify-between gap-2">
                        <span className="rounded-full border border-cyan-400/30 bg-cyan-500/15 px-2 py-0.5 text-[10px] font-semibold text-cyan-300">
                          {v.dayOffset === 0 ? "Hari ini" : "Besok"}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-slate-500">
                          <Clock className="h-3.5 w-3.5 text-cyan-500" />
                          {when.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-white">
                        <Stethoscope className="h-4 w-4 shrink-0 text-slate-500" />
                        <span className="truncate">{v.namaDokter}</span>
                      </p>
                      <p className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                        <Hospital className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{v.rumahSakit}</span>
                      </p>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* ─ ROW 5: Galeri ─ */}
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70 shadow-[0_8px_32px_rgba(2,6,23,0.4)]">
            <div className="border-b border-white/8 px-5 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Lampiran Berkas</p>
              <h2 className="mt-0.5 text-base font-semibold text-white">Galeri Berkas</h2>
            </div>
            <div className="p-5">
              <ImageGallery transactions={filteredTransactions} isLoading={isLoading} />
            </div>
          </div>

        </div>{/* end desktop */}

        <FinanceFloatingActions
          onSaldoAdded={fetchSaldo}
          onTransactionAdded={fetchTransactions}
          defaultDate={defaultDate}
        />
      </div>
    </div>
  );
}
