"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FilePlus,
  History,
  Trash2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(15);
  const [hovered, setHovered] = useState<string | null>(null);

  const loadLogs = async () => {
    try {
      const res = await fetch("/api/activity-log");
      const json = await res.json();
      if (Array.isArray(json.data)) {
        setLogs(json.data);
      }
    } catch (error) {
      console.error("Failed to load logs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const perPageOptions = [5, 10, 15, 25];
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(logs.length / perPage)),
    [logs.length, perPage]
  );

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const paginatedLogs = useMemo(() => {
    const start = (page - 1) * perPage;
    return logs.slice(start, start + perPage);
  }, [logs, page, perPage]);

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

  if (loading) {
    return (
      <div className="p-2 rounded-xl shadow bg-white dark:bg-zinc-900">
        <p className="text-sm text-zinc-500">Memuat log...</p>
      </div>
    );
  }

  if (!logs.length) {
    return (
      <div className="p-2 rounded-xl shadow bg-white dark:bg-zinc-900">
        <p className="text-sm text-zinc-500">Belum ada aktivitas.</p>
      </div>
    );
  }

  return (
    <div className="p-2 rounded-xl shadow bg-white dark:bg-zinc-900">
      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-200/70 bg-slate-50/90 p-3 text-xs text-slate-500 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-300">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-zinc-300">
              Menampilkan {perPage} dari {logs.length}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
                Per halaman
              </span>
              <Select
                value={String(perPage)}
                onValueChange={(value) => {
                  setPerPage(Number(value));
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-8 w-[110px] rounded-full border border-slate-300 bg-white text-slate-700 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl bg-white text-black dark:bg-slate-900 dark:text-white">
                  {perPageOptions.map((option) => (
                    <SelectItem key={option} value={String(option)}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="ml-auto flex items-center gap-2 text-[11px] font-semibold tracking-[0.2em] text-slate-400 dark:text-zinc-300">
              <button
                className="h-8 rounded-full border border-slate-300 px-3 py-1 text-[12px] transition hover:border-slate-400 dark:border-zinc-800 dark:hover:border-zinc-500"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={page === 1}
              >
                Prev
              </button>
              <span>
                {page} / {totalPages}
              </span>
              <button
                className="h-8 rounded-full border border-slate-300 px-3 py-1 text-[12px] transition hover:border-slate-400 dark:border-zinc-800 dark:hover:border-zinc-500"
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={page === totalPages}
              >
                Next
              </button>
            </div>
          </div>
        </div>

        <div className="relative max-h-[480px] overflow-y-auto pr-2 timeline-container">
          <div className="absolute left-3.5 top-0 bottom-0 w-0.5 bg-zinc-300 dark:bg-zinc-700" />

          <div className="space-y-5">
            {paginatedLogs.map((log) => {
              const isOpen = expanded === log.id;
              const isActive = hovered === log.id;
              const cardClasses = cn(
                "p-4 rounded-lg transition duration-200",
                isActive
                  ? "border-emerald-300/80 bg-white dark:border-emerald-500/30 dark:bg-zinc-900 shadow-lg"
                  : "border border-slate-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800"
              );

              const dotClasses = cn(
                "absolute left-0 top-1.5 w-7 h-7 rounded-full bg-white dark:bg-zinc-800 shadow flex items-center justify-center",
                isActive
                  ? "border-emerald-300/80"
                  : "border border-zinc-300 dark:border-zinc-700"
              );

              return (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                  className="relative pl-10"
                  onMouseEnter={() => setHovered(log.id)}
                  onMouseLeave={() => setHovered(null)}
                  onFocus={() => setHovered(log.id)}
                  onBlur={() => setHovered(null)}
                >
                  <div className={dotClasses}>{getIcon(log.action)}</div>

                  <div className={cardClasses}>
                    <div className="flex justify-between items-center">
                      <p className="font-medium text-sm">{log.message}</p>
                      <button
                        onClick={() => toggleExpand(log.id)}
                        className="rounded-full p-1 text-zinc-500 transition hover:text-zinc-700"
                      >
                        {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </button>
                    </div>

                    <p className="text-[10px] text-zinc-500 mt-1">
                      {new Date(log.changedAt).toLocaleString("id-ID")}
                    </p>

                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3 }}
                          className="mt-3 text-xs rounded-lg bg-white/60 dark:bg-zinc-900/40 p-3 border dark:border-zinc-600"
                        >
                          {log.before && (
                            <div className="mb-2">
                              <p className="font-semibold text-red-500 mb-1">Sebelum:</p>
                              <pre className="text-xs whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">
                                {JSON.stringify(log.before, null, 2)}
                              </pre>
                            </div>
                          )}

                          {log.after && (
                            <div>
                              <p className="font-semibold text-green-600 mb-1">Sesudah:</p>
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
      </div>
    </div>
  );
}
