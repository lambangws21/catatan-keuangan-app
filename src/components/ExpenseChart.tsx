"use client";

import { useState } from "react";
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
  Sector, // Diperlukan untuk bentuk aktif
} from "recharts";
import type { TooltipProps } from "recharts";

interface ChartData {
  name: string;
  value: number;
}

interface ChartProps {
  data: ChartData[];
}

// Tipe data yang akurat untuk props yang diterima oleh active shape
interface ActiveShapeProps {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  startAngle: number;
  endAngle: number;
  fill: string;
  payload: { name: string };
  percent: number;
  value: number;
}

// Tipe data yang akurat untuk props yang diterima oleh tooltip kustom
interface CustomTooltipProps extends TooltipProps<number, string> {
    payload?: {
        name: string;
        value: number;
        payload: ChartData; // Objek data asli
    }[];
}

const COLORS = [
  "#06b6d4", // cyan
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#f59e0b", // amber
  "#10b981", // emerald
  "#3b82f6", // blue
];

const formatCurrency = (value: number) => 
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(value);

// Komponen Bentuk Aktif (Active Shape) untuk Pie Chart saat di-hover
const renderActiveShape = (props: unknown) => {
  // Gunakan type assertion yang aman di dalam fungsi
  const { cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props as ActiveShapeProps;
  const RADIAN = Math.PI / 180;
  const sin = Math.sin(-RADIAN * midAngle);
  const cos = Math.cos(-RADIAN * midAngle);
  const sx = cx + (outerRadius + 10) * cos;
  const sy = cy + (outerRadius + 10) * sin;
  const mx = cx + (outerRadius + 30) * cos;
  const my = cy + (outerRadius + 30) * sin;
  const ex = mx + (cos >= 0 ? 1 : -1) * 22;
  const ey = my;
  const textAnchor = cos >= 0 ? 'start' : 'end';

  return (
    <g>
      <text x={cx} y={cy} dy={8} textAnchor="middle" fill={fill} fontSize={16} fontWeight="bold">
        {payload.name}
      </text>
      <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius} startAngle={startAngle} endAngle={endAngle} fill={fill} />
      <Sector cx={cx} cy={cy} startAngle={startAngle} endAngle={endAngle} innerRadius={outerRadius + 6} outerRadius={outerRadius + 10} fill={fill} />
      <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" />
      <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
      <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} textAnchor={textAnchor} fill="#fff">{formatCurrency(value)}</text>
      <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} dy={18} textAnchor={textAnchor} fill="#999">
        {`(${(percent * 100).toFixed(2)}%)`}
      </text>
    </g>
  );
};

// Fungsi format sumbu Y sekarang selalu mengembalikan string
const formatYAxisTick = (tick: number): string => {
  if (tick >= 1000000) return `${tick / 1000000} Jt`;
  if (tick >= 1000) return `${tick / 1000} rb`;
  return String(tick);
};

// Komponen Tooltip Kustom, sekarang fully type-safe
const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-700/80 backdrop-blur-sm p-3 rounded-md border border-gray-600">
          <p className="label text-cyan-400 font-semibold">{`${payload[0].name}`}</p>
          <p className="intro text-white">{formatCurrency(payload[0].value!)}</p>
        </div>
      );
    }
    return null;
};

// Varian animasi untuk container dan item
const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2, // Jeda antar item
      },
    },
};
  
const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 },
};

export default function ExpenseChart({ data }: ChartProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  const onPieEnter = (_: unknown, index: number) => {
    setActiveIndex(index);
  };

  return (
    <motion.div
      className="bg-gray-800 p-6 rounded-lg shadow-lg"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <motion.h3 
        className="text-xl font-semibold mb-4 text-cyan-400"
        variants={itemVariants}
      >
        Distribusi Pengeluaran
      </motion.h3>
      <motion.div 
        className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center"
        variants={itemVariants}
      >
        {/* Kolom Pie Chart Interaktif */}
        <motion.div style={{ width: "100%", height: 300 }} variants={itemVariants}>
          <ResponsiveContainer>
            <PieChart>
              <Pie
                // @ts-expect-error - Tipe 'recharts' untuk activeIndex salah, tapi prop ini valid
                activeIndex={activeIndex}
                activeShape={renderActiveShape}
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                onMouseEnter={onPieEnter}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Kolom Bar Chart dengan Animasi */}
        <motion.div style={{ width: "100%", height: 300 }} variants={itemVariants}>
          <ResponsiveContainer>
            <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#4a5568" />
              <XAxis type="number" tickFormatter={formatYAxisTick} stroke="#9ca3af" fontSize={12} />
              <YAxis type="category" dataKey="name" width={80} stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(107, 114, 128, 0.2)' }} />
              <Bar dataKey="value" barSize={20} animationDuration={800}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

