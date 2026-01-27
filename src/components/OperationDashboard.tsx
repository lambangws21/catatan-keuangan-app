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
import { Building2, TrendingUp, Wallet } from "lucide-react";

// Asumsikan tipe Operation diimpor dari halaman utamanya atau didefinisikan di sini
interface Operation {
  id: string;
  jumlah: number;
  rumahSakit: string;
  dokter?: string;
  date?: string;
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

const formatCompactId = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);

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
    <div className="rounded-2xl border border-white/10 bg-[var(--dash-surface-strong)] px-4 py-3 text-sm text-[color:var(--dash-ink)] shadow-[0_20px_50px_rgba(2,6,23,0.55)]">
      <p className="text-[11px] uppercase tracking-[0.3em] text-[color:var(--dash-muted)]">
        Rumah Sakit
      </p>
      <p className="mt-1 font-semibold">{item?.name ?? "-"}</p>
      <p className="mt-1 font-semibold text-emerald-300">
        {formatCurrency(Number(item?.value ?? 0))}
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
  } = useMemo(() => {
    if (!Array.isArray(operations))
      return {
        totalJumlah: 0,
        totalOperasi: 0,
        averageOperasi: 0,
        topHospital: { name: "-", value: 0 },
        dataGrafik: [] as { name: string; value: number }[],
      };

    const totalJumlah = operations.reduce((sum, op) => sum + Number(op.jumlah), 0);
    const totalOperasi = operations.length;
    const averageOperasi = totalOperasi ? totalJumlah / totalOperasi : 0;
    
    const dataByRS = operations.reduce((acc, op) => {
        acc[op.rumahSakit] = (acc[op.rumahSakit] || 0) + Number(op.jumlah);
        return acc;
    }, {} as { [key: string]: number });

    const dataGrafik = Object.entries(dataByRS)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

    const topHospital = dataGrafik[0] ?? { name: "-", value: 0 };

    return { totalJumlah, totalOperasi, averageOperasi, topHospital, dataGrafik };
  }, [operations]);

  const COLORS = ["#06b6d4", "#8b5cf6", "#ec4899"];

  const topData = dataGrafik.slice(0, 10).reverse();

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-white/10 bg-[var(--dash-surface)] p-5 text-[color:var(--dash-ink)] shadow-[0_20px_60px_rgba(2,6,23,0.45)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.4em] text-[color:var(--dash-muted)]">
                Total Biaya
              </p>
              <p className="mt-2 text-2xl font-semibold tabular-nums">
                {isLoading ? "…" : formatCurrency(totalJumlah)}
              </p>
              <p className="mt-1 text-[11px] text-[color:var(--dash-muted)]">
                Akumulasi seluruh tindakan.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-emerald-300">
              <Wallet className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-[var(--dash-surface)] p-5 text-[color:var(--dash-ink)] shadow-[0_20px_60px_rgba(2,6,23,0.45)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.4em] text-[color:var(--dash-muted)]">
                Jumlah Tindakan
              </p>
              <p className="mt-2 text-2xl font-semibold tabular-nums">
                {isLoading ? "…" : totalOperasi}
              </p>
              <p className="mt-1 text-[11px] text-[color:var(--dash-muted)]">
                Total input operasi.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-cyan-300">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-[var(--dash-surface)] p-5 text-[color:var(--dash-ink)] shadow-[0_20px_60px_rgba(2,6,23,0.45)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.4em] text-[color:var(--dash-muted)]">
                Rata-rata / Operasi
              </p>
              <p className="mt-2 text-2xl font-semibold tabular-nums">
                {isLoading ? "…" : formatCurrency(Math.round(averageOperasi))}
              </p>
              <p className="mt-1 text-[11px] text-[color:var(--dash-muted)]">
                Dibagi dari total tindakan.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-violet-300">
              <Wallet className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-[var(--dash-surface)] p-5 text-[color:var(--dash-ink)] shadow-[0_20px_60px_rgba(2,6,23,0.45)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.4em] text-[color:var(--dash-muted)]">
                Rumah Sakit Teratas
              </p>
              <p className="mt-2 truncate text-base font-semibold">
                {isLoading ? "…" : topHospital.name}
              </p>
              <p className="mt-1 text-sm font-semibold text-emerald-300 tabular-nums">
                {isLoading ? "…" : formatCurrency(topHospital.value)}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-amber-300">
              <Building2 className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-3xl border border-white/10 bg-[var(--dash-surface)] p-6 text-[color:var(--dash-ink)] shadow-[0_20px_60px_rgba(2,6,23,0.45)]">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.4em] text-[color:var(--dash-muted)]">
              Analisis
            </p>
            <h3 className="mt-1 text-lg font-semibold">Biaya per Rumah Sakit</h3>
          </div>
          <p className="text-sm text-[color:var(--dash-muted)]">
            Menampilkan 10 rumah sakit dengan biaya terbesar.
          </p>
        </div>

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
                tickFormatter={(value) => `Rp ${formatCompactId(Number(value))}`}
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
