"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  Area,
} from "recharts";
import { Brain, TrendingUp } from "lucide-react";
import { useTheme } from "next-themes";
import { isCountedAsExpense } from "@/lib/transactions";

/* ================= TYPES ================= */

export interface Transaction {
  tanggal: string;
  jenisBiaya: string;
  jumlah: number;
  sumberBiaya?: string | null;
}

interface TrendItem {
  day: string;
  value: number;
}

const formatCompactId = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);

/* ================= COMPONENT ================= */

export default function FinancialChartTitan({
  transactions,
}: {
  transactions: Transaction[];
}) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  /* ===== DATA TRANSFORM ===== */

  const dailyTrend = useMemo<TrendItem[]>(() => {
    const map = new Map<string, number>();

    transactions.forEach((t) => {
      if (!isCountedAsExpense(t)) return;
      const day = new Date(t.tanggal).getDate().toString().padStart(2, "0");
      map.set(day, (map.get(day) ?? 0) + t.jumlah);
    });

    return Array.from(map, ([day, value]) => ({ day, value })).sort(
      (a, b) => Number(a.day) - Number(b.day)
    );
  }, [transactions]);

  const highestPoint = useMemo(() => {
    return dailyTrend.reduce(
      (max, item) => (item.value > max.value ? item : max),
      { day: "0", value: 0 }
    );
  }, [dailyTrend]);

  const totalExpense = useMemo(
    () => dailyTrend.reduce((a, b) => a + b.value, 0),
    [dailyTrend]
  );

  /* ===== TOOLTIP ===== */

  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: { value?: number; payload?: TrendItem }[];
  }) => {
    if (active && payload?.length) {
      const item = payload[0].payload;
      return (
        <div
          className={`p-3 rounded-lg border shadow-lg ${
            isDark
              ? "bg-slate-900 text-slate-100 border-white/10"
              : "bg-white text-slate-900 border-slate-200"
          }`}
        >
          <p className="font-semibold">Tanggal: {item?.day}</p>
          <p className="text-emerald-300 font-semibold">
            Rp {new Intl.NumberFormat("id-ID").format(item?.value || 0)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl border border-white/10 bg-(--dash-surface)] p-5 sm:p-7 shadow-[0_20px_40px_rgba(2,6,23,0.45)] backdrop-blur space-y-6 min-h-[520px] sm:min-h-[620px]"
    >
      {/* HEADER */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-semibold font-(--font-display)] text-(--dash-ink)] flex items-center gap-2">
          <Brain /> Financial Graph
        </h2>

        <div className="flex items-center gap-2 text-sm text-(--dash-muted)]">
          <TrendingUp size={18} />
          Analisis Tren Pengeluaran
        </div>
      </div>

      {/* KPI PANEL */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs text-(--dash-muted)]">Total Bulan Ini</p>
          <h3 className="text-lg font-semibold text-(--dash-ink)]">
            Rp {new Intl.NumberFormat("id-ID").format(totalExpense)}
          </h3>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs text-(--dash-muted)]">Hari Tertinggi</p>
          <h3 className="text-lg font-semibold text-amber-300">
            Tanggal {highestPoint.day}
          </h3>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs text-(--dash-muted)]">Pengeluaran Maks</p>
          <h3 className="text-lg font-semibold text-emerald-300">
            Rp {new Intl.NumberFormat("id-ID").format(highestPoint.value)}
          </h3>
        </div>
      </div>

      {/* MAIN GRAPH */}
      <div className="h-[300px] sm:h-[380px]">
        <ResponsiveContainer>
          <LineChart
            data={dailyTrend}
            margin={{ top: 12, right: 16, bottom: 4, left: 20 }}
          >
            <defs>
              <linearGradient id="colorTitan" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#4444" />
            <XAxis dataKey="day" tick={{ fill: isDark ? "#ccc" : "#333" }} />
            <YAxis
              width={84}
              tickMargin={10}
              tick={{ fill: isDark ? "#ccc" : "#333" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `Rp ${formatCompactId(Number(v))}`}
            />
            <Tooltip content={<CustomTooltip />} />

            <Area
              type="monotone"
              dataKey="value"
              stroke="#14b8a6"
              fillOpacity={1}
              fill="url(#colorTitan)"
            />

            <Line
              type="monotone"
              dataKey="value"
              stroke="#14b8a6"
              strokeWidth={3}
              dot={{
                r: 5,
                fill: "#14b8a6",
                stroke: "#0f172a",
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
