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
import { CalendarDays, Clock, Hospital, Stethoscope, Sun, Moon, WalletCards } from "lucide-react";
import { useTheme } from "next-themes";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MealsMeetingManager from "@/components/MealsMeetingManager";
import FinanceFloatingActions from "@/components/FinanceFloatingActions";
import { useVisitSchedules } from "@/hooks/use-visit-schedules";
import { getVisitAlertsForNextDays } from "@/lib/visit-dokter-alerts";
import { isCountedAsExpense, isReimbursement } from "@/lib/transactions";

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

export default function DashboardPage() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const { schedules: visitSchedules } = useVisitSchedules();

  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [allSaldoData, setAllSaldoData] = useState<Saldo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const [viewMode, setViewMode] = useState<"compact" | "expanded">("compact");

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

  const expenseTransactions = useMemo(() => {
    return filteredTransactions.filter((tx) => isCountedAsExpense(tx));
  }, [filteredTransactions]);

  const reimbursementTransactions = useMemo(() => {
    return filteredTransactions.filter((tx) => isReimbursement(tx));
  }, [filteredTransactions]);

  const visitAlerts = useMemo(() => {
    return getVisitAlertsForNextDays(visitSchedules, 1);
  }, [visitSchedules]);

  const formatCurrency = useCallback((value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(value);
  }, []);

  const totalPengeluaranBulanIni = useMemo(() => {
    return filteredTransactions
      .filter((tx) => isCountedAsExpense(tx))
      .reduce((sum, tx) => sum + Number(tx.jumlah || 0), 0);
  }, [filteredTransactions]);

  const saldoTerbaru = useMemo(() => {
    if (!filteredSaldoData.length) return null;
    return filteredSaldoData.reduce<Saldo | null>((latest, cur) => {
      if (!latest) return cur;
      return new Date(cur.tanggal).getTime() > new Date(latest.tanggal).getTime() ? cur : latest;
    }, null);
  }, [filteredSaldoData]);

  const nextVisitAlert = visitAlerts[0] ?? null;

  const years = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i);
  const months = [
    { value: 0, name: 'Januari' }, { value: 1, name: 'Februari' }, { value: 2, name: 'Maret' },
    { value: 3, name: 'April' }, { value: 4, name: 'Mei' }, { value: 5, name: 'Juni' },
    { value: 6, name: 'Juli' }, { value: 7, name: 'Agustus' }, { value: 8, name: 'September' },
    { value: 9, name: 'Oktober' }, { value: 10, name: 'November' }, { value: 11, name: 'Desember' }
  ];

  return (
    <div className="relative isolate mx-auto w-full max-w-[1560px]">
      <div className="pointer-events-none absolute -top-24 right-0 h-56 w-56 rounded-full bg-[radial-gradient(circle_at_center,rgba(20,184,166,0.16),transparent_65%)] blur-3xl" />

      <div className="relative z-10 space-y-4 font-(--font-body) text-(--dash-ink) sm:space-y-5">
        <header className="dash-panel overflow-hidden rounded-2xl p-4 backdrop-blur sm:p-5">
          <div className="relative flex flex-col gap-4">
            <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-cyan-400/10 blur-3xl" />
            <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="min-w-0 space-y-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-100">
                  <WalletCards className="h-3.5 w-3.5" />
                  Dashboard
                </span>
                <h1 className="wrap-break-word text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                  Dashboard Keuangan
                </h1>
                <p className="max-w-2xl text-sm leading-6 text-(--dash-muted)">
                  Ringkasan saldo, pengeluaran, reimbursement, dan jadwal penting dalam satu tampilan.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewMode((v) => (v === "compact" ? "expanded" : "compact"))}
                  className="hidden sm:inline-flex rounded-xl border border-white/10 bg-white/5 text-(--dash-ink) hover:bg-white/10"
                >
                  {viewMode === "compact" ? "Mode Detail" : "Mode Ringkas"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className="rounded-xl border border-white/10 bg-white/5 text-(--dash-ink) hover:bg-white/10"
                >
                  {theme === "dark" ? <Sun /> : <Moon />}
                  <span className="hidden sm:inline text-xs font-medium">Tema</span>
                </Button>
              </div>
            </div>

            <div className="relative grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
              <div className="grid gap-3 sm:grid-cols-[180px_150px]">
                <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(Number(v))}>
                  <SelectTrigger className="w-full rounded-xl border-white/10 bg-white/5 text-(--dash-ink) shadow-inner">
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
                  <SelectTrigger className="w-full rounded-xl border-white/10 bg-white/5 text-(--dash-ink) shadow-inner">
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

        {/* WIDGET RINGKAS (MOBILE) */}
        <section className="sm:hidden">
          <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <Link
              href="/visit-dokter"
              className="min-w-[220px] rounded-3xl border border-white/10 bg-(--dash-surface-strong) p-4 text-(--dash-ink) shadow-[0_16px_40px_rgba(2,6,23,0.35)]"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-[10px] uppercase tracking-[0.35em] text-(--dash-muted)">
                  Visit
                </p>
                <span className="inline-flex items-center gap-2 text-xs text-cyan-300">
                  <CalendarDays className="h-4 w-4" />
                  {visitAlerts.length ? `${visitAlerts.length} alert` : "Aman"}
                </span>
              </div>
              <p className="mt-2 text-sm font-semibold">
                {nextVisitAlert ? nextVisitAlert.namaDokter : "Tidak ada jadwal"}
              </p>
              <p className="mt-1 text-xs text-(--dash-muted)">
                {nextVisitAlert
                  ? `${new Date(nextVisitAlert.waktuVisit).toLocaleString("id-ID")}`
                  : "Hari ini & besok kosong"}
              </p>
            </Link>

            <Link
              href="/transaction-manager"
              className="min-w-[220px] rounded-3xl border border-white/10 bg-(--dash-surface-strong) p-4 text-(--dash-ink) shadow-[0_16px_40px_rgba(2,6,23,0.35)]"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-[10px] uppercase tracking-[0.35em] text-(--dash-muted)">
                  Pengeluaran
                </p>
                <span className="inline-flex items-center gap-2 text-xs text-(--dash-muted)">
                  Bulan ini
                </span>
              </div>
              <p className="mt-2 text-lg font-semibold tabular-nums">
                {formatCurrency(totalPengeluaranBulanIni)}
              </p>
              <p className="mt-1 text-xs text-(--dash-muted)">
                Tap untuk input/scan struk
              </p>
            </Link>

            <Link
              href="/saldo"
              className="min-w-[220px] rounded-3xl border border-white/10 bg-(--dash-surface-strong) p-4 text-(--dash-ink) shadow-[0_16px_40px_rgba(2,6,23,0.35)]"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-[10px] uppercase tracking-[0.35em] text-(--dash-muted)">
                  Saldo
                </p>
                <span className="text-xs text-(--dash-muted)">
                  {filteredSaldoData.length} item
                </span>
              </div>
              <p className="mt-2 text-sm font-semibold">
                {saldoTerbaru ? "Update terakhir" : "Belum ada data"}
              </p>
              <p className="mt-1 text-xs text-(--dash-muted)">
                {saldoTerbaru
                  ? `${saldoTerbaru.tanggal} • ${formatCurrency(saldoTerbaru.jumlah)}`
                  : "Input saldo untuk mulai"}
              </p>
            </Link>
          </div>
        </section>

        {/* DETAIL VISIT (TABLET/DESKTOP) */}
        <section className="hidden sm:block dash-panel rounded-2xl p-3 sm:p-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.32em] text-(--dash-muted)">
                Visit Dokter
              </p>
              <h2 className="mt-1 text-base font-semibold text-(--dash-ink)">
                Alert jadwal hari ini & besok
              </h2>
            </div>

            <Button
              asChild
              variant="secondary"
              className="border border-white/10 bg-white/10 text-(--dash-ink) hover:bg-white/15"
            >
              <Link href="/visit-dokter">
                <CalendarDays className="mr-2 h-4 w-4" />
                Buka Visit Dokter
              </Link>
            </Button>
          </div>

          {visitAlerts.length ? (
            <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {visitAlerts.slice(0, 3).map((v) => {
                const when = new Date(v.waktuVisit);
                const dayLabel = v.dayOffset === 0 ? "Hari ini" : "Besok";
                return (
                  <Link
                    key={v.id}
                    href="/visit-dokter"
                    className="group rounded-xl border border-white/10 bg-white/[0.04] p-3 transition hover:border-cyan-500/40 hover:bg-cyan-500/10"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] font-semibold text-cyan-200/90">
                        {dayLabel}
                      </span>
                      <span className="inline-flex items-center gap-2 text-xs text-(--dash-muted)">
                        <Clock className="h-4 w-4 text-cyan-300" />
                        {when.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>

                    <div className="mt-2 space-y-1.5">
                      <p className="inline-flex items-center gap-2 text-sm font-semibold text-(--dash-ink)">
                        <Stethoscope className="h-4 w-4 text-(--dash-muted)" />
                        <span className="truncate">{v.namaDokter}</span>
                      </p>
                      <p className="inline-flex items-center gap-2 text-xs text-(--dash-muted)">
                        <Hospital className="h-4 w-4 text-(--dash-muted)" />
                        <span className="truncate">{v.rumahSakit}</span>
                      </p>
                      {v.perawat ? (
                        <p className="text-xs text-(--dash-muted)">
                          Perawat: <span className="font-semibold text-(--dash-ink)">{v.perawat}</span>
                        </p>
                      ) : null}
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm text-(--dash-muted)">
              Tidak ada jadwal visit terdekat (hari ini & besok).
            </div>
          )}
        </section>

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
              <TabsTrigger value="galeri" className="min-w-[92px] text-xs">
                Galeri
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="min-w-0">
                <FinancialChart transactions={filteredTransactions} />
              </div>

              <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-(--dash-surface-strong) p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-(--dash-ink)">
                      Ringkasan
                    </h3>
                    <p className="text-xs text-(--dash-muted)">
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

            <TabsContent value="saldo" className="space-y-4">
              <SaldoManager
                saldoData={filteredSaldoData}
                isLoading={isLoading}
                onDataChange={fetchSaldo}
                floatingActionOffset="stacked"
                showCreateAction={false}
              />
              <MealsMeetingManager
                transactions={filteredTransactions}
                isLoading={isLoading}
                onDataChange={fetchTransactions}
              />
            </TabsContent>

            <TabsContent value="transaksi">
              <TransactionManager
                transactions={expenseTransactions}
                saldoData={filteredSaldoData}
                reimbursements={reimbursementTransactions}
                isLoading={isLoading}
                onDataChange={fetchTransactions}
                showCreateAction={false}
              />
            </TabsContent>

            <TabsContent value="galeri">
              <ImageGallery transactions={filteredTransactions} isLoading={isLoading} />
            </TabsContent>
          </Tabs>
        </div>

        {/* DESKTOP: full layout */}
        <div className="hidden space-y-5 lg:block">
          <div
            className={
              viewMode === "compact"
                ? "grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.58fr)] xl:items-start"
                : "grid gap-5"
            }
          >
            <div className="min-w-0">
              <FinancialChart transactions={filteredTransactions} />
            </div>

            <div className="flex min-w-0 flex-col gap-3">
              <div className="dash-panel rounded-2xl p-4 sm:flex sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold text-(--dash-ink)">
                    Ringkasan Bulanan
                  </h3>
                  <p className="text-sm text-(--dash-muted)">
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

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.75fr)_minmax(340px,0.7fr)] xl:items-start">
            <div className="min-w-0">
              <TransactionManager
                transactions={expenseTransactions}
                saldoData={filteredSaldoData}
                reimbursements={reimbursementTransactions}
                isLoading={isLoading}
                onDataChange={fetchTransactions}
                showCreateAction={false}
              />
            </div>
            <div className="min-w-0 space-y-5">
              <SaldoManager
                saldoData={filteredSaldoData}
                isLoading={isLoading}
                onDataChange={fetchSaldo}
                floatingActionOffset="stacked"
                showCreateAction={false}
              />
              <MealsMeetingManager
                transactions={filteredTransactions}
                isLoading={isLoading}
                onDataChange={fetchTransactions}
              />
            </div>
          </div>

          <ImageGallery transactions={filteredTransactions} isLoading={isLoading} />
        </div>

        <FinanceFloatingActions
          onSaldoAdded={fetchSaldo}
          onTransactionAdded={fetchTransactions}
        />
      </div>
    </div>
  );
}
