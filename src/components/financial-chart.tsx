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

/* ================= TYPES ================= */

export interface Transaction {
  tanggal: string;
  jenisBiaya: string;
  jumlah: number;
}

interface TrendItem {
  day: string;
  value: number;
}

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
          className={`p-3 rounded-lg shadow-lg ${
            isDark ? "bg-gray-800 text-white" : "bg-white text-black"
          }`}
        >
          <p className="font-semibold">Tanggal: {item?.day}</p>
          <p className="text-cyan-400 font-bold">
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
      className="p-8 rounded-xl h-[635px] border-1 border-slate-700 bg-card shadow-2xl space-y-6"
    >
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-cyan-400 flex items-center gap-2">
          <Brain /> Financial Graph
        </h2>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <TrendingUp size={18} />
          Analisis Tren Pengeluaran
        </div>
      </div>

      {/* KPI PANEL */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-muted p-4 rounded-lg">
          <p className="text-xs text-muted-foreground">Total Bulan Ini</p>
          <h3 className="text-lg font-bold">
            Rp {new Intl.NumberFormat("id-ID").format(totalExpense)}
          </h3>
        </div>

        <div className="bg-muted p-4 rounded-lg">
          <p className="text-xs text-muted-foreground">Hari Tertinggi</p>
          <h3 className="text-lg font-bold text-rose-500">
            Tanggal {highestPoint.day}
          </h3>
        </div>

        <div className="bg-muted p-4 rounded-lg">
          <p className="text-xs text-muted-foreground">Pengeluaran Maks</p>
          <h3 className="text-lg font-bold text-emerald-400">
            Rp {new Intl.NumberFormat("id-ID").format(highestPoint.value)}
          </h3>
        </div>
      </div>

      {/* MAIN GRAPH */}
      <div className="h-[380px]">
        <ResponsiveContainer>
          <LineChart data={dailyTrend}>
            <defs>
              <linearGradient id="colorTitan" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#4444" />
            <XAxis dataKey="day" tick={{ fill: isDark ? "#ccc" : "#333" }} />
            <YAxis tick={{ fill: isDark ? "#ccc" : "#333" }} />
            <Tooltip content={<CustomTooltip />} />

            <Area
              type="monotone"
              dataKey="value"
              stroke="#22d3ee"
              fillOpacity={1}
              fill="url(#colorTitan)"
            />

            <Line
              type="monotone"
              dataKey="value"
              stroke="#22d3ee"
              strokeWidth={3}
              dot={{
                r: 5,
                fill: "#22d3ee",
                stroke: "#0f172a",
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
