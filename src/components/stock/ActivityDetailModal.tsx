"use client";

import { motion } from "framer-motion";
import { X, ArrowRight, Activity, Dot, Tag, Package } from "lucide-react";
import clsx from "clsx";

interface BeforeAfter {
  qty?: number;
  totalQty?: number;
  terpakai?: number;
  batch?: string;
  deskripsi?: string;
}

interface ActivityDetailModalProps {
  open: boolean;
  onClose: () => void;
  action: string;
  message: string;
  changedAt: string;
  before?: BeforeAfter | null;
  after?: BeforeAfter | null;
}

export function ActivityDetailModal({
  open,
  onClose,
  action,
  message,
  changedAt,
  before,
  after,
}: ActivityDetailModalProps) {
  if (!open) return null;

  const badgeColor = {
    CREATE: "bg-green-100 text-green-700 border-green-300",
    UPDATE: "bg-blue-100 text-blue-700 border-blue-300",
    DELETE: "bg-red-100 text-red-700 border-red-300",
  }[action] ?? "bg-zinc-200 text-zinc-700 border-zinc-300";

  const changed = (key: keyof BeforeAfter) =>
    before?.[key] !== after?.[key];

  const stockName = after?.deskripsi ?? before?.deskripsi ?? "Unknown Stock";
  const stockBatch = after?.batch ?? before?.batch ?? "-";

  return (
    <div className="fixed inset-0 z-50 backdrop-blur-sm bg-black/50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0 }}
        className="relative w-full max-w-lg rounded-2xl shadow-2xl bg-white/80 dark:bg-zinc-900/80 border border-white/10 backdrop-blur-xl p-6"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition"
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-full bg-blue-600 text-white shadow">
            <Activity size={20} />
          </div>

          <div className="flex-1">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              Detail Aktivitas
              <span
                className={clsx(
                  "text-[10px] px-2 py-1 rounded-full border",
                  badgeColor
                )}
              >
                {action}
              </span>
            </h2>

            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {new Date(changedAt).toLocaleString("id-ID")}
            </p>
          </div>
        </div>

        {/* STOCK INFO */}
        <div className="mb-4 bg-white/50 dark:bg-zinc-800/50 border border-zinc-200/50 dark:border-zinc-700/50 rounded-lg p-3 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Tag size={14} className="text-blue-500" />
            <span className="text-sm font-semibold">
              {stockName}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
            <Package size={12} className="text-zinc-400" />
            Batch: <span className="font-medium">{stockBatch}</span>
          </div>
        </div>

        {/* MESSAGE */}
        <p className="text-sm text-zinc-700 dark:text-zinc-300 mb-4 leading-relaxed">
          {message}
        </p>

        {/* BEFORE / AFTER CARD */}
        {(before || after) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border bg-white/60 dark:bg-zinc-800/60 border-zinc-300/40 dark:border-zinc-700/40 p-4"
          >
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-1">
              <Dot className="text-blue-500" /> Perbandingan Perubahan
            </h3>

            <div className="grid grid-cols-3 gap-3 text-xs">
              {/* BEFORE */}
              <div className="space-y-1">
                <div className="font-semibold text-zinc-700 dark:text-zinc-200">
                  Before
                </div>
                <p>Qty: {before?.qty ?? "-"}</p>
                <p>Total: {before?.totalQty ?? "-"}</p>
                <p>Used: {before?.terpakai ?? "-"}</p>
              </div>

              {/* ARROW */}
              <div className="flex items-center justify-center">
                <ArrowRight size={22} className="text-zinc-500" />
              </div>

              {/* AFTER */}
              <div className="space-y-1">
                <div className="font-semibold text-zinc-700 dark:text-zinc-200">
                  After
                </div>
                <p className={clsx(changed("qty") && "text-blue-600 font-semibold")}>
                  Qty: {after?.qty ?? "-"}
                </p>
                <p className={clsx(changed("totalQty") && "text-blue-600 font-semibold")}>
                  Total: {after?.totalQty ?? "-"}
                </p>
                <p className={clsx(changed("terpakai") && "text-blue-600 font-semibold")}>
                  Used: {after?.terpakai ?? "-"}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        <div className="flex justify-end mt-5">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 transition text-sm font-medium"
          >
            Tutup
          </button>
        </div>
      </motion.div>
    </div>
  );
}
