"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Asumsikan tipe Operation diimpor dari halaman utamanya atau didefinisikan di sini
interface Operation {
  id: string;
  jumlah: number;
  rumahSakit: string;
}
interface DashboardProps {
    operations: Operation[];
    isLoading: boolean;
}

const formatCurrency = (value: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);

export default function OperationDashboard({ operations }: DashboardProps) {
  const { totalJumlah, totalOperasi, dataGrafik } = useMemo(() => {
    if (!Array.isArray(operations)) return { totalJumlah: 0, totalOperasi: 0, dataGrafik: [] };

    const totalJumlah = operations.reduce((sum, op) => sum + Number(op.jumlah), 0);
    const totalOperasi = operations.length;
    
    const dataByRS = operations.reduce((acc, op) => {
        acc[op.rumahSakit] = (acc[op.rumahSakit] || 0) + Number(op.jumlah);
        return acc;
    }, {} as { [key: string]: number });

    const dataGrafik = Object.entries(dataByRS)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

    return { totalJumlah, totalOperasi, dataGrafik };
  }, [operations]);

  const COLORS = ["#06b6d4", "#8b5cf6", "#ec4899"];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total Biaya</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{formatCurrency(totalJumlah)}</div></CardContent></Card>
            <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Jumlah Tindakan</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{totalOperasi}</div></CardContent></Card>
        </div>
        <div className="mt-6">
            <Card className="col-span-4">
                <CardHeader><CardTitle>Biaya per Rumah Sakit</CardTitle></CardHeader>
                <CardContent className="pl-2 h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={dataGrafik}>
                            <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${formatCurrency(value)}`} />
                            <Tooltip cursor={{ fill: 'rgba(107, 114, 128, 0.2)' }} contentStyle={{ backgroundColor: '#1f2937', border: 'none' }} />
                            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                               {dataGrafik.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
    </motion.div>
  );
}
