"use client";

import { useEffect, useMemo, useState, ChangeEvent } from "react";
import {
  Edit,
  Trash2,
  FileText,
  Download,
  X,
  FileDown,
  Wallet,
  ArchiveX,
  Loader2,
  ChevronDown,
  ChevronUp,
  CalendarDays,
  StickyNote,
  Tags,
  Coins,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { motion } from "framer-motion";
import Image from "next/image";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import ExpenseForm from "@/components/ExepenseForm";
import { storage } from "@/lib/firebase/client";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useTableUiConfig } from "@/hooks/use-table-ui-config";
import { CurrencyInput } from "@/components/CurencyInput";

import {
  Table,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Transaction {
  id: string;
  tanggal: string;
  jenisBiaya: string;
  keterangan: string;
  jumlah: number;
  klaim: string;
  fileUrl?: string;
  sumberBiaya?: string | null;
}

interface TransactionManagerProps {
  transactions: Transaction[];
  isLoading: boolean;
  onDataChange: () => Promise<void>;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);

export default function TransactionManager({
  transactions,
  isLoading,
  onDataChange,
}: TransactionManagerProps) {
  const { config: tableUi } = useTableUiConfig();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [transactionToEdit, setTransactionToEdit] =
    useState<Transaction | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [newPhotoFile, setNewPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isPhotoProcessing, setIsPhotoProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [tablePage, setTablePage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [rowsPerPageTouched, setRowsPerPageTouched] = useState(false);
  const rowsPerPageOptions = tableUi.transactionRowsPerPageOptions;
  const [expandedMobileId, setExpandedMobileId] = useState<string | null>(null);

  const tablePageCount = Math.max(
    1,
    Math.ceil(transactions.length / rowsPerPage)
  );

  const paginatedTransactions = useMemo(() => {
    const start = (tablePage - 1) * rowsPerPage;
    return transactions.slice(start, start + rowsPerPage);
  }, [transactions, tablePage, rowsPerPage]);

  const totalJumlah = useMemo(() => {
    return transactions.reduce((sum, tx) => sum + Number(tx.jumlah), 0);
  }, [transactions]);

  const handleExportExcel = () => {
    const dataToExport = transactions
      .slice()
      .sort((a, b) => a.tanggal.localeCompare(b.tanggal))
      .map((tx) => ({
      Tanggal: tx.tanggal,
      Keterangan: tx.keterangan,
      "Jenis Biaya": tx.jenisBiaya,
      Jumlah: Number(tx.jumlah),
      Klaim: tx.klaim,
      }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data Transaksi");
    worksheet["!cols"] = [
      { wch: 12 },
      { wch: 40 },
      { wch: 20 },
      { wch: 15 },
      { wch: 15 },
    ];
    XLSX.writeFile(workbook, "Laporan Transaksi.xlsx");
  };

  const handleExportPdf = () => {
    const doc = new jsPDF();
    doc.text("Laporan Riwayat Transaksi", 14, 16);
    const sorted = transactions.slice().sort((a, b) => a.tanggal.localeCompare(b.tanggal));
    autoTable(doc, {
      head: [["Tanggal", "Keterangan", "Jenis Biaya", "Jumlah", "Klaim"]],
      body: sorted.map((tx) => [
        tx.tanggal,
        tx.keterangan,
        tx.jenisBiaya,
        formatCurrency(Number(tx.jumlah)),
        tx.klaim,
      ]),
      startY: 22,
      headStyles: { fillColor: [38, 145, 158] },
    });
    doc.save("Laporan Transaksi.pdf");
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus transaksi ini?"))
      return;
    await fetch(`/api/transactions/${id}`, { method: "DELETE" });
    await onDataChange();
  };

  const handleOpenEditModal = (tx: Transaction) => {
    setTransactionToEdit({ ...tx });
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setTransactionToEdit(null);
  };

  const handleUpdateTransaction = async () => {
    if (!transactionToEdit) return;
    setIsSaving(true);
    try {
      const payload: Transaction = { ...transactionToEdit, jumlah: Number(transactionToEdit.jumlah) };
      if (newPhotoFile) {
        setIsPhotoProcessing(true);
        const storageRef = ref(
          storage,
          `berkas/${transactionToEdit.id}_${Date.now()}_${newPhotoFile.name}`
        );
        const snapshot = await uploadBytes(storageRef, newPhotoFile);
        payload.fileUrl = await getDownloadURL(snapshot.ref);
        setIsPhotoProcessing(false);
      }

      await fetch(`/api/transactions/${transactionToEdit.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      handleCloseEditModal();
      await onDataChange();
    } finally {
      setIsSaving(false);
      setNewPhotoFile(null);
    }
  };

  const handleEditJumlahChange = (value: number | undefined) => {
    if (!transactionToEdit) return;
    setTransactionToEdit((prev) => (prev ? { ...prev, jumlah: value ?? 0 } : prev));
  };

  const handleEditFormChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    if (!transactionToEdit) return;
    const { name, value } = e.target;
    setTransactionToEdit((prev) => (prev ? { ...prev, [name]: value } : null));
  };

  useEffect(() => {
    if (!transactionToEdit) {
      setPhotoPreview(null);
      setNewPhotoFile(null);
      return;
    }
    setPhotoPreview(transactionToEdit.fileUrl || null);
    setNewPhotoFile(null);
  }, [transactionToEdit]);

  useEffect(() => {
    return () => {
      if (photoPreview && photoPreview.startsWith("blob:")) {
        URL.revokeObjectURL(photoPreview);
      }
    };
  }, [photoPreview]);

  const handlePhotoSelection = (e: ChangeEvent<HTMLInputElement>) => {
    if (!transactionToEdit) return;
    if (photoPreview && photoPreview.startsWith("blob:")) {
      URL.revokeObjectURL(photoPreview);
    }
    const file = e.target.files?.[0] ?? null;
    setNewPhotoFile(file);
    if (file && file.type.startsWith("image/")) {
      setPhotoPreview(URL.createObjectURL(file));
    } else {
      setPhotoPreview(transactionToEdit.fileUrl || null);
    }
  };

  const deleteTransactionPhoto = async (id: string) => {
    const response = await fetch("/api/transactions/photo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    return response.ok;
  };

  const handleDeletePhoto = async () => {
    if (!transactionToEdit?.fileUrl) return;
    setIsPhotoProcessing(true);
    try {
      const success = await deleteTransactionPhoto(transactionToEdit.id);
      if (success) {
        setTransactionToEdit((prev) =>
          prev ? { ...prev, fileUrl: "" } : prev
        );
        setPhotoPreview(null);
        setNewPhotoFile(null);
      }
    } finally {
      setIsPhotoProcessing(false);
    }
  };

  useEffect(() => {
    setTablePage(1);
  }, [transactions]);

  useEffect(() => {
    const options = tableUi.transactionRowsPerPageOptions;
    if (!options.length) return;

    const desired = tableUi.transactionRowsPerPageDefault;
    const fallback = options[0];
    const next = options.includes(desired) ? desired : fallback;

    if (!rowsPerPageTouched) {
      if (rowsPerPage !== next) {
        setRowsPerPage(next);
        setTablePage(1);
      }
      return;
    }

    if (!options.includes(rowsPerPage)) {
      setRowsPerPage(next);
      setTablePage(1);
    }
  }, [
    tableUi.transactionRowsPerPageDefault,
    tableUi.transactionRowsPerPageOptions,
    rowsPerPage,
    rowsPerPageTouched,
  ]);

  const handleRowsPerPageChange = (value: number) => {
    setRowsPerPageTouched(true);
    setRowsPerPage(value);
    setTablePage(1);
  };

  const startEntry =
    transactions.length === 0 ? 0 : (tablePage - 1) * rowsPerPage + 1;
  const endEntry = Math.min(transactions.length, tablePage * rowsPerPage);

  const hasEntries = transactions.length > 0;
  const latestTransactions = hasEntries ? transactions.slice(0, 3) : [];

  const rangeLabel =
    transactions.length === 0
      ? "Belum ada entri"
      : `Menampilkan ${startEntry}-${endEntry} dari ${transactions.length} entri`;

  const renderRowsPerPageSelector = () => (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className="text-[9px] uppercase tracking-[0.3em] text-(--dash-muted)">
        Per halaman
      </span>
      <div className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-1">
        {rowsPerPageOptions.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => handleRowsPerPageChange(value)}
            aria-pressed={rowsPerPage === value}
            className={`rounded-full px-3 py-1 text-[11px] font-semibold transition ${
              rowsPerPage === value
                ? "bg-cyan-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.45)]"
                : "text-(--dash-muted) hover:bg-white/10"
            }`}
          >
            {value}
          </button>
        ))}
      </div>
    </div>
  );

  const paginationControls = (
    <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
      <div className="flex flex-wrap items-center gap-4">
        <span className="text-[11px] text-white/80">{rangeLabel}</span>
        {renderRowsPerPageSelector()}
      </div>
      <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-white/70">
        <button
          onClick={() => setTablePage((prev) => Math.max(1, prev - 1))}
          disabled={tablePage === 1}
          className="rounded-full px-3 py-1 transition hover:bg-white/10 disabled:opacity-40"
        >
          Prev
        </button>
        <span>
          {tablePage} / {tablePageCount}
        </span>
        <button
          onClick={() => setTablePage((prev) => Math.min(tablePageCount, prev + 1))}
          disabled={tablePage === tablePageCount}
          className="rounded-full px-3 py-1 transition hover:bg-white/10 disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );

  const paginationControlsMobile = (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center justify-center gap-3 text-[11px] text-(--dash-muted)">
        <button
          onClick={() => setTablePage((prev) => Math.max(1, prev - 1))}
          disabled={tablePage === 1}
          className="rounded-full border border-white/10 px-3 py-1 text-[11px] transition hover:border-white/30 disabled:opacity-50"
        >
          Prev
        </button>
        <span>
          {tablePage} / {tablePageCount}
        </span>
        <button
          onClick={() => setTablePage((prev) => Math.min(tablePageCount, prev + 1))}
          disabled={tablePage === tablePageCount}
          className="rounded-full border border-white/10 px-3 py-1 text-[11px] transition hover:border-white/30 disabled:opacity-50"
        >
          Next
        </button>
      </div>
      {renderRowsPerPageSelector()}
    </div>
  );

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-16">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <motion.div
      className="premium-card space-y-6 overflow-hidden rounded-3xl border border-white/10 bg-linear-to-b from-slate-900/90 via-slate-950/80 to-slate-950 p-6 text-white shadow-[0_20px_60px_rgba(2,6,23,0.45)]"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.4em] text-(--dash-muted)">
            Riwayat Transaksi
          </p>
          <h2 className="text-2xl font-semibold text-white">Catatan Pengeluaran</h2>
          <p className="text-sm text-(--dash-muted)">
            {transactions.length} transaksi terakhir siap direkap dan dicetak.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ExpenseForm onTransactionAdded={onDataChange} />
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExportExcel()}
            disabled={!hasEntries}
            className="border-slate-200 bg-white/70 text-slate-800 hover:bg-white hover:border-slate-300 dark:border-white/20 dark:bg-white/5 dark:text-white/80 dark:hover:border-white/40"
          >
            <FileDown className="h-4 w-4 mr-2" /> Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExportPdf()}
            disabled={!hasEntries}
            className="border-slate-200 bg-white/70 text-slate-800 hover:bg-white hover:border-slate-300 dark:border-white/20 dark:bg-white/5 dark:text-white/80 dark:hover:border-white/40"
          >
            <FileDown className="h-4 w-4 mr-2" /> PDF
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-inner">
          <div className="flex items-center gap-3">
            <Wallet className="h-5 w-5 text-cyan-300" />
            <p className="text-[10px] uppercase tracking-[0.3em] text-(--dash-muted)">Total Pengeluaran</p>
          </div>
          <p className="mt-3 text-3xl font-semibold text-white">{formatCurrency(totalJumlah)}</p>
          <p className="mt-2 text-[11px] text-(--dash-muted)">
            {hasEntries ? `${transactions.length} transaksi` : "Tidak ada data"}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-[10px] uppercase tracking-[0.3em] text-(--dash-muted)">Entri terbaru</p>
          {latestTransactions.length === 0 ? (
            <p className="text-sm text-(--dash-muted) mt-2">Tambahkan biaya untuk melihat ringkasan.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm text-white/90">
              {latestTransactions.map((tx) => (
                <li key={tx.id} className="flex items-center justify-between">
                  <span className="font-medium">{tx.tanggal}</span>
                  <span className="text-(--dash-muted)">{formatCurrency(Number(tx.jumlah))}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="hidden lg:block">
        {paginationControls}
        <div
          className="overflow-auto"
          style={{ maxHeight: `${tableUi.transactionDesktopMaxHeightPx}px` }}
        >
          <Table className="min-w-full text-sm">
            <TableHeader>
              <TableRow className="bg-slate-900 text-left text-white">
                <TableHead className="py-3">Tanggal</TableHead>
                <TableHead className="py-3">Keterangan</TableHead>
                <TableHead className="py-3">Jenis Biaya</TableHead>
                <TableHead className="py-3 text-center">Jumlah</TableHead>
                <TableHead className="py-3">Klaim</TableHead>
                <TableHead className="py-3 text-center">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <tbody>
              {paginatedTransactions.map((tx) => (
                <tr
                  key={tx.id}
                  className="border-b border-white/10 transition-colors hover:border-cyan-500/40 hover:bg-white/5"
                >
                  <TableCell className="py-3 px-3">
                    <span className="inline-flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-cyan-200/70" />
                      <span>{tx.tanggal}</span>
                    </span>
                  </TableCell>
                  <TableCell className="py-3 px-3">
                    <span className="inline-flex items-center gap-2">
                      <StickyNote className="h-4 w-4 text-cyan-200/70" />
                      <span className="line-clamp-2 whitespace-pre-line">{tx.keterangan}</span>
                    </span>
                  </TableCell>
                  <TableCell className="py-3 px-3">
                    <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold text-(--dash-muted)">
                      <Tags className="mr-2 h-3.5 w-3.5 text-cyan-200/70" />
                      {tx.jenisBiaya}
                    </span>
                  </TableCell>
                  <TableCell className="py-3 px-3 text-center font-mono text-white/80">
                    <span className="inline-flex items-center justify-center gap-2">
                      <Coins className="h-4 w-4 text-cyan-200/70" />
                      <span>{formatCurrency(Number(tx.jumlah))}</span>
                    </span>
                  </TableCell>
                  <TableCell className="py-3 px-3">
                    <span className="inline-flex items-center gap-2">
                      {String(tx.klaim).toLowerCase() === "ya" ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                      ) : String(tx.klaim).toLowerCase() === "tidak" ? (
                        <XCircle className="h-4 w-4 text-rose-300" />
                      ) : (
                        <span className="h-2 w-2 rounded-full bg-white/30" />
                      )}
                      <span>{tx.klaim || "-"}</span>
                    </span>
                  </TableCell>
                  <TableCell className="py-3 px-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <TooltipProvider>
                        {tx.fileUrl && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setPreviewImageUrl(tx.fileUrl!)}
                                className="text-cyan-300 hover:text-cyan-200"
                              >
                                <FileText className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Lihat Berkas</TooltipContent>
                          </Tooltip>
                        )}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenEditModal(tx)}
                              className="text-yellow-300 hover:text-yellow-200"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit Transaksi</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteTransaction(tx.id)}
                              className="text-rose-300 hover:text-rose-200"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Hapus Transaksi</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </TableCell>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      </div>

      <div
        className="space-y-3 lg:hidden overflow-auto pr-1"
        style={{ maxHeight: `${tableUi.transactionMobileMaxHeightPx}px` }}
      >
        {paginatedTransactions.map((tx) => {
          const isExpanded = expandedMobileId === tx.id;
          const toggleExpanded = () =>
            setExpandedMobileId((prev) => (prev === tx.id ? null : tx.id));

          return (
            <article
              key={tx.id}
              className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-[0_12px_30px_rgba(2,6,23,0.45)] shadow-cyan-500/10 transition-transform duration-200 hover:-translate-y-0.5 hover:border-cyan-500/40 hover:bg-white/10"
            >
                <div className="sticky top-0 z-10 flex items-center justify-between gap-4 bg-linear-to-r from-slate-950/80 to-slate-900/80 px-4 py-3 backdrop-blur">
                <div>
                  <p className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-(--dash-muted)">
                    <CalendarDays className="h-4 w-4 text-cyan-200/70" />
                    <span>{tx.tanggal}</span>
                  </p>
                  <p className="mt-1 inline-flex items-center gap-2 text-lg font-semibold text-white">
                    <StickyNote className="h-4 w-4 text-cyan-200/70" />
                    <span>{tx.keterangan}</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-white">
                    <span className="inline-flex items-center gap-2">
                      <Coins className="h-4 w-4 text-cyan-200/70" />
                      <span>{formatCurrency(Number(tx.jumlah))}</span>
                    </span>
                  </p>
                  <p className="mt-1 inline-flex items-center gap-2 text-[11px] text-white/60">
                    <Tags className="h-3.5 w-3.5 text-cyan-200/60" />
                    <span>{tx.jenisBiaya}</span>
                  </p>
                </div>
                <button
                  onClick={toggleExpanded}
                  aria-expanded={isExpanded}
                  className="rounded-full border border-white/10 bg-white/10 p-2 text-white/70 transition hover:border-white/20 hover:text-white"
                >
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>
              </div>
              <div
                className={`overflow-hidden transition-all duration-300 ${
                  isExpanded ? "max-h-[520px] px-4 py-3" : "max-h-0 px-4"
                }`}
              >
                <div className="grid gap-2 text-[12px] text-white/70">
                  <div className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2">
                    <span className="font-semibold text-white/90">Jenis Biaya</span>
                    <span>{tx.jenisBiaya}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2">
                    <span className="font-semibold text-white/90">Klaim</span>
                    <span>{tx.klaim || "-"}</span>
                  </div>
                  <div className="flex items-start justify-between rounded-xl bg-white/5 px-3 py-2">
                    <span className="font-semibold text-white/90">Detail</span>
                    <span className="max-w-[60%] text-right text-sm text-white/70">
                      {tx.keterangan}
                    </span>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap justify-end gap-2">
                  {tx.fileUrl && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setPreviewImageUrl(tx.fileUrl!)}
                      className="rounded-full bg-white/5 text-cyan-300 hover:text-cyan-200"
                    >
                      <FileText className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleOpenEditModal(tx)}
                    className="rounded-full bg-white/5 text-yellow-300 hover:text-yellow-200"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteTransaction(tx.id)}
                    className="rounded-full bg-white/5 text-rose-300 hover:text-rose-200"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </article>
          );
        })}
        {paginationControlsMobile}
      </div>

      {!hasEntries && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-sm text-(--dash-muted)">
          <ArchiveX className="mx-auto mb-3 h-10 w-10 text-white/60" />
          <p className="font-semibold text-white/90">Belum ada transaksi</p>
          <p>Tambah data biaya agar riwayat muncul di sini.</p>
        </div>
      )}

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[700px] border-slate-200 bg-white text-slate-900 shadow-2xl dark:border-white/10 dark:bg-slate-950 dark:text-slate-100">
          <DialogHeader>
            <DialogTitle className="text-cyan-700 dark:text-cyan-300">
              Edit Transaksi
            </DialogTitle>
          </DialogHeader>
          {transactionToEdit && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="tanggal">Tanggal</Label>
                  <Input
                    id="tanggal"
                    name="tanggal"
                    type="date"
                    value={transactionToEdit.tanggal}
                    onChange={handleEditFormChange}
                    className="bg-white border-slate-200 dark:bg-slate-900/60 dark:border-white/10"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="jenisBiaya">Jenis Biaya</Label>
                  <Select
                    value={transactionToEdit.jenisBiaya}
                    onValueChange={(value) =>
                      setTransactionToEdit((prev) =>
                        prev ? { ...prev, jenisBiaya: value } : prev
                      )
                    }
                  >
                    <SelectTrigger className="w-full bg-white border-slate-200 dark:bg-slate-900/60 dark:border-white/10">
                      <SelectValue placeholder="Pilih jenis biaya" />
                    </SelectTrigger>
                    <SelectContent className="bg-white text-slate-900 border-slate-200 dark:bg-slate-900 dark:text-slate-100 dark:border-white/10">
                      <SelectItem value="Transportasi">Transportasi</SelectItem>
                      <SelectItem value="Cargo">Cargo</SelectItem>
                      <SelectItem value="Meals Metting">Meals Metting</SelectItem>
                      {transactionToEdit.jenisBiaya &&
                      !["Transportasi", "Cargo", "Meals Metting"].includes(
                        transactionToEdit.jenisBiaya
                      ) ? (
                        <SelectItem value={transactionToEdit.jenisBiaya}>
                          Lainnya: {transactionToEdit.jenisBiaya}
                        </SelectItem>
                      ) : null}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="keterangan">Keterangan</Label>
                <Textarea
                  id="keterangan"
                  name="keterangan"
                  value={transactionToEdit.keterangan}
                  onChange={handleEditFormChange}
                  className="bg-white border-slate-200 dark:bg-slate-900/60 dark:border-white/10"
                />
              </div>

              <div className="grid gap-2">
                <Label>Foto Berkas</Label>
                {photoPreview ? (
                  <div className="relative aspect-video w-full max-w-md overflow-hidden rounded-lg border border-white/10 bg-black">
                    <Image
                      src={photoPreview}
                      alt="Preview berkas"
                      fill
                      sizes="(max-width: 640px) 90vw, 60vw"
                      style={{ objectFit: "contain" }}
                      className="rounded-lg"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDeletePhoto}
                      disabled={isPhotoProcessing}
                      className="absolute top-2 right-2 rounded-full border border-white/20 bg-black/60"
                    >
                      {isPhotoProcessing ? "Menghapus..." : "Hapus Foto"}
                    </Button>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">
                    Belum ada foto terlampir.
                  </p>
                )}
                <Input
                  id="file-upload"
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoSelection}
                  className="text-slate-500 file:rounded-md file:border-0 file:bg-cyan-600 file:px-3 file:py-1 file:text-white hover:file:bg-cyan-700 dark:text-slate-400 dark:file:bg-cyan-500 dark:hover:file:bg-cyan-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="jumlah">Jumlah (Rp)</Label>
                  <CurrencyInput
                    id="jumlah"
                    placeholder="1.000.000"
                    value={transactionToEdit.jumlah}
                    onValueChange={handleEditJumlahChange}
                    className="bg-white border-slate-200 dark:bg-slate-900/60 dark:border-white/10"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="klaim">Klaim</Label>
                  <Input
                    type="text"
                    id="klaim"
                    name="klaim"
                    value={transactionToEdit.klaim}
                    onChange={handleEditFormChange}
                    className="bg-white border-slate-200 dark:bg-slate-900/60 dark:border-white/10"
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseEditModal}>
              Batal
            </Button>
            <Button
              onClick={handleUpdateTransaction}
              className="bg-cyan-600 text-white hover:bg-cyan-700 dark:bg-cyan-500 dark:hover:bg-cyan-400"
              disabled={isSaving || isPhotoProcessing}
            >
              {isSaving ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!previewImageUrl}
        onOpenChange={(isOpen) => !isOpen && setPreviewImageUrl(null)}
      >
        <DialogContent className="sm:max-w-4xl w-auto bg-transparent border-none shadow-none p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>Pratinjau Gambar Berkas</DialogTitle>
            <DialogDescription>
              Ini adalah pratinjau gambar yang diperbesar dari berkas yang
              dipilih.
            </DialogDescription>
          </DialogHeader>
          <motion.div
            className="relative"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
          >
            <div className="relative w-auto h-auto max-w-[90vw] max-h-[90vh]">
              {previewImageUrl && (
                <Image
                  src={previewImageUrl}
                  alt="Preview Berkas"
                  width={1920}
                  height={1080}
                  style={{
                    width: "auto",
                    height: "auto",
                    maxWidth: "100%",
                    maxHeight: "100%",
                    objectFit: "contain",
                  }}
                  className="rounded-lg shadow-2xl"
                />
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setPreviewImageUrl(null)}
              className="absolute top-2 right-2 bg-black/50 hover:bg-black/75 text-white rounded-full h-8 w-8"
            >
              <X className="h-5 w-5" />
            </Button>
            <Button
              variant="default"
              size="sm"
              className="absolute bottom-4 right-4 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg"
              asChild
            >
              <a href={previewImageUrl || "#"} download>
                <Download className="h-4 w-4 mr-2" />
                Unduh
              </a>
            </Button>
          </motion.div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
