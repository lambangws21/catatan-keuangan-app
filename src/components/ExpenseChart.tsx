import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Pause, Play, Zap } from "lucide-react";

interface ChartData {
  name: string;
  value: number;
  [key: string]: string | number;
}

interface ChartProps {
  data: ChartData[];
}

const COLORS = ["#14b8a6", "#f59e0b", "#38bdf8", "#22c55e", "#fb7185"];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
  }).format(value);

export default function ExpenseChartPro({ data }: ChartProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [intervalSpeed, setIntervalSpeed] = useState(7000);

  useEffect(() => {
    if (!isPlaying || !data.length) return;
    const loop = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % data.length);
    }, intervalSpeed);

    return () => clearInterval(loop);
  }, [isPlaying, intervalSpeed, data]);

  const totalValue = data.reduce((a, b) => a + b.value, 0);
  const activeItem = data[activeIndex];

  return (
    <div className="rounded-3xl border border-white/10 bg-[var(--dash-surface)] p-5 sm:p-6 shadow-[0_20px_40px_rgba(2,6,23,0.45)] backdrop-blur space-y-6">

      {/* HEADER */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-xl sm:text-2xl font-semibold font-[var(--font-display)] text-[color:var(--dash-ink)] flex items-center gap-2">
          <Zap className="w-5 h-5" />
          Distribusi Pengeluaran
        </h3>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="inline-flex items-center justify-center rounded-full bg-[var(--dash-accent)] p-2 text-slate-950 transition hover:scale-105"
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          </button>

          <input
            type="range"
            min="1000"
            max="10000"
            step="500"
            value={intervalSpeed}
            onChange={(e) => setIntervalSpeed(Number(e.target.value))}
            className="w-full sm:w-36 accent-[color:var(--dash-accent)]"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* PIE */}
        <div className="min-h-[280px] sm:min-h-[320px]" style={{ width: "100%", height: 320 }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                outerRadius={100}
                innerRadius={60}
                paddingAngle={3}
                dataKey="value"
                onMouseEnter={(_, index) => setActiveIndex(index)}
              >
                {data.map((_, index) => (
                  <Cell
                    key={index}
                    fill={COLORS[index % COLORS.length]}
                    stroke={index === activeIndex ? "#fff" : "none"}
                    strokeWidth={index === activeIndex ? 2 : 0}
                  />
                ))}
              </Pie>
              <Tooltip formatter={(val: number) => formatCurrency(val)} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* DETAIL PANEL */}
        <div className="flex flex-col justify-center gap-4">
          <motion.div
            key={activeItem?.name}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-white/10 bg-white/5 p-5"
          >
            <h4 className="text-lg font-semibold text-[color:var(--dash-ink)]">
              {activeItem?.name}
            </h4>

            <p className="text-2xl font-semibold text-[color:var(--dash-ink)]">
              {formatCurrency(activeItem?.value || 0)}
            </p>

            <p className="text-sm text-[color:var(--dash-muted)]">
              {((activeItem?.value / totalValue) * 100).toFixed(2)}%
              dari total
            </p>

            <div className="mt-3 w-full rounded-full bg-white/10 h-2 overflow-hidden">
              <div
                className="h-full bg-[var(--dash-accent)] transition-all"
                style={{
                  width: `${(activeItem?.value / totalValue) * 100}%`,
                }}
              />
            </div>
          </motion.div>

          {/* LEGEND */}
          <div className="grid grid-cols-2 gap-2">
            {data.map((item, i) => (
              <button
                key={i}
                onClick={() => setActiveIndex(i)}
                className={`flex items-center gap-2 text-xs sm:text-sm p-2 rounded-full border border-white/10 transition ${
                  activeIndex === i
                    ? "bg-white/20 text-[color:var(--dash-ink)]"
                    : "bg-white/5 text-[color:var(--dash-muted)] hover:bg-white/10"
                }`}
              >
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ background: COLORS[i % COLORS.length] }}
                />
                {item.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
