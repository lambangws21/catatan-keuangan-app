"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Activity, Trash2, FilePlus, History } from "lucide-react";

interface ActivityLog {
  id: string;
  stockId: string;
  action: "CREATE" | "UPDATE" | "DELETE";
  message: string;
  qtyBefore?: number;
  qtyAfter?: number;
  changedAt: string;
}

export function ActivityLog() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLogs = async () => {
    try {
      const res = await fetch("/api/activity-log");
      const json = await res.json();

      if (Array.isArray(json.data)) {
        setLogs(json.data);
      }
    } catch (err) {
      console.error("Gagal load log:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const getIcon = (action: ActivityLog["action"]) => {
    switch (action) {
      case "CREATE":
        return <FilePlus size={18} className="text-green-500" />;
      case "UPDATE":
        return <History size={18} className="text-blue-500" />;
      case "DELETE":
        return <Trash2 size={18} className="text-red-500" />;
      default:
        return <Activity size={18} className="text-zinc-500" />;
    }
  };

  return (
    <div className="p-4 rounded-xl shadow bg-white dark:bg-zinc-900">
      <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
        <History className="text-blue-500" /> Activity Log
      </h3>

      {loading ? (
        <p className="text-sm text-zinc-500">Memuat aktivitas...</p>
      ) : logs.length === 0 ? (
        <p className="text-sm text-zinc-500">Belum ada aktivitas.</p>
      ) : (
        <div className="space-y-4">
          {logs.map((log, index) => (
            <motion.div
              key={log.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                duration: 0.3,
                delay: index * 0.05,
              }}
              className="flex items-start gap-3"
            >
              {/* ICON */}
              <div className="mt-1">{getIcon(log.action)}</div>

              {/* TEXT */}
              <div className="flex-1 border-b pb-2 dark:border-zinc-700">
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                  {log.action === "CREATE" && "Tambah Stok"}
                  {log.action === "UPDATE" && "Perubahan Stok"}
                  {log.action === "DELETE" && "Hapus Stok"}
                </p>

                <p className="text-xs text-zinc-500 mt-1">{log.message}</p>

                <p className="text-[10px] text-zinc-400 mt-1">
                  {new Date(log.changedAt).toLocaleString("id-ID")}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ActivityLog;
