"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Search, FilePlus, History, Trash2 } from "lucide-react";
import { ActivityDetailModal } from "./ActivityDetailModal";

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

type ActionType = "ALL" | "CREATE" | "UPDATE" | "DELETE";

export function ActivityLogPanel() {
  const [logs, setLogs] = useState<ActivityLogItem[]>([]);
  const [filtered, setFiltered] = useState<ActivityLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ActivityLogItem | null>(null);

  const [actionFilter, setActionFilter] = useState<ActionType>("ALL");
  const [search, setSearch] = useState("");

  const loadLogs = async () => {
    try {
      const res = await fetch("/api/activity-log");
      const json = await res.json();
      if (Array.isArray(json.data)) {
        setLogs(json.data);
        setFiltered(json.data);
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

  useEffect(() => {
    let result = [...logs];

    if (actionFilter !== "ALL")
      result = result.filter((log) => log.action === actionFilter);

    if (search.trim() !== "")
      result = result.filter((log) =>
        log.message.toLowerCase().includes(search.toLowerCase())
      );

    setFiltered(result);
  }, [actionFilter, search, logs]);

  const getColor = (action: ActivityLogItem["action"]): string => {
    switch (action) {
      case "CREATE":
        return "text-green-500";
      case "UPDATE":
        return "text-blue-500";
      case "DELETE":
        return "text-red-500";
      default:
        return "text-zinc-400";
    }
  };

  const getIcon = (action: ActivityLogItem["action"]) => {
    const size = 14; // lebih kecil premium
    switch (action) {
      case "CREATE":
        return <FilePlus size={size} className="text-green-500" />;
      case "UPDATE":
        return <History size={size} className="text-blue-500" />;
      case "DELETE":
        return <Trash2 size={size} className="text-red-500" />;
      default:
        return <History size={size} className="text-zinc-500" />;
    }
  };

  return (
    <div className="p-3 rounded-xl border bg-white dark:bg-zinc-900 dark:border-zinc-700 shadow-sm">
     <div className="flex justify-between">

      {/* FILTER BAR */}
      <div className="flex gap-2 mb-3">
        <div className="relative flex">
          <Search className="absolute left-2 top-2 w-3.5 h-3.5 text-zinc-500" />
          <input
            placeholder="Cari..."
            className="w-full pl-7 pr-3 py-1.5 rounded-md border text-xs bg-zinc-50 
                       dark:bg-zinc-800 dark:border-zinc-700"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="px-2 py-1.5 rounded-lg border text-xs bg-zinc-50 dark:bg-zinc-800 dark:border-zinc-700"
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value as ActionType)}
        >
          <option value="ALL">All</option>
          <option value="CREATE">Create</option>
          <option value="UPDATE">Update</option>
          <option value="DELETE">Delete</option>
        </select>
      </div>

     </div>
   
      {/* TIMELINE LIST */}
      <div className=" relative max-h-64 overflow-y-auto pr-1">
        {/* Vertical Line (lebih tipis dan halus) */}
        <div className="absolute left-3 top-0 bottom-0 w-[1.5px] bg-zinc-200 dark:bg-zinc-700" />

        {loading ? (
          <p className="text-xs text-zinc-500">Memuat...</p>
        ) : filtered.length === 0 ? (
          <p className="text-xs text-zinc-500">Tidak ada aktivitas.</p>
        ) : (
          <div className="space-y-4">
            {filtered.map((log, index) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25, delay: index * 0.04 }}
                onClick={() => setSelected(log)}
                className="relative pl-8 cursor-pointer group"
              >
                {/* Timeline Dot Premium (lebih kecil) */}
                <div
                  className={`absolute left-[0.30rem] top-[0.28rem] w-2 h-2 rounded-full border-2 
                              ${getColor(log.action)} bg-white dark:bg-zinc-900`}
                />

                {/* Card */}
                <div className="flex items-center gap-2 p-1 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-transparent 
                                group-hover:border-zinc-300 dark:group-hover:border-zinc-600 
                                shadow-sm transition">
                  <p className="text-xs font-medium text-zinc-700 dark:text-zinc-200 flex items-center gap-1">
                    {getIcon(log.action)} {log.message}
                  </p>

                  <p className="text-[10px] text-zinc-400 mt-1">
                    {new Date(log.changedAt).toLocaleString("id-ID")}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* DETAIL MODAL */}
      {selected && (
        <ActivityDetailModal
          open={true}
          onClose={() => setSelected(null)}
          action={selected.action}
          message={selected.message}
          changedAt={selected.changedAt}
          before={selected.before}
          after={selected.after}
        />
      )}
    </div>
  );
}
