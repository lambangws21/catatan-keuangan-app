import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  PieChart,
  Pie,
  Cell,
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
  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const [chartSize, setChartSize] = useState({ width: 0, height: 0 });
  const [isChartReady, setIsChartReady] = useState(false);

  useEffect(() => {
    if (!isPlaying || !data.length) return;
    const loop = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % data.length);
    }, intervalSpeed);

    return () => clearInterval(loop);
  }, [isPlaying, intervalSpeed, data]);

  useEffect(() => {
    const element = chartContainerRef.current;
    if (!element) return;

    const updateReady = () => {
      const rect = element.getBoundingClientRect();
      const width = Math.max(0, Math.floor(rect.width));
      const height = Math.max(0, Math.floor(rect.height));
      setChartSize({ width, height });
      setIsChartReady(width > 0 && height > 0);
    };

    const frameId = window.requestAnimationFrame(updateReady);
    const observer = new ResizeObserver(() => updateReady());
    observer.observe(element);

    return () => {
      window.cancelAnimationFrame(frameId);
      observer.disconnect();
    };
  }, [data.length]);

  const totalValue = data.reduce((a, b) => a + b.value, 0);
  const activeItem = data[activeIndex];

  return (
    <div className="dash-panel space-y-4 rounded-2xl p-4 backdrop-blur sm:p-5">

      {/* HEADER */}
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="dash-kicker">Kategori</p>
          <h3 className="mt-1 flex min-w-0 items-center gap-2 text-lg font-semibold font-(--font-display) text-white sm:text-xl">
            <Zap className="h-5 w-5 text-amber-300" />
            Distribusi Pengeluaran
          </h3>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="inline-flex items-center justify-center rounded-xl bg-(--dash-accent) p-2 text-slate-950 transition hover:scale-105"
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
            className="w-full sm:w-36 accent-(--dash-accent)"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[0.9fr_1.1fr]">

        {/* PIE */}
        <div ref={chartContainerRef} className="h-[220px] w-full min-w-0 sm:h-[260px]">
          {isChartReady ? (
            <PieChart width={chartSize.width} height={chartSize.height}>
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
          ) : (
            <div className="h-full w-full rounded-2xl border border-white/10 bg-white/5" />
          )}
        </div>

        {/* DETAIL PANEL */}
        <div className="flex flex-col justify-center gap-4">
          <motion.div
            key={activeItem?.name}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="dash-panel-soft rounded-2xl p-5"
          >
            <h4 className="break-words text-base font-semibold text-(--dash-ink)">
              {activeItem?.name}
            </h4>

            <p className="dash-value truncate text-xl font-semibold text-white">
              {formatCurrency(activeItem?.value || 0)}
            </p>

            <p className="text-sm text-(--dash-muted)">
              {((activeItem?.value / totalValue) * 100).toFixed(2)}%
              dari total
            </p>

            <div className="mt-3 w-full rounded-full bg-white/10 h-2 overflow-hidden">
              <div
                className="h-full bg-(--dash-accent) transition-all"
                style={{
                  width: `${(activeItem?.value / totalValue) * 100}%`,
                }}
              />
            </div>
          </motion.div>

          {/* LEGEND */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {data.map((item, i) => (
              <button
                key={i}
                onClick={() => setActiveIndex(i)}
              className={`flex min-w-0 items-center gap-2 rounded-xl border border-white/10 p-2 text-left text-xs transition sm:text-sm ${
                  activeIndex === i
                    ? "bg-white/20 text-(--dash-ink)"
                    : "bg-white/5 text-(--dash-muted) hover:bg-white/10"
                }`}
              >
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ background: COLORS[i % COLORS.length] }}
                />
                <span className="min-w-0 truncate">{item.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
