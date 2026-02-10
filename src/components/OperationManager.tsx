"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { User } from "firebase/auth";
import {
  ArchiveX,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  SlidersHorizontal,
  FileDown,
  FileText,
  Hospital,
  RotateCcw,
  Search,
  Stethoscope,
  Trash2,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { AnimatePresence, motion } from "framer-motion";
import {
  Table,
  TableCell,
  TableHead,
  TableHeader,
  TableBody,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import Spinner from "./Spinner";
import OperationForm from "@/components/OperationForm";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import jsPDF from "jspdf";
import "jspdf-autotable";

// =========================
// INTERFACE
// =========================
interface Operation {
  id: string;
  date: string;
  dokter: string;
  tindakanOperasi: string;
  rumahSakit: string;
  jumlah: number | string;
  klaim: string;
  namaPerawat: string;
}

interface ManagerProps {
  operationsData: Operation[];
  isLoading: boolean;
  onDataChange: () => Promise<void>;
  user: User;
  compact?: boolean;
}

type ColumnKey =
  | "tanggal"
  | "dokter"
  | "tindakan"
  | "rumahSakit"
  | "jumlah"
  | "klaim"
  | "perawat";

const COLUMN_DEFS: Array<{ key: ColumnKey; label: string }> = [
  { key: "tanggal", label: "Tanggal" },
  { key: "dokter", label: "Dokter" },
  { key: "tindakan", label: "Tindakan" },
  { key: "rumahSakit", label: "Rumah Sakit" },
  { key: "jumlah", label: "Jumlah" },
  { key: "klaim", label: "Klaim" },
  { key: "perawat", label: "Perawat" },
];

const DEFAULT_COLUMNS: Record<ColumnKey, boolean> = {
  tanggal: true,
  dokter: true,
  tindakan: true,
  rumahSakit: true,
  jumlah: true,
  klaim: true,
  perawat: true,
};

// =========================
// HELPERS
// =========================
const formatCurrency = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);

const toDateOnly = (d: Date) => d.toISOString().split("T")[0];

const escapeCSV = (value: string | number) => {
  let s = String(value ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    s = `"${s.replace(/"/g, '""')}"`;
  }
  return s;
};

const exportTag = () => new Date().toISOString().split("T")[0];

const buildFilterTag = (from?: string, to?: string) => {
  if (!from && !to) return "semua";
  return `${from || "awal"}_${to || "akhir"}`;
};

// =========================
// COMPONENT
// =========================
export default function OperationManager({
  operationsData,
  isLoading,
  onDataChange,
  user,
  compact = false,
}: ManagerProps) {
  const STORAGE_KEY = "operation-manager:filters:v1";
  const COLUMNS_KEY = "operation-manager:columns:v1";
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [filterQuery, setFilterQuery] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(0);
  const [columns, setColumns] = useState<Record<ColumnKey, boolean>>(DEFAULT_COLUMNS);
  const isCompact = compact;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        filterFrom?: string;
        filterTo?: string;
        filterQuery?: string;
        pageSize?: number;
      };
      if (typeof parsed.filterFrom === "string") setFilterFrom(parsed.filterFrom);
      if (typeof parsed.filterTo === "string") setFilterTo(parsed.filterTo);
      if (typeof parsed.filterQuery === "string") setFilterQuery(parsed.filterQuery);
      if (typeof parsed.pageSize === "number" && Number.isFinite(parsed.pageSize)) {
        setPageSize(Math.max(1, Math.min(100, Math.floor(parsed.pageSize))));
      }
    } catch {
      // ignore
    }
     
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(COLUMNS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<Record<ColumnKey, boolean>>;
      setColumns((prev) => ({
        ...prev,
        ...Object.fromEntries(
          COLUMN_DEFS.map(({ key }) => [key, typeof parsed[key] === "boolean" ? parsed[key] : prev[key]])
        ),
      }));
    } catch {
      // ignore
    }
     
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ filterFrom, filterTo, filterQuery, pageSize })
      );
    } catch {
      // ignore
    }
  }, [filterFrom, filterTo, filterQuery, pageSize]);

  useEffect(() => {
    try {
      localStorage.setItem(COLUMNS_KEY, JSON.stringify(columns));
    } catch {
      // ignore
    }
  }, [columns]);

  const setColumnKey = useCallback((key: ColumnKey, value: boolean) => {
    setColumns((prev) => ({ ...prev, [key]: value }));
  }, []);

  // =========================
  // PRESET FILTER
  // =========================
  const setToday = () => {
    const today = toDateOnly(new Date());
    setFilterFrom(today);
    setFilterTo(today);
  };

  const setThisMonth = () => {
    const now = new Date();
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    setFilterFrom(toDateOnly(first));
    setFilterTo(toDateOnly(last));
  };

  const resetFilter = () => {
    setFilterFrom("");
    setFilterTo("");
    setFilterQuery("");
  };

  // =========================
  // FILTER LOGIC
  // =========================
  const filteredData = useMemo(() => {
    return operationsData
      .filter((op) => {
        const opDate = new Date(op.date).getTime();

        const fromMatch = filterFrom
          ? opDate >= new Date(filterFrom).getTime()
          : true;

        const toMatch = filterTo
          ? opDate <= new Date(filterTo).getTime()
          : true;

        const queryMatch = filterQuery
          ? [op.dokter, op.tindakanOperasi, op.rumahSakit, op.klaim, op.namaPerawat]
              .join(" ")
              .toLowerCase()
              .includes(filterQuery.toLowerCase())
          : true;

        return fromMatch && toMatch && queryMatch;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [operationsData, filterFrom, filterTo, filterQuery]);

  useEffect(() => {
    setPage(0);
  }, [filterFrom, filterTo, filterQuery]);

  // =========================
  // TOTAL DARI FILTER
  // =========================
  const totalFiltered = useMemo(() => {
    return filteredData.reduce((sum, op) => sum + Number(op.jumlah), 0);
  }, [filteredData]);

  // =========================
  // DELETE
  // =========================
  const handleDelete = useCallback(
    async (id: string) => {
      if (!window.confirm("Hapus data ini?")) return;

      try {
        const token = await user.getIdToken();
        const res = await fetch(`/api/operasi/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) throw new Error("Gagal menghapus data");

        toast.success("Data dihapus");
        await onDataChange();
      } catch (err) {
        toast.error((err as Error).message);
      }
    },
    [user, onDataChange]
  );

  // =========================
  // EXPORT CSV (FILTERED)
  // =========================
  const handleExportCSV = () => {
    if (filteredData.length === 0) return toast.error("Data kosong");

    const exportData = filteredData
      .slice()
      .sort((a, b) => String(a.date).localeCompare(String(b.date)));

    const headers = [
      "Tanggal",
      "Dokter",
      "Tindakan",
      "Rumah Sakit",
      "Jumlah",
      "Klaim",
      "Perawat",
    ];

    const rows = exportData.map((op) =>
      [
        escapeCSV(op.date),
        escapeCSV(op.dokter),
        escapeCSV(op.tindakanOperasi),
        escapeCSV(op.rumahSakit),
        escapeCSV(Number(op.jumlah)),
        escapeCSV(op.klaim),
        escapeCSV(op.namaPerawat),
      ].join(",")
    );

    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `laporan_operasi_filtered_${buildFilterTag(filterFrom, filterTo)}_${exportTag()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // =========================
  // EXPORT PDF (FILTERED)
  // =========================
  const handleExportPDF = () => {
    if (filteredData.length === 0) return toast.error("Data kosong");

    const exportData = filteredData
      .slice()
      .sort((a, b) => String(a.date).localeCompare(String(b.date)));

    const doc = new jsPDF();

    const tableCols = [
      "Tanggal",
      "Dokter",
      "Tindakan",
      "Rumah Sakit",
      "Jumlah",
      "Klaim",
      "Perawat",
    ];
    const tableRows = exportData.map((op) => [
      op.date,
      op.dokter,
      op.tindakanOperasi,
      op.rumahSakit,
      formatCurrency(Number(op.jumlah)),
      op.klaim,
      op.namaPerawat,
    ]);

    doc.text("Laporan Operasi (Filtered)", 14, 15);
    doc.setFontSize(10);
    doc.text(
      `Rentang: ${filterFrom || "-"} s/d ${filterTo || "-"} | Total: ${formatCurrency(totalFiltered)}`,
      14,
      21
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (doc as any).autoTable({
      head: [tableCols],
      body: tableRows,
      startY: 26,
      theme: "striped",
      headStyles: { fillColor: [30, 64, 175] },
    });

    doc.save(`laporan_operasi_filtered_${buildFilterTag(filterFrom, filterTo)}_${exportTag()}.pdf`);
  };

  const pageCount = Math.max(1, Math.ceil(filteredData.length / pageSize));
  const pageSafe = Math.min(page, pageCount - 1);

  useEffect(() => {
    if (page !== pageSafe) setPage(pageSafe);
  }, [page, pageSafe]);

  const pagedData = useMemo(() => {
    const start = pageSafe * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, pageSafe, pageSize]);

  const tableBounceKey = useMemo(() => {
    return [
      pageSafe,
      pageSize,
      filterFrom || "-",
      filterTo || "-",
      filterQuery || "-",
      totalFiltered,
      JSON.stringify(columns),
    ].join("|");
  }, [pageSafe, pageSize, filterFrom, filterTo, filterQuery, totalFiltered, columns]);

  // =========================
  // RENDER
  // =========================
  if (isLoading) {
    return (
      <div className="text-center p-8">
        <Spinner />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl border border-white/10 bg-(--dash-surface)] p-6 text-(--dash-ink)] shadow-[0_20px_60px_rgba(2,6,23,0.45)]"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.4em] text-(--dash-muted)]">
            Riwayat
          </p>
          <h2 className="mt-1 text-xl font-semibold">Data Operasi</h2>
          <p className="mt-1 text-sm text-(--dash-muted)]">
            Filter cepat, export berdasarkan hasil filter, dan edit data langsung dari tabel.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={handleExportCSV}
            variant="secondary"
            className="border border-white/10 bg-white/10 text-(--dash-ink)] hover:bg-white/15"
          >
            <FileDown className="mr-2 h-4 w-4" />
            CSV
          </Button>
          <Button
            onClick={handleExportPDF}
            variant="secondary"
            className="border border-white/10 bg-white/10 text-(--dash-ink)] hover:bg-white/15"
          >
            <FileText className="mr-2 h-4 w-4" />
            PDF
          </Button>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-12">
        <div className="lg:col-span-3">
          <label className="mb-1 block text-[11px] font-medium text-(--dash-muted)]">
            Dari tanggal
          </label>
          <Input
            type="date"
            value={filterFrom}
            onChange={(e) => setFilterFrom(e.target.value)}
            className="border-white/10 bg-white/5 text-(--dash-ink)]"
          />
        </div>
        <div className="lg:col-span-3">
          <label className="mb-1 block text-[11px] font-medium text-(--dash-muted)]">
            Sampai tanggal
          </label>
          <Input
            type="date"
            value={filterTo}
            onChange={(e) => setFilterTo(e.target.value)}
            className="border-white/10 bg-white/5 text-(--dash-ink)]"
          />
        </div>
        <div className="lg:col-span-4">
          <label className="mb-1 block text-[11px] font-xs text-(--dash-muted)]">
            Pencarian
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-(--dash-muted)]" />
            <Input
              placeholder="cari..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="border-white/10 bg-white/5 pl-10 text-(--dash-ink)]"
            />
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-2 lg:col-span-2">
          <Button
            onClick={setToday}
            variant="secondary"
            className="border border-white/10 bg-white/10 text-(--dash-ink)] hover:bg-white/15"
          >
            Hari Ini
          </Button>
          <Button
            onClick={setThisMonth}
            variant="secondary"
            className="border border-white/10 bg-white/10 text-(--dash-ink)] hover:bg-white/15"
          >
            Bulan Ini
          </Button>
          <Button
            onClick={resetFilter}
            variant="secondary"
            className="border border-white/10 bg-white/5 text-(--dash-muted)] hover:bg-white/10"
          >
            <RotateCcw className=" h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* SUMMARY */}
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-[10px] uppercase tracking-[0.3em] text-(--dash-muted)]">
            Total (Filter)
          </p>
          <div className="mt-2 flex items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 text-[11px] text-(--dash-muted)]">
              <Wallet className="h-4 w-4" />
              <span>Jumlah biaya</span>
            </div>
            <p className="text-lg font-semibold text-emerald-300 tabular-nums">
              {formatCurrency(totalFiltered)}
            </p>
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-[10px] uppercase tracking-[0.3em] text-(--dash-muted)]">
            Data
          </p>
          <div className="mt-2 flex items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 text-[11px] text-(--dash-muted)]">
              <ArchiveX className="h-4 w-4" />
              <span>Hasil filter</span>
            </div>
            <p className="text-lg font-semibold tabular-nums">
              {filteredData.length}
            </p>
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-[10px] uppercase tracking-[0.3em] text-(--dash-muted)]">
            Rentang
          </p>
          <div className="mt-2 flex items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 text-[11px] text-(--dash-muted)]">
              <CalendarDays className="h-4 w-4" />
              <span>Tanggal</span>
            </div>
            <p className="text-sm font-semibold tabular-nums">
              {filterFrom || "-"} → {filterTo || "-"}
            </p>
          </div>
        </div>
      </div>

      {/* TABLE */}
      {filteredData.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-10 text-center text-sm text-(--dash-muted)]">
          <ArchiveX className="mx-auto mb-4 h-12 w-12 opacity-80" />
          Tidak ada data sesuai filter.
        </div>
      ) : (
        <>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-sm text-(--dash-muted)]">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold">
                <Users className="h-4 w-4" />
                {filteredData.length} data
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold">
                <FileDown className="h-4 w-4" />
                Export: {exportTag()}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="secondary"
                    className="border border-white/10 bg-white/10 text-(--dash-ink)] hover:bg-white/15"
                  >
                    <SlidersHorizontal className="mr-2 h-4 w-4" />
                    Kolom
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-64 border border-white/15 bg-slate-950/95 text-white shadow-xl backdrop-blur"
                >
                  <DropdownMenuLabel>Tampilkan kolom</DropdownMenuLabel>
                  {COLUMN_DEFS.map((c) => (
                    <DropdownMenuCheckboxItem
                      key={c.key}
                      checked={columns[c.key]}
                      onCheckedChange={(v) => setColumnKey(c.key, Boolean(v))}
                    >
                      {c.label}
                    </DropdownMenuCheckboxItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setColumns(DEFAULT_COLUMNS)}>
                    Reset ke default
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="flex items-center gap-2">
                <label className="text-[11px] font-medium text-(--dash-muted)]">
                  Rows
                </label>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="h-9 rounded-md border border-white/10 bg-white/5 px-3 text-sm text-(--dash-ink)]"
                >
                  {[10, 25, 50, 100].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="mt-3 overflow-auto rounded-2xl border border-white/10 bg-white/5">
            <div className="max-h-[460px] overflow-auto">
              <Table
                className={[
                  "min-w-[850px]",
                  isCompact
                    ? "text-[13px] [&_td]:px-2 [&_td]:py-1.5 [&_th]:px-2 [&_th]:h-9 [&_th]:text-[11px]"
                    : "",
                ].join(" ")}
              >
                <TableHeader>
                  <TableRow className="bg-(--dash-surface-strong)]">
                    {columns.tanggal ? (
                      <TableHead className="sticky top-0 z-10 bg-(--dash-surface-strong)]">
                        Tanggal
                      </TableHead>
                    ) : null}
                    {columns.dokter ? (
                      <TableHead className="sticky top-0 z-10 bg-(--dash-surface-strong)]">
                        Dokter
                      </TableHead>
                    ) : null}
                    {columns.tindakan ? (
                      <TableHead className="sticky top-0 z-10 bg-(--dash-surface-strong)]">
                        Tindakan
                      </TableHead>
                    ) : null}
                    {columns.rumahSakit ? (
                      <TableHead className="sticky top-0 z-10 bg-(--dash-surface-strong)]">
                        Rumah Sakit
                      </TableHead>
                    ) : null}
                    {columns.jumlah ? (
                      <TableHead className="sticky top-0 z-10 bg-(--dash-surface-strong)] text-right">
                        Jumlah
                      </TableHead>
                    ) : null}
                    {columns.klaim ? (
                      <TableHead className="sticky top-0 z-10 bg-(--dash-surface-strong)]">
                        Klaim
                      </TableHead>
                    ) : null}
                    {columns.perawat ? (
                      <TableHead className="sticky top-0 z-10 bg-(--dash-surface-strong)]">
                        Perawat
                      </TableHead>
                    ) : null}
                    <TableHead className="sticky top-0 z-10 bg-(--dash-surface-strong)] text-center">
                      Aksi
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody key={tableBounceKey}>
                  <AnimatePresence initial={false}>
                    {pagedData.map((item, idx) => {
                    const nurses = String(item.namaPerawat || "")
                      .split(/\r?\n/)
                      .map((s) => s.trim())
                      .filter(Boolean);
                    const nursePrimary = nurses[0] || "-";
                    const nurseExtra =
                      nurses.length > 1 ? `+${nurses.length - 1}` : "";
                    const klaimLower = String(item.klaim || "").toLowerCase();
                    const klaimTone = klaimLower.includes("bpjs")
                      ? "text-emerald-300"
                      : klaimLower.includes("asur")
                        ? "text-violet-300"
                        : "text-amber-300";

                    return (
                      <motion.tr
                        key={item.id}
                        initial={{ opacity: 0, y: 10, scale: 0.992 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.992 }}
                        transition={{
                          type: "spring",
                          stiffness: 520,
                          damping: 34,
                          mass: 0.6,
                          delay: Math.min(0.18, idx * 0.015),
                        }}
                        className="border-white/10 hover:bg-white/5"
                      >
                        {columns.tanggal ? (
                          <TableCell className="tabular-nums">
                            <span className={isCompact ? "inline-flex items-center gap-1.5" : "inline-flex items-center gap-2"}>
                              <CalendarDays className={isCompact ? "h-3.5 w-3.5 text-(--dash-muted)]" : "h-4 w-4 text-(--dash-muted)]"} />
                              {item.date}
                            </span>
                          </TableCell>
                        ) : null}
                        {columns.dokter ? (
                          <TableCell className="max-w-[220px]">
                            <span className={isCompact ? "inline-flex items-center gap-1.5" : "inline-flex items-center gap-2"}>
                              <UserRound className={isCompact ? "h-3.5 w-3.5 text-(--dash-muted)]" : "h-4 w-4 text-(--dash-muted)]"} />
                              <span className="truncate">{item.dokter}</span>
                            </span>
                          </TableCell>
                        ) : null}
                        {columns.tindakan ? (
                          <TableCell className="whitespace-normal">
                            <span className={isCompact ? "inline-flex items-start gap-1.5" : "inline-flex items-start gap-2"}>
                              <Stethoscope className={isCompact ? "mt-0.5 h-3.5 w-3.5 text-(--dash-muted)]" : "mt-0.5 h-4 w-4 text-(--dash-muted)]"} />
                              <span className="max-w-[340px] wrap-break-word">
                                {item.tindakanOperasi}
                              </span>
                            </span>
                          </TableCell>
                        ) : null}
                        {columns.rumahSakit ? (
                          <TableCell className="whitespace-normal">
                            <span className={isCompact ? "inline-flex items-start gap-1.5" : "inline-flex items-start gap-2"}>
                              <Hospital className={isCompact ? "mt-0.5 h-3.5 w-3.5 text-(--dash-muted)]" : "mt-0.5 h-4 w-4 text-(--dash-muted)]"} />
                              <span className="max-w-[260px] wrap-break-word">
                                {item.rumahSakit}
                              </span>
                            </span>
                          </TableCell>
                        ) : null}
                        {columns.jumlah ? (
                          <TableCell className="text-right font-semibold tabular-nums">
                            {formatCurrency(Number(item.jumlah))}
                          </TableCell>
                        ) : null}
                        {columns.klaim ? (
                          <TableCell>
                            <span
                              className={[
                                "inline-flex items-center rounded-full border border-white/10 bg-white/5 font-semibold",
                                isCompact ? "px-2.5 py-0.5 text-[10px]" : "px-3 py-1 text-[11px]",
                                klaimTone,
                              ].join(" ")}
                            >
                              {item.klaim}
                            </span>
                          </TableCell>
                        ) : null}
                        {columns.perawat ? (
                          <TableCell className="whitespace-normal" title={item.namaPerawat}>
                            <span className={isCompact ? "inline-flex items-start gap-1.5" : "inline-flex items-start gap-2"}>
                              <Users className={isCompact ? "mt-0.5 h-3.5 w-3.5 text-(--dash-muted)]" : "mt-0.5 h-4 w-4 text-(--dash-muted)]"} />
                              <span className="wrap-break-word">
                                {nursePrimary}{" "}
                                {nurseExtra && (
                                  <span className={isCompact ? "ml-1 text-[10px] font-semibold text-(--dash-muted)]" : "ml-1 text-[11px] font-semibold text-(--dash-muted)]"}>
                                    {nurseExtra}
                                  </span>
                                )}
                              </span>
                            </span>
                          </TableCell>
                        ) : null}
                        <TableCell className="text-center">
                          <div className={isCompact ? "inline-flex items-center gap-0.5" : "inline-flex items-center gap-1"}>
                            <OperationForm
                              onFormSubmit={onDataChange}
                              initialData={{
                                id: item.id,
                                date: item.date,
                                dokter: item.dokter,
                                tindakanOperasi: item.tindakanOperasi,
                                rumahSakit: item.rumahSakit,
                                jumlah: Number(item.jumlah),
                                klaim: item.klaim,
                                namaPerawat: item.namaPerawat,
                              }}
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(item.id)}
                              className="text-rose-300 hover:bg-white/10 hover:text-rose-200"
                            >
                              <Trash2 className={isCompact ? "h-3.5 w-3.5" : "h-4 w-4"} />
                            </Button>
                          </div>
                        </TableCell>
                      </motion.tr>
                    );
                  })}
                  </AnimatePresence>
                </TableBody>
              </Table>
            </div>
          </div>

          {/* PAGINATION */}
          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="text-sm text-(--dash-muted)]">
              Halaman <span className="tabular-nums">{pageSafe + 1}</span> dari{" "}
              <span className="tabular-nums">{pageCount}</span>
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                className="border border-white/10 bg-white/10 text-(--dash-ink)] hover:bg-white/15"
                disabled={pageSafe === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Prev
              </Button>
              <Button
                variant="secondary"
                className="border border-white/10 bg-white/10 text-(--dash-ink)] hover:bg-white/15"
                disabled={pageSafe >= pageCount - 1}
                onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              >
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
}
