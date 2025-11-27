"use client";

import { useMemo, useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  LineChart,
  Line,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Activity, Building2,  Wallet } from "lucide-react";
import { format } from "date-fns";

// ================= TYPES =================
export interface Operation {
  id: string;
  date: string;
  dokter: string;
  tindakanOperasi: string;
  rumahSakit: string;
  jumlah: number;
  klaim: string;
  namaPerawat: string;
}

interface HospitalItem {
  rumahSakit: string;
  totalJumlah: number;
  totalKasus: number;
}

interface DailyItem {
  tanggal: string;
  totalJumlah: number;
  totalKasus: number;
}

interface DoctorItem {
  dokter: string;
  totalJumlah: number;
  totalKasus: number;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);

// ================= COMPONENT FINAL =================

export default function OperationAnalyticsDashboard() {
  const [operations, setOperations] = useState<Operation[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isLoading, setIsLoading] = useState(true);

  // ==== FETCH DATA FROM DATABASE ====
  const fetchOperations = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/operasi");
      const data = await res.json();
      setOperations(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Gagal memuat data operasi:", error);
      setOperations([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOperations();
  }, [fetchOperations]);

  // ==== SAFEGUARD ====
  const safeOperations = useMemo<Operation[]>(() => {
    return Array.isArray(operations) ? operations : [];
  }, [operations]);

  const totalKasus = safeOperations.length;

  const totalBiaya = useMemo(
    () => safeOperations.reduce((sum, op) => sum + (op.jumlah || 0), 0),
    [safeOperations]
  );

  const totalRumahSakit = useMemo(
    () => new Set(safeOperations.map((op) => op.rumahSakit)).size,
    [safeOperations]
  );

  const rataRataPerKasus = totalKasus > 0 ? totalBiaya / totalKasus : 0;

  // ==== GROUP RS ====
  const byHospital = useMemo<HospitalItem[]>(() => {
    const map = new Map<string, { totalJumlah: number; totalKasus: number }>();

    safeOperations.forEach((op) => {
      const key = op.rumahSakit || "Tidak diketahui";
      const current = map.get(key) ?? { totalJumlah: 0, totalKasus: 0 };
      current.totalJumlah += op.jumlah || 0;
      current.totalKasus += 1;
      map.set(key, current);
    });

    return Array.from(map.entries()).map(([rumahSakit, value]) => ({
      rumahSakit,
      totalJumlah: value.totalJumlah,
      totalKasus: value.totalKasus,
    }));
  }, [safeOperations]);

  // ==== TREND HARIAN ====
  const byDate = useMemo<DailyItem[]>(() => {
    const map = new Map<string, { totalJumlah: number; totalKasus: number }>();

    safeOperations.forEach((op) => {
      const d = op.date ? new Date(op.date) : new Date();
      const key = format(d, "yyyy-MM-dd");
      const current = map.get(key) ?? { totalJumlah: 0, totalKasus: 0 };
      current.totalJumlah += op.jumlah || 0;
      current.totalKasus += 1;
      map.set(key, current);
    });

    return Array.from(map.entries()).map(([tanggal, value]) => ({
      tanggal,
      totalJumlah: value.totalJumlah,
      totalKasus: value.totalKasus,
    }));
  }, [safeOperations]);

  // ==== TOP DOKTER ====
  const topDoctors = useMemo<DoctorItem[]>(() => {
    const map = new Map<string, { totalJumlah: number; totalKasus: number }>();

    safeOperations.forEach((op) => {
      const key = op.dokter || "Tidak diketahui";
      const current = map.get(key) ?? { totalJumlah: 0, totalKasus: 0 };
      current.totalJumlah += op.jumlah || 0;
      current.totalKasus += 1;
      map.set(key, current);
    });

    return Array.from(map.entries())
      .map(([dokter, value]) => ({
        dokter,
        totalJumlah: value.totalJumlah,
        totalKasus: value.totalKasus,
      }))
      .sort((a, b) => b.totalJumlah - a.totalJumlah)
      .slice(0, 5);
  }, [safeOperations]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 flex justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Total Operasi</p>
              <p className="text-2xl font-bold">{totalKasus}</p>
            </div>
            <Activity />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 flex justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Total Biaya</p>
              <p className="text-lg font-bold">{formatCurrency(totalBiaya)}</p>
            </div>
            <Wallet />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 flex justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Rata-rata</p>
              <p className="text-lg font-bold">{formatCurrency(rataRataPerKasus)}</p>
            </div>
            <Activity />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 flex justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Rumah Sakit</p>
              <p className="text-2xl font-bold">{totalRumahSakit}</p>
            </div>
            <Building2 />
          </CardContent>
        </Card>
      </div>

      {/* CHARTS */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Biaya per Rumah Sakit</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer>
              <BarChart data={byHospital}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="rumahSakit" />
                <YAxis />
                <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                <Bar dataKey="totalJumlah" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Trend Harian</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer>
              <LineChart data={byDate}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="tanggal" />
                <YAxis />
                <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                <Line type="monotone" dataKey="totalJumlah" stroke="#06b6d4" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* TOP DOKTER */}
      <Card>
        <CardHeader>
          <CardTitle>Top Dokter</CardTitle>
        </CardHeader>
        <CardContent>
          {topDoctors.map((doc) => (
            <div key={doc.dokter} className="flex justify-between py-2">
              <span>{doc.dokter}</span>
              <span>{formatCurrency(doc.totalJumlah)}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </motion.div>
  );
}
