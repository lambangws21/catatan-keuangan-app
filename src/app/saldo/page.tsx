"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/components/AuthProvider";
import SaldoForm from "@/components/FormSaldo";
import SaldoManager from "@/components/ManajerSaldo";

// =======================
// TIPE DATA
// =======================
interface Saldo {
  id: string;
  tanggal: string; // format: YYYY-MM-DD
  keterangan: string;
  jumlah: number;
}

export default function SaldoPage() {
  const { user } = useAuth();
  const [saldoData, setSaldoData] = useState<Saldo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // ✅ FILTER RANGE
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // ✅ JAM & TANGGAL SEKARANG
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // =======================
  // ✅ FETCH DATA
  // =======================
  const fetchSaldo = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/saldo", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Gagal mengambil data saldo.");

      const data = await response.json();
      setSaldoData(data);
    } catch (error) {
      console.error(error);
      setSaldoData([]);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSaldo();
  }, [fetchSaldo]);

  // =======================
  // ✅ DEFAULT: FILTER BULAN INI
  // =======================
  useEffect(() => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    setDateFrom(firstDay.toISOString().split("T")[0]);
    setDateTo(lastDay.toISOString().split("T")[0]);
  }, []);

  // =======================
  // ✅ FILTERED DATA (BULAN INI + RANGE)
  // =======================
  const filteredSaldo = useMemo(() => {
    return saldoData.filter((item) => {
      const tgl = new Date(item.tanggal).getTime();
      const from = dateFrom ? new Date(dateFrom).getTime() : null;
      const to = dateTo ? new Date(dateTo).getTime() : null;

      if (from && tgl < from) return false;
      if (to && tgl > to) return false;

      return true;
    });
  }, [saldoData, dateFrom, dateTo]);

  return (
    <div className="space-y-8">
      {/* ================= HEADER ================= */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Manajemen Saldo</h1>
          <p className="text-gray-400">
            Monitoring saldo •{" "}
            <span className="text-cyan-400 font-semibold">
              {now.toLocaleDateString("id-ID")} — {now.toLocaleTimeString("id-ID")}
            </span>
          </p>
        </div>

        <SaldoForm onSaldoAdded={fetchSaldo} />
      </header>

      {/* ================= FILTER ================= */}
      <div className="bg-gray-800/60 border border-white/10 backdrop-blur-xl rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-col md:flex-row gap-3 w-full">
          <div className="flex flex-col">
            <label className="text-xs text-gray-400 mb-1">Dari</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white"
            />
          </div>

          <div className="flex flex-col">
            <label className="text-xs text-gray-400 mb-1">Sampai</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white"
            />
          </div>
        </div>

        {/* ✅ QUICK PRESET */}
        <div className="flex gap-2 mt-2 md:mt-0">
          <button
            onClick={() => {
              const today = new Date().toISOString().split("T")[0];
              setDateFrom(today);
              setDateTo(today);
            }}
            className="px-3 py-1 text-xs rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white"
          >
            Hari Ini
          </button>

          <button
            onClick={() => {
              const now = new Date();
              const first = new Date(
                now.getFullYear(),
                now.getMonth(),
                1
              )
                .toISOString()
                .split("T")[0];
              const last = new Date(
                now.getFullYear(),
                now.getMonth() + 1,
                0
              )
                .toISOString()
                .split("T")[0];

              setDateFrom(first);
              setDateTo(last);
            }}
            className="px-3 py-1 text-xs rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            Bulan Ini
          </button>
        </div>
      </div>

      {/* ================= DATA MANAGER ================= */}
      <SaldoManager
        saldoData={filteredSaldo}  // ✅ FILTERED DATA
        isLoading={isLoading}
        onDataChange={fetchSaldo}
      />
    </div>
  );
}
