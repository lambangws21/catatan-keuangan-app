"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import { Boxes, TrendingUp, TrendingDown, Layers } from "lucide-react";
import { ImplantStockItem } from "@/types/implant-stock";
import { ResponsiveContainer, LineChart, Line } from "recharts";

/* ======================================================
   🎨 COLOR MAP — Premium Aura
====================================================== */
const colorMap = {
  blue: {
    bg: "bg-blue-100/60 dark:bg-blue-900/30",
    text: "text-blue-600 dark:text-blue-300",
    glow: "shadow-[0_0_20px_rgba(37,99,235,0.25)]",
  },
  red: {
    bg: "bg-red-100/60 dark:bg-red-900/30",
    text: "text-red-600 dark:text-red-300",
    glow: "shadow-[0_0_20px_rgba(220,38,38,0.25)]",
  },
  green: {
    bg: "bg-green-100/60 dark:bg-green-900/30",
    text: "text-green-600 dark:text-green-300",
    glow: "shadow-[0_0_20px_rgba(16,185,129,0.25)]",
  },
  purple: {
    bg: "bg-purple-100/60 dark:bg-purple-900/30",
    text: "text-purple-600 dark:text-purple-300",
    glow: "shadow-[0_0_20px_rgba(147,51,234,0.25)]",
  },
};

/* ======================================================
   📌 TIPE DATA CARD — No ANY Allowed
====================================================== */
interface StatCardData {
  title: string;
  value: number;
  icon: React.ComponentType<{ size?: number }>;
  color: keyof typeof colorMap;
}

/* ======================================================
   📌 MAIN COMPONENT — STOCK SUMMARY
====================================================== */
export default function StockStatsPremium() {
  const [data, setData] = useState<ImplantStockItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/get-implant-stock");
        const json = await res.json();
        setData(Array.isArray(json?.data) ? json.data : []);
      } catch (e) {
        console.error("Gagal load stats:", e);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  /* ======================================================
     📌 HITUNG TOTAL
  ====================================================== */
  const stats = useMemo(() => {
    let totalQty = 0;
    let totalUsed = 0;
    let totalRefill = 0;

    data.forEach((item) => {
      totalQty += Number(item.qty || 0);
      totalUsed += Number(item.used || 0);
      totalRefill += Number(item.refill || 0);
    });

    return {
      totalQty,
      totalUsed,
      totalRefill,
      totalItems: data.length,
    };
  }, [data]);

  /* ======================================================
     📌 ARRAY CARD (Typed)
  ====================================================== */
  const cards: StatCardData[] = [
    { title: "Total Stok", value: stats.totalQty, icon: Boxes, color: "blue" },
    { title: "Total Terpakai", value: stats.totalUsed, icon: TrendingDown, color: "red" },
    { title: "Total Refill", value: stats.totalRefill, icon: TrendingUp, color: "green" },
    { title: "Jumlah Item", value: stats.totalItems, icon: Layers, color: "purple" },
  ];

  /* ======================================================
     📌 GRID UI
  ====================================================== */
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
      {cards.map((card, i) => (
        <StatCard key={card.title} card={card} index={i} loading={loading} />
      ))}
    </div>
  );
}

/* ======================================================
   📌 CARD COMPONENT — NO ANY + FIX RESPONSIVE CHART
====================================================== */
function StatCard({
  card,
  index,
  loading,
}: {
  card: StatCardData;
  index: number;
  loading: boolean;
}) {
  const c = colorMap[card.color];

  /* 🔧 FIX Recharts width(-1) BUG */
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      const rect = entries[0].contentRect;
      if (rect.width > 0 && rect.height > 0) setReady(true);
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.4 }}
      className={`
        group relative p-4 md:p-5 rounded-2xl border min-w-0
        bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl
        border-zinc-200 dark:border-zinc-800
        shadow-sm hover:shadow-xl transition-all duration-300
        flex flex-col justify-between
        ${c.glow}
      `}
    >
      {/* Background Icon Glow */}
      <div className="absolute right-3 top-3 opacity-10 pointer-events-none">
        <card.icon size={45}  />
      </div>

      {/* HEADER */}
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${c.bg} ${c.text}`}>
          <card.icon size={22} />
        </div>
        <span className="text-xs uppercase font-medium text-zinc-500 dark:text-zinc-400 truncate">
          {card.title}
        </span>
      </div>

      {/* VALUE */}
      {loading ? (
        <div className="h-7 w-20 rounded bg-zinc-300 dark:bg-zinc-700 animate-pulse" />
      ) : (
        <p className="text-3xl font-bold tracking-tight">{card.value}</p>
      )}

      {/* MINI CHART */}
      <div ref={containerRef} className="h-10 md:h-12 mt-3 min-h-[60px]">
        {ready && !loading && (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={[{ v: 0 }, { v: card.value }]}>
              <Line
                type="monotone"
                dataKey="v"
                stroke="currentColor"
                strokeWidth={2}
                dot={false}
                className={c.text}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </motion.div>
  );
}
