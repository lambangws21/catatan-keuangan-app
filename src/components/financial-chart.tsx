"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useTheme } from "next-themes";

// ========================
// TYPES
// ========================
interface Transaction {
  tanggal: string;
  jenisBiaya: string;
  jumlah: number;
}

interface Saldo {
  jumlah: number;
}

interface CustomTooltipPayload {
  name: string;
  value: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: CustomTooltipPayload[];
}

// ========================
// COMPONENT
// ========================
export default function FinancialChart({
  transactions,
}: {
  transactions: Transaction[];
  saldoData?: Saldo[]; // optional agar tidak error unused
}) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // =============================
  // TRANSFORM DATA
  // =============================
  const expenseByCategory = useMemo(() => {
    const map = new Map<string, number>();
    transactions.forEach((t) => {
      map.set(t.jenisBiaya, (map.get(t.jenisBiaya) || 0) + t.jumlah);
    });
    return Array.from(map, ([name, value]) => ({ name, value }));
  }, [transactions]);

  const dailyTrend = useMemo(() => {
    const map = new Map<string, number>();
    transactions.forEach((t) => {
      const d = new Date(t.tanggal).getDate();
      map.set(String(d), (map.get(String(d)) || 0) + t.jumlah);
    });
    return Array.from(map, ([day, value]) => ({ day, value }));
  }, [transactions]);

  const COLORS = [
    "#06b6d4",
    "#8b5cf6",
    "#ec4899",
    "#f59e0b",
    "#10b981",
    "#3b82f6",
  ];

  const tooltipBg = isDark
    ? "bg-gray-800 text-white"
    : "bg-white text-black";

  // =============================
  // CUSTOM TOOLTIP FIXED
  // =============================
  const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
    if (active && payload && payload.length > 0) {
      const item = payload[0];
      return (
        <div className={`p-2 rounded-md shadow-md ${tooltipBg}`}>
          <p className="font-semibold">{item.name}</p>
          <p className="opacity-80">
            Rp {new Intl.NumberFormat("id-ID").format(item.value)}
          </p>
        </div>
      );
    }
    return null;
  };

  // =============================
  // RENDER
  // =============================
  return (
    <motion.div
      className="p-6 rounded-xl shadow-lg border border-border bg-card"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <h3 className="text-xl font-semibold mb-4 text-cyan-400">
        Grafik Keuangan
      </h3>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="w-fit mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="expense">Pengeluaran</TabsTrigger>
          <TabsTrigger value="trend">Trend Harian</TabsTrigger>
        </TabsList>

        {/* ==================== OVERVIEW ==================== */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* PIE */}
            <div className="h-[260px]">
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={expenseByCategory}
                    dataKey="value"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={{ fill: isDark ? "#fff" : "#fff" }}
                  >
                    {expenseByCategory.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* BAR */}
            <div className="h-[260px]">
              <ResponsiveContainer>
                <BarChart data={expenseByCategory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#5554" />
                  <XAxis
                    dataKey="name"
                    stroke={isDark ? "#ccc" : "#444"}
                  />
                  <YAxis stroke={isDark ? "#ccc" : "#444"} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value">
                    {expenseByCategory.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </TabsContent>

        {/* ==================== EXPENSE ==================== */}
        <TabsContent value="expense">
          <div className="h-[300px]">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={expenseByCategory}
                  dataKey="value"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={2}
                >
                  {expenseByCategory.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </TabsContent>

        {/* ==================== TREND ==================== */}
        <TabsContent value="trend">
          <div className="h-[300px]">
            <ResponsiveContainer>
              <LineChart data={dailyTrend}>
                <XAxis
                  dataKey="day"
                  stroke={isDark ? "#ccc" : "#444"}
                />
                <YAxis stroke={isDark ? "#ccc" : "#444"} />
                <CartesianGrid strokeDasharray="3 3" stroke="#4444" />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#06b6d4"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
