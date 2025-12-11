"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FilePlus,
  History,
  Trash2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface LogChangeDetail {
  no?: number;
  batch?: string;
  deskripsi?: string;
  qty?: number;
  totalQty?: number;
  terpakai?: number;
  refill?: number;
  keterangan?: string;
}

interface ActivityLogItem {
  id: string;
  stockId: string;
  action: "CREATE" | "UPDATE" | "DELETE";
  message: string;
  changedAt: string;
  before?: LogChangeDetail | null;
  after?: LogChangeDetail | null;
}

export function ActivityTimeline() {
  const [logs, setLogs] = useState<ActivityLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const loadLogs = async () => {
    try {
      const res = await fetch("/api/activity-log");
      const json = await res.json();
      if (Array.isArray(json.data)) setLogs(json.data);
    } catch (e) {
      console.error("Failed to load logs:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const getIcon = (action: ActivityLogItem["action"]) => {
    switch (action) {
      case "CREATE":
        return <FilePlus size={20} className="text-green-500" />;
      case "UPDATE":
        return <History size={20} className="text-blue-500" />;
      case "DELETE":
        return <Trash2 size={20} className="text-red-500" />;
      default:
        return <History size={20} className="text-zinc-500" />;
    }
  };

  const toggleExpand = (id: string) => {
    setExpanded((prev) => (prev === id ? null : id));
  };

  return (
    <div className="p-2 rounded-xl shadow bg-white dark:bg-zinc-900">
      {loading ? (
        <p className="text-sm text-zinc-500">Memuat log...</p>
      ) : logs.length === 0 ? (
        <p className="text-sm text-zinc-500">Belum ada aktivitas.</p>
      ) : (
        <div className="relative max-h-[400px] overflow-y-auto pr-2 timeline-container">
          {/* Vertical Line */}
          <div className="absolute left-[14px] top-0 bottom-0 w-[2px] bg-zinc-300 dark:bg-zinc-700" />

          <div className="space-y-5">
            {logs.map((log) => {
              const isOpen = expanded === log.id;

              return (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                  className="relative pl-10"
                >
                  {/* Timeline Dot & Icon */}
                  <div className="absolute left-0 top-1.5 w-7 h-7 rounded-full bg-white dark:bg-zinc-800 shadow flex items-center justify-center border border-zinc-300 dark:border-zinc-700">
                    {getIcon(log.action)}
                  </div>

                  {/* Main Card */}
                  <div className="p-4 rounded-lg border bg-zinc-50 dark:bg-zinc-800 dark:border-zinc-700">
                    <div className="flex justify-between items-center">
                      <p className="font-medium text-sm">
                        {log.message}
                      </p>

                      <button onClick={() => toggleExpand(log.id)}>
                        {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </button>
                    </div>

                    <p className="text-[10px] text-zinc-500 mt-1">
                      {new Date(log.changedAt).toLocaleString("id-ID")}
                    </p>

                    {/* Expandable Section */}
                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3 }}
                          className="mt-3 text-xs rounded-lg bg-white/60 dark:bg-zinc-900/40 p-3 border dark:border-zinc-600"
                        >
                          {/* BEFORE */}
                          {log.before && (
                            <div className="mb-2">
                              <p className="font-semibold text-red-500 mb-1">
                                Sebelum:
                              </p>
                              <pre className="text-xs whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">
                                {JSON.stringify(log.before, null, 2)}
                              </pre>
                            </div>
                          )}

                          {/* AFTER */}
                          {log.after && (
                            <div>
                              <p className="font-semibold text-green-600 mb-1">
                                Sesudah:
                              </p>
                              <pre className="text-xs whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">
                                {JSON.stringify(log.after, null, 2)}
                              </pre>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
