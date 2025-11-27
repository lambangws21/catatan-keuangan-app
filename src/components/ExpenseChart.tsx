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

const COLORS = ["#06b6d4", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981"];

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
    <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl space-y-4">

      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-cyan-500 flex items-center gap-2">
          <Zap className="w-5 h-5" />
          Distribusi Pengeluaran
        </h3>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-2 rounded-full bg-cyan-600 text-white hover:scale-110 transition"
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
            className="accent-cyan-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* PIE */}
        <div style={{ width: "100%", height: 300 }}>
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
            className="bg-gray-100 dark:bg-gray-800 p-5 rounded-lg"
          >
            <h4 className="text-lg font-semibold text-cyan-400">
              {activeItem?.name}
            </h4>

            <p className="text-2xl font-bold dark:text-white text-slate-900">
              {formatCurrency(activeItem?.value || 0)}
            </p>

            <p className="text-sm text-gray-400">
              {((activeItem?.value / totalValue) * 100).toFixed(2)}%
              dari total
            </p>

            <div className="mt-3 w-full bg-gray-700 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-cyan-500 transition-all"
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
                className={`flex items-center gap-2 text-sm p-2 rounded-md transition ${
                  activeIndex === i
                    ? "bg-cyan-600 text-white"
                    : "bg-muted hover:bg-muted/80"
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
