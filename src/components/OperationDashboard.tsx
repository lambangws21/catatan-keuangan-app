"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
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
import { Building2, TrendingUp, UserRound, Wallet } from "lucide-react";

// Asumsikan tipe Operation diimpor dari halaman utamanya atau didefinisikan di sini
interface Operation {
  id: string;
  jumlah: number;
  rumahSakit: string;
  dokter?: string;
  date?: string;
  tindakanOperasi?: string;
}
interface DashboardProps {
  operations: Operation[];
  isLoading: boolean;
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

export default function OperationDashboard({ operations, isLoading }: DashboardProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

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

    const totalJumlah = operations.reduce((sum, op) => sum + Number(op.jumlah), 0);
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

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-3xl border border-white/10 bg-(--dash-surface)] p-5 text-(--dash-ink)] shadow-[0_20px_60px_rgba(2,6,23,0.45)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.4em] text-(--dash-muted)]">
                Total Biaya
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

        <div className="rounded-3xl border border-white/10 bg-(--dash-surface)] p-5 text-(--dash-ink)] shadow-[0_20px_60px_rgba(2,6,23,0.45)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.4em] text-(--dash-muted)]">
                Rata-rata / Operasi
              </p>
              <p className="mt-2 text-2xl font-semibold tabular-nums">
                {isLoading ? "…" : formatCurrency(Math.round(averageOperasi))}
              </p>
              <p className="mt-1 text-[11px] text-(--dash-muted)]">
                Dibagi dari total tindakan.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-violet-300">
              <Wallet className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-(--dash-surface)] p-5 text-(--dash-ink)] shadow-[0_20px_60px_rgba(2,6,23,0.45)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.4em] text-(--dash-muted)]">
                RS Paling Sering
              </p>
              <p className="mt-2 truncate text-base font-semibold">
                {isLoading ? "…" : topHospital.name}
              </p>
              <p className="mt-1 text-sm font-semibold text-emerald-300 tabular-nums">
                {isLoading
                  ? "…"
                  : `${new Intl.NumberFormat("id-ID").format(topHospital.value)} operasi`}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-amber-300">
              <Building2 className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-(--dash-surface)] p-5 text-(--dash-ink)] shadow-[0_20px_60px_rgba(2,6,23,0.45)]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.4em] text-(--dash-muted)]">
                Operator Paling Sering
              </p>
              <p className="mt-2 truncate text-base font-semibold">
                {isLoading ? "…" : topOperator.name}
              </p>
              <p className="mt-1 text-sm font-semibold text-emerald-300 tabular-nums">
                {isLoading
                  ? "…"
                  : `${new Intl.NumberFormat("id-ID").format(topOperator.value)} operasi`}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sky-300">
              <UserRound className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-3xl border border-white/10 bg-(--dash-surface)] p-6 text-(--dash-ink)] shadow-[0_20px_60px_rgba(2,6,23,0.45)]">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.4em] text-(--dash-muted)]">
              Analisis
            </p>
            <h3 className="mt-1 text-lg font-semibold">Jumlah Operasi per Rumah Sakit</h3>
          </div>
          <p className="text-sm text-(--dash-muted)]">
            Menampilkan 10 rumah sakit dengan jumlah operasi terbanyak.
          </p>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-[10px] uppercase tracking-[0.3em] text-(--dash-muted)]">
              Kasus Dominan
            </p>
            <p className="mt-2 text-lg font-semibold text-amber-300">
              {isLoading ? "…" : dominantCase}
            </p>
            <p className="mt-1 text-[11px] text-(--dash-muted)]">
              Filter: Bipolar/THR = Hip, TKR/UKA = Knee.
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

        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
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

        {topOperators.length ? (
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
                  <span className="max-w-[200px] truncate">{op.name}</span>
                  <span className="text-(--dash-muted)] tabular-nums">
                    {op.value}
                  </span>
                </span>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-4 h-[360px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={topData}
              layout="vertical"
              margin={{ top: 8, right: 16, bottom: 8, left: 16 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={isDark ? "rgba(148,163,184,0.18)" : "rgba(51,65,85,0.12)"}
                horizontal={false}
              />
              <XAxis
                type="number"
                tick={{ fill: isDark ? "#cbd5e1" : "#334155", fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => new Intl.NumberFormat("id-ID").format(Number(value))}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={160}
                tick={{ fill: isDark ? "#cbd5e1" : "#334155", fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip cursor={{ fill: "rgba(148,163,184,0.12)" }} content={<BarTooltip />} />
              <Bar dataKey="value" radius={[8, 8, 8, 8]}>
                {topData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </motion.div>
  );
}
