"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { User } from "firebase/auth";
import {
  ArchiveX,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
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
import { motion } from "framer-motion";
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
}

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
}: ManagerProps) {
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [filterQuery, setFilterQuery] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(0);

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

    const headers = [
      "Tanggal",
      "Dokter",
      "Tindakan",
      "Rumah Sakit",
      "Jumlah",
      "Klaim",
      "Perawat",
    ];

    const rows = filteredData.map((op) =>
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
    const tableRows = filteredData.map((op) => [
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
      className="rounded-3xl border border-white/10 bg-[var(--dash-surface)] p-6 text-[color:var(--dash-ink)] shadow-[0_20px_60px_rgba(2,6,23,0.45)]"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.4em] text-[color:var(--dash-muted)]">
            Riwayat
          </p>
          <h2 className="mt-1 text-xl font-semibold">Data Operasi</h2>
          <p className="mt-1 text-sm text-[color:var(--dash-muted)]">
            Filter cepat, export berdasarkan hasil filter, dan edit data langsung dari tabel.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={handleExportCSV}
            variant="secondary"
            className="border border-white/10 bg-white/10 text-[color:var(--dash-ink)] hover:bg-white/15"
          >
            <FileDown className="mr-2 h-4 w-4" />
            CSV
          </Button>
          <Button
            onClick={handleExportPDF}
            variant="secondary"
            className="border border-white/10 bg-white/10 text-[color:var(--dash-ink)] hover:bg-white/15"
          >
            <FileText className="mr-2 h-4 w-4" />
            PDF
          </Button>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="mt-6 grid grid-cols-1 gap-3 lg:grid-cols-12">
        <div className="lg:col-span-3">
          <label className="mb-1 block text-[11px] font-medium text-[color:var(--dash-muted)]">
            Dari tanggal
          </label>
          <Input
            type="date"
            value={filterFrom}
            onChange={(e) => setFilterFrom(e.target.value)}
            className="border-white/10 bg-white/5 text-[color:var(--dash-ink)]"
          />
        </div>
        <div className="lg:col-span-3">
          <label className="mb-1 block text-[11px] font-medium text-[color:var(--dash-muted)]">
            Sampai tanggal
          </label>
          <Input
            type="date"
            value={filterTo}
            onChange={(e) => setFilterTo(e.target.value)}
            className="border-white/10 bg-white/5 text-[color:var(--dash-ink)]"
          />
        </div>
        <div className="lg:col-span-4">
          <label className="mb-1 block text-[11px] font-medium text-[color:var(--dash-muted)]">
            Pencarian
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--dash-muted)]" />
            <Input
              placeholder="Dokter / tindakan / RS / klaim / perawat…"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="border-white/10 bg-white/5 pl-10 text-[color:var(--dash-ink)]"
            />
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-2 lg:col-span-2">
          <Button
            onClick={setToday}
            variant="secondary"
            className="border border-white/10 bg-white/10 text-[color:var(--dash-ink)] hover:bg-white/15"
          >
            Hari Ini
          </Button>
          <Button
            onClick={setThisMonth}
            variant="secondary"
            className="border border-white/10 bg-white/10 text-[color:var(--dash-ink)] hover:bg-white/15"
          >
            Bulan Ini
          </Button>
          <Button
            onClick={resetFilter}
            variant="secondary"
            className="border border-white/10 bg-white/5 text-[color:var(--dash-muted)] hover:bg-white/10"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset
          </Button>
        </div>
      </div>

      {/* SUMMARY */}
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-[10px] uppercase tracking-[0.3em] text-[color:var(--dash-muted)]">
            Total (Filter)
          </p>
          <div className="mt-2 flex items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 text-[11px] text-[color:var(--dash-muted)]">
              <Wallet className="h-4 w-4" />
              <span>Jumlah biaya</span>
            </div>
            <p className="text-lg font-semibold text-emerald-300 tabular-nums">
              {formatCurrency(totalFiltered)}
            </p>
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-[10px] uppercase tracking-[0.3em] text-[color:var(--dash-muted)]">
            Data
          </p>
          <div className="mt-2 flex items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 text-[11px] text-[color:var(--dash-muted)]">
              <ArchiveX className="h-4 w-4" />
              <span>Hasil filter</span>
            </div>
            <p className="text-lg font-semibold tabular-nums">
              {filteredData.length}
            </p>
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-[10px] uppercase tracking-[0.3em] text-[color:var(--dash-muted)]">
            Rentang
          </p>
          <div className="mt-2 flex items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 text-[11px] text-[color:var(--dash-muted)]">
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
        <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-10 text-center text-sm text-[color:var(--dash-muted)]">
          <ArchiveX className="mx-auto mb-4 h-12 w-12 opacity-80" />
          Tidak ada data sesuai filter.
        </div>
      ) : (
        <>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-sm text-[color:var(--dash-muted)]">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold">
                <Users className="h-4 w-4" />
                {filteredData.length} data
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold">
                <FileDown className="h-4 w-4" />
                Export: {exportTag()}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-[11px] font-medium text-[color:var(--dash-muted)]">
                Rows
              </label>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="h-9 rounded-md border border-white/10 bg-white/5 px-3 text-sm text-[color:var(--dash-ink)]"
              >
                {[10, 25, 50, 100].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-3 overflow-auto rounded-2xl border border-white/10 bg-white/5">
            <div className="max-h-[560px] overflow-auto">
              <Table className="min-w-[980px]">
                <TableHeader>
                  <TableRow className="bg-[var(--dash-surface-strong)]">
                    <TableHead className="sticky top-0 z-10 bg-[var(--dash-surface-strong)]">
                      Tanggal
                    </TableHead>
                    <TableHead className="sticky top-0 z-10 bg-[var(--dash-surface-strong)]">
                      Dokter
                    </TableHead>
                    <TableHead className="sticky top-0 z-10 bg-[var(--dash-surface-strong)]">
                      Tindakan
                    </TableHead>
                    <TableHead className="sticky top-0 z-10 bg-[var(--dash-surface-strong)]">
                      Rumah Sakit
                    </TableHead>
                    <TableHead className="sticky top-0 z-10 bg-[var(--dash-surface-strong)] text-right">
                      Jumlah
                    </TableHead>
                    <TableHead className="sticky top-0 z-10 bg-[var(--dash-surface-strong)]">
                      Klaim
                    </TableHead>
                    <TableHead className="sticky top-0 z-10 bg-[var(--dash-surface-strong)]">
                      Perawat
                    </TableHead>
                    <TableHead className="sticky top-0 z-10 bg-[var(--dash-surface-strong)] text-center">
                      Aksi
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedData.map((item) => {
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
                      <TableRow
                        key={item.id}
                        className="border-white/10 hover:bg-white/5"
                      >
                        <TableCell className="tabular-nums">
                          <span className="inline-flex items-center gap-2">
                            <CalendarDays className="h-4 w-4 text-[color:var(--dash-muted)]" />
                            {item.date}
                          </span>
                        </TableCell>
                        <TableCell className="max-w-[220px]">
                          <span className="inline-flex items-center gap-2">
                            <UserRound className="h-4 w-4 text-[color:var(--dash-muted)]" />
                            <span className="truncate">{item.dokter}</span>
                          </span>
                        </TableCell>
                        <TableCell className="whitespace-normal">
                          <span className="inline-flex items-start gap-2">
                            <Stethoscope className="mt-0.5 h-4 w-4 text-[color:var(--dash-muted)]" />
                            <span className="max-w-[340px] break-words">
                              {item.tindakanOperasi}
                            </span>
                          </span>
                        </TableCell>
                        <TableCell className="whitespace-normal">
                          <span className="inline-flex items-start gap-2">
                            <Hospital className="mt-0.5 h-4 w-4 text-[color:var(--dash-muted)]" />
                            <span className="max-w-[260px] break-words">
                              {item.rumahSakit}
                            </span>
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-semibold tabular-nums">
                          {formatCurrency(Number(item.jumlah))}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold ${klaimTone}`}
                          >
                            {item.klaim}
                          </span>
                        </TableCell>
                        <TableCell className="whitespace-normal" title={item.namaPerawat}>
                          <span className="inline-flex items-start gap-2">
                            <Users className="mt-0.5 h-4 w-4 text-[color:var(--dash-muted)]" />
                            <span className="break-words">
                              {nursePrimary}{" "}
                              {nurseExtra && (
                                <span className="ml-1 text-[11px] font-semibold text-[color:var(--dash-muted)]">
                                  {nurseExtra}
                                </span>
                              )}
                            </span>
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="inline-flex items-center gap-1">
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
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* PAGINATION */}
          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="text-sm text-[color:var(--dash-muted)]">
              Halaman <span className="tabular-nums">{pageSafe + 1}</span> dari{" "}
              <span className="tabular-nums">{pageCount}</span>
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                className="border border-white/10 bg-white/10 text-[color:var(--dash-ink)] hover:bg-white/15"
                disabled={pageSafe === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Prev
              </Button>
              <Button
                variant="secondary"
                className="border border-white/10 bg-white/10 text-[color:var(--dash-ink)] hover:bg-white/15"
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
