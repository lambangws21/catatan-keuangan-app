"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  // BarChart,
  // Bar,
  // XAxis,
  // YAxis,
  // CartesianGrid,
  Sector,
} from "recharts";
import type { TooltipProps } from "recharts";

interface ChartData extends Record<string, unknown> {
  name: string;
  value: number;
}

interface ChartProps {
  data: ChartData[];
}

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

interface CustomTooltipProps extends TooltipProps<number, string> {
  payload?: {
    name: string;
    value: number;
    payload: ChartData;
  }[];
}

const COLORS = [
  "#06b6d4",
  "#8b5cf6",
  "#ec4899",
  "#f59e0b",
  "#10b981",
  "#3b82f6",
];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);

const renderActiveShape = (props: unknown) => {
  const {
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    startAngle,
    endAngle,
    fill,
    payload,
    percent,
    value,
  } = props as ActiveShapeProps;

  const RADIAN = Math.PI / 180;
  const sin = Math.sin(-RADIAN * midAngle);
  const cos = Math.cos(-RADIAN * midAngle);
  const sx = cx + (outerRadius + 10) * cos;
  const sy = cy + (outerRadius + 10) * sin;
  const mx = cx + (outerRadius + 30) * cos;
  const my = cy + (outerRadius + 30) * sin;
  const ex = mx + (cos >= 0 ? 1 : -1) * 22;
  const ey = my;
  const anchor = cos >= 0 ? "start" : "end";

  return (
    <g>
      <text
        x={cx}
        y={cy}
        dy={8}
        textAnchor="middle"
        fill={fill}
        fontSize={16}
        fontWeight="bold"
      >
        {payload.name}
      </text>

      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />

      <Sector
        cx={cx}
        cy={cy}
        innerRadius={outerRadius + 6}
        outerRadius={outerRadius + 10}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />

      <path
        d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`}
        stroke={fill}
        fill="none"
      />
      <circle cx={ex} cy={ey} r={2} fill={fill} />

      <text
        x={ex + (cos >= 0 ? 12 : -12)}
        y={ey}
        textAnchor={anchor}
        fill="#fff"
      >
        {formatCurrency(value)}
      </text>

      <text
        x={ex + (cos >= 0 ? 12 : -12)}
        y={ey}
        dy={18}
        textAnchor={anchor}
        fill="#999"
      >
        ({(percent * 100).toFixed(2)}%)
      </text>
    </g>
  );
};

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-700/90 dark:bg-gray-800/90 backdrop-blur-sm p-3 rounded-md border border-gray-600 dark:border-gray-500">
        <p className="text-cyan-400 font-semibold">{payload[0].name}</p>
        <p className="text-white">{formatCurrency(payload[0].value!)}</p>
      </div>
    );
  }
  return null;
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1 },
};

export default function ExpenseChart({ data }: ChartProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  // const onPieEnter = (_: unknown, index: number) => setActiveIndex(index);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const isDark =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;

  return (
    <motion.div
      className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <motion.h3
        className="text-xl font-semibold mb-4 text-cyan-500 dark:text-cyan-300"
        variants={itemVariants}
      >
        Distribusi Pengeluaran
      </motion.h3>

      <motion.div
        className="grid grid-cols-1 lg:grid-cols-2 gap-8"
        variants={itemVariants}
      >
        {/* PIE CHART */}
        <motion.div
          style={{ width: "100%", height: 300 }}
          variants={itemVariants}
        >
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                    onMouseEnter={() => setActiveIndex(index)}
                  />
                ))}
              </Pie>

              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>

        {/* BAR CHART */}
        <motion.div
          style={{ width: "100%", height: 300 }}
          variants={itemVariants}
        >
         <ResponsiveContainer>
  <PieChart>
    <Pie
      data={data}
      cx="50%"
      cy="50%"
      innerRadius={60}
      outerRadius={80}
      dataKey="value"
      onMouseEnter={(_, index) => setActiveIndex(index)}
    >
      {data.map((entry, index) => (
        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
      ))}
    </Pie>

    {/* Active Shape Overlay */}
    {typeof activeIndex === "number" && data[activeIndex] && (
      <g>
        {renderActiveShape({
          ...data[activeIndex],
          cx: 200, // auto-center fallback
          cy: 150,
          innerRadius: 60,
          outerRadius: 80,
          startAngle: 0,
          endAngle: 360,
          midAngle: 0,
          fill: COLORS[activeIndex % COLORS.length],
          percent:
            data[activeIndex].value /
            data.reduce((a, b) => a + b.value, 0),
          value: data[activeIndex].value,
          payload: data[activeIndex],
        })}
      </g>
    )}

    <Tooltip content={<CustomTooltip />} />
  </PieChart>
</ResponsiveContainer>

        </motion.div>
      </motion.div>
    </motion.div>
  );
}
