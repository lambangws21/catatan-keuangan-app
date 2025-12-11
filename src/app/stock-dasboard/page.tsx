"use client";

import { useState } from "react";
import StockStatsPremium from "@/components/stock/StockTotal";
import StockTable from "@/components/stock/StockTable";
import { UploadStockExcel } from "@/components/stock/UploadStockExcel";
import { ActivityLogPanel } from "@/components/stock/ActivityPanelLog";
import { Activity, Layers } from "lucide-react";
import { motion } from "framer-motion";

export default function ImplantStockPage() {
  const [reloadKey, setReloadKey] = useState(0);
  const triggerReload = () => setReloadKey((prev) => prev + 1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="px-3 py-5 space-y-12 max-w-8xl mx-auto"
    >

      {/* ================= HEADER ================= */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2 
            text-zinc-900 dark:text-zinc-100">
            <Layers size={26} className="text-blue-500" />
            Stok Implant Enterprise Dashboard
          </h1>

          <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-xl leading-relaxed">
            Lacak stok implant dengan UI premium. Upload Excel, pantau perubahan dengan 
            timeline interaktif, lihat insight operasional, dan kelola stok dengan cepat.
          </p>
        </div>

        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
          <UploadStockExcel onUploaded={triggerReload} />
        </motion.div>
      </div>

      {/* ================= KPI CARDS ================= */}
      <StockStatsPremium />

      {/* ================= TIMELINE ================= */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Activity className="text-blue-500" size={18} />
          Timeline Aktivitas
        </h2>

        <div className="
          rounded-2xl bg-white dark:bg-zinc-900 shadow-lg 
          border border-zinc-200 dark:border-zinc-800 
          backdrop-blur-xl p-5
        ">
          <ActivityLogPanel />
        </div>
      </div>

      {/* ================= TABLE ================= */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5 }}
        className="
          rounded-2xl shadow-xl bg-white dark:bg-zinc-900 
          border border-zinc-200 dark:border-zinc-800 
          p-5
        "
      >
        <StockTable reloadKey={reloadKey} />
      </motion.div>
    </motion.div>
  );
}
