"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  CartesianGrid,
} from "recharts";
import { useTheme } from "next-themes";
import {
  Building2,
  RotateCcw,
  SlidersHorizontal,
  TrendingUp,
  UserRound,
  Wallet,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Asumsikan tipe Operation diimpor dari halaman utamanya atau didefinisikan di sini
interface Operation {
  id: string;
  jumlah: number;
  rumahSakit: string;
  dokter?: string;
  date?: string;
  tindakanOperasi?: string;
}

const VISIBILITY_KEYS = [
  "cardTotalAsistensi",
  "cardJumlahTindakan",
  "cardRataRataAsistensi",
  "cardTopHospital",
  "cardTopDoctor",
  "analysisSection",
  "analysisCaseSummary",
  "analysisCodeCounts",
  "analysisTopOperators",
  "analysisChart",
] as const;

type VisibilityKey = (typeof VISIBILITY_KEYS)[number];
type OperationDashboardVisibility = Record<VisibilityKey, boolean>;

const DEFAULT_VISIBILITY: OperationDashboardVisibility = {
  cardTotalAsistensi: true,
  cardJumlahTindakan: true,
  cardRataRataAsistensi: true,
  cardTopHospital: true,
  cardTopDoctor: true,
  analysisSection: true,
  analysisCaseSummary: true,
  analysisCodeCounts: true,
  analysisTopOperators: true,
  analysisChart: true,
};

const coerceVisibility = (
  input: unknown,
  fallback: OperationDashboardVisibility
): OperationDashboardVisibility => {
  const next: OperationDashboardVisibility = { ...fallback };
  if (!input || typeof input !== "object") return next;

  for (const key of VISIBILITY_KEYS) {
    const value = (input as Record<string, unknown>)[key];
    if (typeof value === "boolean") next[key] = value;
  }

  return next;
};

interface DashboardProps {
  operations: Operation[];
  isLoading: boolean;
  defaultVisibility?: Partial<OperationDashboardVisibility>;
  storageKey?: string;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);

const matchCode = (text: string, code: "bipolar" | "thr" | "tkr" | "uka") => {
  const t = String(text || "");
  const clean = t.toLowerCase();

  if (code === "bipolar") return /\bbipolar\b/i.test(clean);
  if (code === "thr") return /t\s*\.?\s*h\s*\.?\s*r/i.test(clean);
  if (code === "tkr") return /t\s*\.?\s*k\s*\.?\s*r/i.test(clean);
  return /u\s*\.?\s*k\s*\.?\s*a/i.test(clean);
};

const classifyCase = (tindakanOperasi?: string) => {
  const t = String(tindakanOperasi || "");
  const hasBipolar = matchCode(t, "bipolar");
  const hasTHR = matchCode(t, "thr");
  const hasTKR = matchCode(t, "tkr");
  const hasUKA = matchCode(t, "uka");

  // Knee first (avoid double-count if text mentions hip+knee)
  if (hasTKR || hasUKA || /\bknee\b/i.test(t)) return "knee";
  if (hasBipolar || hasTHR || /\bhip\b/i.test(t)) return "hip";
  return null;
};

function BarTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload?: { name?: string; value?: number } }[];
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0]?.payload;
  return (
    <div className="rounded-2xl border border-white/10 bg-(--dash-surface-strong)] px-4 py-3 text-sm text-(--dash-ink)] shadow-[0_20px_50px_rgba(2,6,23,0.55)]">
      <p className="text-[11px] uppercase tracking-[0.3em] text-(--dash-muted)]">
        Rumah Sakit
      </p>
      <p className="mt-1 font-semibold">{item?.name ?? "-"}</p>
      <p className="mt-1 font-semibold text-emerald-300">
        {new Intl.NumberFormat("id-ID").format(Number(item?.value ?? 0))} operasi
      </p>
    </div>
  );
}

export default function OperationDashboard({
  operations,
  isLoading,
  defaultVisibility,
  storageKey = "operation-dashboard:visibility:v1",
}: DashboardProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const baseVisibility = useMemo(
    () => coerceVisibility(defaultVisibility, DEFAULT_VISIBILITY),
    [defaultVisibility]
  );

  const [visibility, setVisibility] = useState<OperationDashboardVisibility>(
    baseVisibility
  );

  // ✅ TOGGLES
  const [showSummaryDetail, setShowSummaryDetail] = useState(true); // rata-rata → terimakasih dokter
  const [showHospitalAnalysis, setShowHospitalAnalysis] = useState(true); // analisis RS

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as unknown;
      setVisibility(coerceVisibility(parsed, baseVisibility));
    } catch {
      // ignore
    }
  }, [storageKey, baseVisibility]);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(visibility));
    } catch {
      // ignore
    }
  }, [storageKey, visibility]);

  const setVisibilityKey = useCallback((key: VisibilityKey, next: boolean) => {
    setVisibility((prev) => ({ ...prev, [key]: next }));
  }, []);

  const setAllVisibility = useCallback((next: boolean) => {
    const updated: OperationDashboardVisibility = { ...DEFAULT_VISIBILITY };
    for (const key of VISIBILITY_KEYS) updated[key] = next;
    setVisibility(updated);
  }, []);

  const {
    totalJumlah,
    totalOperasi,
    averageOperasi,
    topHospital,
    dataGrafik,
    kneeCount,
    hipCount,
    dominantCase,
    bipolarCount,
    thrCount,
    tkrCount,
    ukaCount,
    topOperator,
    topOperators,
  } = useMemo(() => {
    if (!Array.isArray(operations))
      return {
        totalJumlah: 0,
        totalOperasi: 0,
        averageOperasi: 0,
        topHospital: { name: "-", value: 0 },
        dataGrafik: [] as { name: string; value: number }[],
        kneeCount: 0,
        hipCount: 0,
        dominantCase: "-",
        bipolarCount: 0,
        thrCount: 0,
        tkrCount: 0,
        ukaCount: 0,
        topOperator: { name: "-", value: 0 },
        topOperators: [] as { name: string; value: number }[],
      };

    const totalJumlah = operations.reduce(
      (sum, op) => sum + Number(op.jumlah),
      0
    );
    const totalOperasi = operations.length;
    const averageOperasi = totalOperasi ? totalJumlah / totalOperasi : 0;

    // Analisis RS berdasarkan JUMLAH OPERASI (bukan biaya)
    const dataByRS = operations.reduce((acc, op) => {
      acc[op.rumahSakit] = (acc[op.rumahSakit] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });

    const dataGrafik = Object.entries(dataByRS)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const topHospital = dataGrafik[0] ?? { name: "-", value: 0 };

    const operatorCounts = operations.reduce((acc, op) => {
      const name = String(op.dokter || "").trim();
      if (!name) return acc;
      acc[name] = (acc[name] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topOperators = Object.entries(operatorCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    const topOperator = topOperators[0] ?? { name: "-", value: 0 };

    let bipolarCount = 0;
    let thrCount = 0;
    let tkrCount = 0;
    let ukaCount = 0;
    let kneeCount = 0;
    let hipCount = 0;

    operations.forEach((op) => {
      const tindakan = String(op.tindakanOperasi || "");
      if (matchCode(tindakan, "bipolar")) bipolarCount += 1;
      if (matchCode(tindakan, "thr")) thrCount += 1;
      if (matchCode(tindakan, "tkr")) tkrCount += 1;
      if (matchCode(tindakan, "uka")) ukaCount += 1;

      const bucket = classifyCase(tindakan);
      if (bucket === "knee") kneeCount += 1;
      if (bucket === "hip") hipCount += 1;
    });

    const dominantCase =
      kneeCount === 0 && hipCount === 0
        ? "-"
        : kneeCount === hipCount
        ? "Knee & Hip"
        : kneeCount > hipCount
        ? "Knee"
        : "Hip";

    return {
      totalJumlah,
      totalOperasi,
      averageOperasi,
      topHospital,
      dataGrafik,
      kneeCount,
      hipCount,
      dominantCase,
      bipolarCount,
      thrCount,
      tkrCount,
      ukaCount,
      topOperator,
      topOperators,
    };
  }, [operations]);

  const COLORS = ["#06b6d4", "#8b5cf6", "#ec4899"];
  const topData = dataGrafik.slice(0, 10).reverse();

  const showAnySummaryCards =
    visibility.cardRataRataAsistensi ||
    visibility.cardTopHospital ||
    visibility.cardTopDoctor;

  const showAnyAnalysisBody =
    visibility.analysisCaseSummary ||
    visibility.analysisCodeCounts ||
    visibility.analysisTopOperators ||
    visibility.analysisChart;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* ✅ KONTROL TAMPILAN */}
      <div className="mb-3 flex items-center justify-end gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="secondary"
              className="border border-white/10 bg-white/10 text-white hover:bg-white/15"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Tampilan
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-72 border border-white/15 bg-slate-950/95 text-white shadow-xl backdrop-blur"
          >
            <DropdownMenuLabel>Ringkasan</DropdownMenuLabel>
            <DropdownMenuCheckboxItem
              checked={visibility.cardTotalAsistensi}
              onCheckedChange={(v) =>
                setVisibilityKey("cardTotalAsistensi", Boolean(v))
              }
            >
              Total Asistensi
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={visibility.cardJumlahTindakan}
              onCheckedChange={(v) =>
                setVisibilityKey("cardJumlahTindakan", Boolean(v))
              }
            >
              Jumlah Tindakan
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={visibility.cardRataRataAsistensi}
              onCheckedChange={(v) =>
                setVisibilityKey("cardRataRataAsistensi", Boolean(v))
              }
            >
              Rata-rata Asistensi
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={visibility.cardTopHospital}
              onCheckedChange={(v) =>
                setVisibilityKey("cardTopHospital", Boolean(v))
              }
            >
              Terimakasih Rumah Sakit
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={visibility.cardTopDoctor}
              onCheckedChange={(v) =>
                setVisibilityKey("cardTopDoctor", Boolean(v))
              }
            >
              Terimakasih dokter
            </DropdownMenuCheckboxItem>

            <DropdownMenuSeparator />
            <DropdownMenuLabel>Analisis</DropdownMenuLabel>
            <DropdownMenuCheckboxItem
              checked={visibility.analysisSection}
              onCheckedChange={(v) =>
                setVisibilityKey("analysisSection", Boolean(v))
              }
            >
              Tampilkan Analisis
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={visibility.analysisCaseSummary}
              onCheckedChange={(v) =>
                setVisibilityKey("analysisCaseSummary", Boolean(v))
              }
            >
              Kasus Dominan / Hip / Knee
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={visibility.analysisCodeCounts}
              onCheckedChange={(v) =>
                setVisibilityKey("analysisCodeCounts", Boolean(v))
              }
            >
              Bipolar / THR / TKR / UKA
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={visibility.analysisTopOperators}
              onCheckedChange={(v) =>
                setVisibilityKey("analysisTopOperators", Boolean(v))
              }
            >
              Top Operator
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={visibility.analysisChart}
              onCheckedChange={(v) =>
                setVisibilityKey("analysisChart", Boolean(v))
              }
            >
              Grafik RS
            </DropdownMenuCheckboxItem>

            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => setAllVisibility(true)}>
              Tampilkan semua
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setAllVisibility(false)}>
              Sembunyikan semua
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setVisibility(baseVisibility)}>
              <RotateCcw className="h-4 w-4" />
              Reset ke default
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          type="button"
          variant="secondary"
          onClick={() => setShowSummaryDetail((v) => !v)}
          className="border border-white/10 bg-white/10 text-white hover:bg-white/15"
        >
          {showSummaryDetail ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
          {showSummaryDetail ? "Hide detail" : "Show detail"}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {visibility.cardTotalAsistensi ? (
          <div className="rounded-3xl border border-white/10 bg-(--dash-surface)] p-5 text-(--dash-ink)] shadow-[0_20px_60px_rgba(2,6,23,0.45)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.4em] text-(--dash-muted)]">
                  Total Asistensi
                </p>
                <p className="mt-2 text-2xl font-semibold tabular-nums">
                  {isLoading ? "…" : formatCurrency(totalJumlah)}
                </p>
                <p className="mt-1 text-[11px] text-(--dash-muted)]">
                  Akumulasi seluruh tindakan.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-emerald-300">
                <Wallet className="h-5 w-5" />
              </div>
            </div>
          </div>
        ) : null}

        {visibility.cardJumlahTindakan ? (
          <div className="rounded-3xl border border-white/10 bg-(--dash-surface)] p-5 text-(--dash-ink)] shadow-[0_20px_60px_rgba(2,6,23,0.45)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.4em] text-(--dash-muted)]">
                  Jumlah Tindakan
                </p>
                <p className="mt-2 text-2xl font-semibold tabular-nums">
                  {isLoading ? "…" : totalOperasi}
                </p>
                <p className="mt-1 text-[11px] text-(--dash-muted)]">
                  Total input operasi.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-cyan-300">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
          </div>
        ) : null}

        {/* ✅ HIDE/SHOW: Rata-rata → Terimakasih dokter */}
        <AnimatePresence initial={false}>
          {showSummaryDetail && showAnySummaryCards ? (
            <>
              {visibility.cardRataRataAsistensi ? (
                <motion.div
                  key="avg"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  transition={{ duration: 0.18 }}
                  className="rounded-3xl border border-white/10 bg-(--dash-surface)] p-5 text-(--dash-ink)] shadow-[0_20px_60px_rgba(2,6,23,0.45)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.4em] text-(--dash-muted)]">
                        Rata-rata Asistensi
                      </p>
                      <p className="mt-2 text-2xl font-semibold tabular-nums">
                        {isLoading
                          ? "…"
                          : formatCurrency(Math.round(averageOperasi))}
                      </p>
                      <p className="mt-1 text-[11px] text-(--dash-muted)]">
                        Dibagi dari total tindakan.
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-violet-300">
                      <Wallet className="h-5 w-5" />
                    </div>
                  </div>
                </motion.div>
              ) : null}

              {visibility.cardTopHospital ? (
                <motion.div
                  key="top-hospital"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  transition={{ duration: 0.18 }}
                  className="rounded-3xl border border-white/10 bg-(--dash-surface)] p-5 text-(--dash-ink)] shadow-[0_20px_60px_rgba(2,6,23,0.45)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.4em] text-(--dash-muted)]">
                        Terimakasih Rumah Sakit
                      </p>
                      <p className="mt-2 truncate text-base font-semibold">
                        {isLoading ? "…" : topHospital.name}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-emerald-300 tabular-nums">
                        {isLoading
                          ? "…"
                          : `${new Intl.NumberFormat("id-ID").format(
                              topHospital.value
                            )} operasi`}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-amber-300">
                      <Building2 className="h-5 w-5" />
                    </div>
                  </div>
                </motion.div>
              ) : null}

              {visibility.cardTopDoctor ? (
                <motion.div
                  key="top-doctor"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  transition={{ duration: 0.18 }}
                  className="rounded-3xl border border-white/10 bg-(--dash-surface)] p-5 text-(--dash-ink)] shadow-[0_20px_60px_rgba(2,6,23,0.45)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-[0.4em] text-(--dash-muted)]">
                        Terimakasih dokter
                      </p>
                      <p className="mt-2 truncate text-base font-semibold">
                        {isLoading ? "…" : topOperator.name}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-emerald-300 tabular-nums">
                        {isLoading
                          ? "…"
                          : `${new Intl.NumberFormat("id-ID").format(
                              topOperator.value
                            )} operasi`}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sky-300">
                      <UserRound className="h-5 w-5" />
                    </div>
                  </div>
                </motion.div>
              ) : null}
            </>
          ) : null}
        </AnimatePresence>
      </div>

      {visibility.analysisSection ? (
        <div className="mt-6 rounded-3xl border border-white/10 bg-(--dash-surface)] p-6 text-(--dash-ink)] shadow-[0_20px_60px_rgba(2,6,23,0.45)]">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.4em] text-(--dash-muted)]">
              Analisis
            </p>
            <h3 className="mt-1 text-lg font-semibold">
              Jumlah Operasi per Rumah Sakit
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm text-(--dash-muted)]">
              Menampilkan 10 rumah sakit dengan jumlah operasi terbanyak.
            </p>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowHospitalAnalysis((v) => !v)}
              className="border border-white/10 bg-white/10 text-white hover:bg-white/15"
            >
              {showHospitalAnalysis ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
              {showHospitalAnalysis ? "Hide" : "Show"}
            </Button>
          </div>
        </div>

        {/* ✅ HIDE/SHOW: Analisis RS */}
        <AnimatePresence initial={false}>
          {showHospitalAnalysis ? (
            <motion.div
              key="analysis-body"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              {showAnyAnalysisBody ? (
                <>
	                  {visibility.analysisCaseSummary ? (
	                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
	                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
	                        <p className="text-[10px] uppercase tracking-[0.3em] text-(--dash-muted)]">
	                          Kasus Dominan
	                        </p>
                        <p className="mt-2 text-lg font-semibold text-amber-300">
                          {isLoading ? "…" : dominantCase}
                        </p>
	                        <p className="mt-1 text-[11px] text-(--dash-muted)]">
	                          Filter: Hip Knee.
	                        </p>
	                      </div>
	                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
	                        <p className="text-[10px] uppercase tracking-[0.3em] text-(--dash-muted)]">
	                          Knee
	                        </p>
                        <p className="mt-2 text-lg font-semibold tabular-nums">
                          {isLoading ? "…" : `${kneeCount} operasi`}
                        </p>
	                      </div>
	                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
	                        <p className="text-[10px] uppercase tracking-[0.3em] text-(--dash-muted)]">
	                          Hip
	                        </p>
                        <p className="mt-2 text-lg font-semibold tabular-nums">
                          {isLoading ? "…" : `${hipCount} operasi`}
                        </p>
                      </div>
                    </div>
                  ) : null}

	                  {visibility.analysisCodeCounts ? (
	                    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
	                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
	                        <p className="text-[10px] uppercase tracking-[0.3em] text-(--dash-muted)]">
	                          Bipolar (Hip)
	                        </p>
                        <p className="mt-2 text-lg font-semibold tabular-nums">
                          {isLoading ? "…" : bipolarCount}
                        </p>
	                      </div>
	                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
	                        <p className="text-[10px] uppercase tracking-[0.3em] text-(--dash-muted)]">
	                          THR (Hip)
	                        </p>
                        <p className="mt-2 text-lg font-semibold tabular-nums">
                          {isLoading ? "…" : thrCount}
                        </p>
	                      </div>
	                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
	                        <p className="text-[10px] uppercase tracking-[0.3em] text-(--dash-muted)]">
	                          TKR (Knee)
	                        </p>
                        <p className="mt-2 text-lg font-semibold tabular-nums">
                          {isLoading ? "…" : tkrCount}
                        </p>
	                      </div>
	                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
	                        <p className="text-[10px] uppercase tracking-[0.3em] text-(--dash-muted)]">
	                          UKA (Knee)
	                        </p>
                        <p className="mt-2 text-lg font-semibold tabular-nums">
                          {isLoading ? "…" : ukaCount}
                        </p>
                      </div>
                    </div>
                  ) : null}

	                  {visibility.analysisTopOperators && topOperators.length ? (
	                    <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
	                      <p className="text-[10px] uppercase tracking-[0.3em] text-(--dash-muted)]">
	                        Top Operator
	                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {topOperators.map((op) => (
	                          <span
	                            key={op.name}
	                            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold text-(--dash-ink)]"
	                          >
	                            <UserRound className="h-3.5 w-3.5 text-(--dash-muted)]" />
	                            <span className="max-w-[200px] truncate">
	                              {op.name}
	                            </span>
	                            <span className="text-(--dash-muted)] tabular-nums">
	                              {op.value}
	                            </span>
	                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {visibility.analysisChart ? (
                    <div className="mt-4 h-[360px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={topData}
                          layout="vertical"
                          margin={{ top: 8, right: 16, bottom: 8, left: 16 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke={
                              isDark
                                ? "rgba(148,163,184,0.18)"
                                : "rgba(51,65,85,0.12)"
                            }
                            horizontal={false}
                          />
                          <XAxis
                            type="number"
                            tick={{
                              fill: isDark ? "#cbd5e1" : "#334155",
                              fontSize: 12,
                            }}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) =>
                              new Intl.NumberFormat("id-ID").format(
                                Number(value)
                              )
                            }
                          />
                          <YAxis
                            type="category"
                            dataKey="name"
                            width={160}
                            tick={{
                              fill: isDark ? "#cbd5e1" : "#334155",
                              fontSize: 12,
                            }}
                            tickLine={false}
                            axisLine={false}
                          />
                          <Tooltip
                            cursor={{ fill: "rgba(148,163,184,0.12)" }}
                            content={<BarTooltip />}
                          />
                          <Bar dataKey="value" radius={[8, 8, 8, 8]}>
                            {topData.map((_, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={COLORS[index % COLORS.length]}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : null}
                </>
              ) : (
                <p className="mt-4 text-sm text-(--dash-muted)]">
                  Semua bagian analisis sedang disembunyikan lewat menu Tampilan.
                </p>
              )}
            </motion.div>
          ) : null}
        </AnimatePresence>
        </div>
      ) : null}
    </motion.div>
  );
}
