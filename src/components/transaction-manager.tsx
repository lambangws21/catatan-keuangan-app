"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  ChangeEvent,
  PointerEvent,
  WheelEvent,
} from "react";
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
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ChevronsLeft,
  ChevronsRight,
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
import { detectCompanyGroup, companyGroupLabel, type CompanyGroup } from "@/lib/company-groups";
import {
  KLAIM_FILTER_STATUS_OPTIONS,
  KLAIM_STATUS_OPTIONS,
  canMarkKlaimPaid,
  canSubmitKlaim,
  getKlaimDisplayStatus,
  groupReimbursementSummary,
  normalizeKlaimStatus,
  normalizeStoredKlaimStatus,
  type CompanyGroupKey,
  type KlaimDisplayStatus,
  type KlaimStatus,
  type MealsPaymentSource,
} from "@/lib/transactions";

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
  klaimStatus?: KlaimStatus;
  fileUrl?: string;
  fileUrls?: string[];
  sumberBiaya?: string | null;
}

type TransactionGroup = Exclude<CompanyGroup, "all">;

type NormalizedTransaction = Transaction & {
  companyGroup: TransactionGroup;
  klaimStatus: KlaimStatus;
  klaimDisplayStatus: KlaimDisplayStatus;
  fileUrl: string;
  fileUrls: string[];
};

const TRANSACTION_GROUPS: TransactionGroup[] = ["ZB", "NM", "OTHER"];

type NewPhotoSelection = {
  id: string;
  file: File;
  previewUrl: string;
  width: number;
  height: number;
};

type PreviewState = {
  transactionId: string;
  tanggal: string;
  jenisBiaya: string;
  jumlah: number;
  urls: string[];
  index: number;
};

interface TransactionManagerProps {
  transactions: Transaction[];
  saldoData?: Array<{
    id?: string;
    tanggal?: string;
    keterangan: string;
    jumlah: number | string;
  }>;
  reimbursements?: Transaction[];
  isLoading: boolean;
  onDataChange: () => Promise<void>;
  showCreateAction?: boolean;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);

const formatCurrencyCompact = (value: number) => {
  const abs = Math.abs(Number(value));
  if (abs >= 10_000_000) {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(Number(value));
  }
  return formatCurrency(Number(value));
};

const getTransactionPhotoUrls = (tx?: Pick<Transaction, "fileUrl" | "fileUrls"> | null) => {
  if (!tx) return [] as string[];
  const urls = Array.isArray(tx.fileUrls)
    ? tx.fileUrls.filter((url): url is string => typeof url === "string" && url.trim() !== "")
    : [];
  if (tx.fileUrl && tx.fileUrl.trim() && !urls.includes(tx.fileUrl)) {
    urls.unshift(tx.fileUrl);
  }
  return Array.from(new Set(urls));
};

const formatFileSize = (sizeInBytes: number) => {
  if (sizeInBytes < 1024 * 1024) return `${(sizeInBytes / 1024).toFixed(1)} KB`;
  return `${(sizeInBytes / (1024 * 1024)).toFixed(2)} MB`;
};

const loadImageDimensions = (previewUrl: string) =>
  new Promise<{ width: number; height: number }>((resolve) => {
    const image = new window.Image();
    image.onload = () => {
      resolve({ width: image.naturalWidth || 0, height: image.naturalHeight || 0 });
    };
    image.onerror = () => {
      resolve({ width: 0, height: 0 });
    };
    image.src = previewUrl;
  });

const buildPhotoId = (file: File) => `${file.name}:${file.size}:${file.lastModified}`;

export default function TransactionManager({
  transactions,
  saldoData = [],
  reimbursements = [],
  isLoading,
  onDataChange,
  showCreateAction = true,
}: TransactionManagerProps) {
  const { config: tableUi } = useTableUiConfig();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [transactionToEdit, setTransactionToEdit] =
    useState<Transaction | null>(null);
  const [previewState, setPreviewState] = useState<PreviewState | null>(null);
  const [newPhotoFiles, setNewPhotoFiles] = useState<NewPhotoSelection[]>([]);
  const [isPhotoProcessing, setIsPhotoProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [klaimStatusFilter, setKlaimStatusFilter] = useState<"semua" | KlaimDisplayStatus>("semua");
  const [tablePage, setTablePage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [rowsPerPageTouched, setRowsPerPageTouched] = useState(false);
  const rowsPerPageOptions = tableUi.transactionRowsPerPageOptions;
  const [expandedMobileId, setExpandedMobileId] = useState<string | null>(null);
  const [numberMode, setNumberMode] = useState<"compact" | "full">("compact");
  const [previewZoom, setPreviewZoom] = useState(1);
  const [previewOffset, setPreviewOffset] = useState({ x: 0, y: 0 });
  const [isPreviewDragging, setIsPreviewDragging] = useState(false);
  const [quickStatusUpdatingId, setQuickStatusUpdatingId] = useState<string | null>(null);
  const previewDragStartRef = useRef<{ x: number; y: number } | null>(null);

  const normalizedTransactions = useMemo<NormalizedTransaction[]>(
    () =>
      transactions.map((tx) => {
        const fileUrls = getTransactionPhotoUrls(tx);
        const normalizedTx = {
          ...tx,
          fileUrls,
          fileUrl: fileUrls[0] || "",
          klaimStatus: normalizeKlaimStatus(tx.klaimStatus),
          companyGroup: detectCompanyGroup(tx),
        };
        return {
          ...normalizedTx,
          klaimDisplayStatus: getKlaimDisplayStatus(normalizedTx),
        };
      }),
    [transactions]
  );

  const normalizedReimbursements = useMemo<NormalizedTransaction[]>(
    () =>
      reimbursements.map((tx) => {
        const fileUrls = getTransactionPhotoUrls(tx);
        const normalizedTx = {
          ...tx,
          fileUrls,
          fileUrl: fileUrls[0] || "",
          klaimStatus: normalizeKlaimStatus(tx.klaimStatus),
          companyGroup: detectCompanyGroup(tx),
        };
        return {
          ...normalizedTx,
          klaimDisplayStatus: getKlaimDisplayStatus(normalizedTx),
        };
      }),
    [reimbursements]
  );

  const filteredTransactions = useMemo(() => {
    if (klaimStatusFilter === "semua") return normalizedTransactions;
    return normalizedTransactions.filter(
      (tx) => tx.klaimDisplayStatus === klaimStatusFilter
    );
  }, [klaimStatusFilter, normalizedTransactions]);

  const filteredReimbursements = useMemo(() => {
    if (klaimStatusFilter === "semua") return normalizedReimbursements;
    return normalizedReimbursements.filter(
      (tx) => tx.klaimDisplayStatus === klaimStatusFilter
    );
  }, [klaimStatusFilter, normalizedReimbursements]);

  const filteredExportTransactions = useMemo(
    () =>
      [...filteredTransactions, ...filteredReimbursements].sort((a, b) =>
        a.tanggal.localeCompare(b.tanggal)
      ),
    [filteredTransactions, filteredReimbursements]
  );

  const tablePageCount = Math.max(
    1,
    Math.ceil(filteredTransactions.length / rowsPerPage)
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem("transaction-manager:number-mode:v1");
    if (raw === "compact" || raw === "full") setNumberMode(raw);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("transaction-manager:number-mode:v1", numberMode);
  }, [numberMode]);

  const paginatedTransactions = useMemo(() => {
    const start = (tablePage - 1) * rowsPerPage;
    return filteredTransactions.slice(start, start + rowsPerPage);
  }, [filteredTransactions, tablePage, rowsPerPage]);

  const totalJumlah = useMemo(() => {
    return filteredTransactions.reduce((sum, tx) => sum + Number(tx.jumlah), 0);
  }, [filteredTransactions]);

  const groupBalanceSummary = useMemo(
    () => groupReimbursementSummary(saldoData, normalizedTransactions),
    [normalizedTransactions, saldoData]
  );

  const groupBalanceReimbursementTotal = useMemo(
    () => groupBalanceSummary.ZB.reimbursementTotal + groupBalanceSummary.NM.reimbursementTotal,
    [groupBalanceSummary]
  );

  const groupedTables = useMemo(() => {
    return TRANSACTION_GROUPS.map((group) => {
      const expenses = filteredTransactions.filter((tx) => tx.companyGroup === group);
      const expenseTotal = expenses.reduce((sum, tx) => sum + Number(tx.jumlah || 0), 0);
      const balance = groupBalanceSummary[group as CompanyGroupKey];

      return {
        group,
        expenses,
        expenseTotal,
        balanceReimbursementTotal: balance.reimbursementTotal,
        saldoTotal: balance.saldoTotal,
      };
    });
  }, [filteredTransactions, groupBalanceSummary]);

  const displayCurrency = useMemo(
    () => (numberMode === "compact" ? formatCurrencyCompact : formatCurrency),
    [numberMode]
  );

  const handleExportExcel = () => {
    const dataToExport = filteredExportTransactions.map((tx) => ({
        Tanggal: tx.tanggal,
        Keterangan: tx.keterangan,
        "Jenis Biaya": tx.jenisBiaya,
        Jumlah: Number(tx.jumlah),
        Klaim: tx.klaim,
        "Status Klaim": tx.klaimDisplayStatus,
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
      { wch: 15 },
    ];
    XLSX.writeFile(workbook, "Laporan Transaksi.xlsx");
  };

  const handleExportPdf = () => {
    const doc = new jsPDF();
    doc.text("Laporan Riwayat Transaksi", 14, 16);
    autoTable(doc, {
      head: [["Tanggal", "Keterangan", "Jenis Biaya", "Jumlah", "Klaim", "Status"]],
      body: filteredExportTransactions.map((tx) => [
        tx.tanggal,
        tx.keterangan,
        tx.jenisBiaya,
        formatCurrency(Number(tx.jumlah)),
        tx.klaim,
        tx.klaimDisplayStatus,
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

  const handleQuickKlaimStatusChange = async (
    tx: Transaction,
    nextStatus: KlaimStatus
  ) => {
    const allowed =
      (nextStatus === "Diajukan" && canSubmitKlaim(tx)) ||
      (nextStatus === "Dibayar" && canMarkKlaimPaid(tx));

    if (!allowed) return;

    setQuickStatusUpdatingId(tx.id);
    try {
      const fileUrls = getTransactionPhotoUrls(tx);
      const payload: Transaction = {
        ...tx,
        jumlah: Number(tx.jumlah),
        fileUrls,
        fileUrl: fileUrls[0] || "",
        klaimStatus: normalizeStoredKlaimStatus({ ...tx, klaimStatus: nextStatus }),
      };

      const response = await fetch(`/api/transactions/${tx.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Gagal memperbarui status klaim.");
      }

      await onDataChange();
    } catch (error) {
      console.error(error);
    } finally {
      setQuickStatusUpdatingId(null);
    }
  };

  const handleOpenEditModal = (tx: Transaction) => {
    const fileUrls = getTransactionPhotoUrls(tx);
    setTransactionToEdit({
      ...tx,
      fileUrls,
      fileUrl: fileUrls[0] || "",
      klaimStatus: normalizeKlaimStatus(tx.klaimStatus),
    });
    setNewPhotoFiles([]);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setNewPhotoFiles((prev) => {
      prev.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
      return [];
    });
    setIsEditModalOpen(false);
    setTransactionToEdit(null);
  };

  const appendSelectedPhotoFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const imageFiles = Array.from(files).filter((file) => file.type.startsWith("image/"));
    if (imageFiles.length === 0) return;

    const existingIds = new Set(newPhotoFiles.map((photo) => photo.id));
    const nextFiles: NewPhotoSelection[] = [];

    for (const file of imageFiles) {
      const id = buildPhotoId(file);
      if (existingIds.has(id)) continue;
      const previewUrl = URL.createObjectURL(file);
      const dimensions = await loadImageDimensions(previewUrl);
      nextFiles.push({
        id,
        file,
        previewUrl,
        width: dimensions.width,
        height: dimensions.height,
      });
      existingIds.add(id);
    }

    if (nextFiles.length === 0) return;
    setNewPhotoFiles((prev) => [...prev, ...nextFiles]);
  };

  const clearNewPhotoFiles = () => {
    setNewPhotoFiles((prev) => {
      prev.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
      return [];
    });
  };

  const handlePhotoSelection = async (e: ChangeEvent<HTMLInputElement>) => {
    await appendSelectedPhotoFiles(e.target.files);
    e.target.value = "";
  };

  const removeNewPhotoFile = (id: string) => {
    setNewPhotoFiles((prev) => {
      const target = prev.find((photo) => photo.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((photo) => photo.id !== id);
    });
  };

  const handleUpdateTransaction = async () => {
    if (!transactionToEdit) return;
    setIsSaving(true);
    try {
      const payload: Transaction = {
        ...transactionToEdit,
        jumlah: Number(transactionToEdit.jumlah),
      };
      const existingPhotoUrls = getTransactionPhotoUrls(transactionToEdit);
      let uploadedPhotoUrls: string[] = [];

      if (newPhotoFiles.length > 0) {
        setIsPhotoProcessing(true);
        uploadedPhotoUrls = await Promise.all(
          newPhotoFiles.map(async (photo, index) => {
            const safeName = photo.file.name.replace(/\s+/g, "-");
            const storageRef = ref(
              storage,
              `berkas/${transactionToEdit.id}_${Date.now()}_${index + 1}_${safeName}`
            );
            const metadata = photo.file.type
              ? { contentType: photo.file.type }
              : undefined;
            const snapshot = await uploadBytes(storageRef, photo.file, metadata);
            return getDownloadURL(snapshot.ref);
          })
        );
        setIsPhotoProcessing(false);
      }

      const mergedPhotoUrls = [...existingPhotoUrls, ...uploadedPhotoUrls];
      payload.fileUrls = mergedPhotoUrls;
      payload.fileUrl = mergedPhotoUrls[0] || "";
      payload.klaimStatus = normalizeStoredKlaimStatus(payload);

      await fetch(`/api/transactions/${transactionToEdit.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      handleCloseEditModal();
      await onDataChange();
    } finally {
      setIsSaving(false);
      clearNewPhotoFiles();
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

  const deleteTransactionPhoto = async (id: string, photoUrl?: string) => {
    const response = await fetch("/api/transactions/photo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        photoUrl,
      }),
    });
    return response.ok;
  };

  const extractFilenameFromStorageUrl = (url: string) => {
    try {
      const parsed = new URL(url);
      const storagePathMatch = parsed.pathname.match(/\/o\/(.+)$/);
      if (storagePathMatch?.[1]) {
        const decodedPath = decodeURIComponent(storagePathMatch[1]);
        const filename = decodedPath.split("/").pop();
        if (filename) return filename;
      }
      const fallback = parsed.pathname.split("/").pop();
      if (fallback) return fallback;
    } catch {
      // ignored
    }
    return `foto-transaksi-${Date.now()}`;
  };

  const buildDownloadFilename = (state: PreviewState) => {
    const sourceUrl = state.urls[state.index];
    const sourceName = extractFilenameFromStorageUrl(sourceUrl);
    const extension = sourceName.includes(".")
      ? sourceName.split(".").pop() || "jpg"
      : "jpg";
    const rawDate = state.tanggal || new Date().toISOString().split("T")[0];
    const category = state.jenisBiaya
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    const amount = Number.isFinite(state.jumlah) ? `_${Math.round(state.jumlah)}` : "";
    return `${rawDate}_${category || "transaksi"}${amount}_${state.index + 1}.${extension}`;
  };

  const handleOpenPreview = (tx: Transaction, index = 0) => {
    const urls = getTransactionPhotoUrls(tx);
    if (urls.length === 0) return;
    const safeIndex = Math.max(0, Math.min(index, urls.length - 1));
    setPreviewState({
      transactionId: tx.id,
      tanggal: tx.tanggal,
      jenisBiaya: tx.jenisBiaya,
      jumlah: Number(tx.jumlah),
      urls,
      index: safeIndex,
    });
    setPreviewZoom(1);
    setPreviewOffset({ x: 0, y: 0 });
    setIsPreviewDragging(false);
  };

  const closePreview = () => {
    setPreviewState(null);
    setPreviewZoom(1);
    setPreviewOffset({ x: 0, y: 0 });
    setIsPreviewDragging(false);
  };

  const handleDownloadOriginalPhoto = async () => {
    if (!previewState) return;
    const currentUrl = previewState.urls[previewState.index];
    try {
      const response = await fetch(currentUrl);
      if (!response.ok) throw new Error("Download gagal");

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = buildDownloadFilename(previewState);
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      window.open(currentUrl, "_blank", "noopener,noreferrer");
    }
  };

  const handlePreviewNext = () => {
    setPreviewState((prev) => {
      if (!prev) return prev;
      const nextIndex = (prev.index + 1) % prev.urls.length;
      return { ...prev, index: nextIndex };
    });
  };

  const handlePreviewPrev = () => {
    setPreviewState((prev) => {
      if (!prev) return prev;
      const nextIndex = (prev.index - 1 + prev.urls.length) % prev.urls.length;
      return { ...prev, index: nextIndex };
    });
  };

  const handlePreviewWheel = (event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const delta = event.deltaY < 0 ? 0.2 : -0.2;
    setPreviewZoom((prev) => Math.min(5, Math.max(1, prev + delta)));
  };

  const handlePreviewPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (previewZoom <= 1) return;
    setIsPreviewDragging(true);
    previewDragStartRef.current = {
      x: event.clientX - previewOffset.x,
      y: event.clientY - previewOffset.y,
    };
  };

  const handlePreviewPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!isPreviewDragging || !previewDragStartRef.current) return;
    setPreviewOffset({
      x: event.clientX - previewDragStartRef.current.x,
      y: event.clientY - previewDragStartRef.current.y,
    });
  };

  const handlePreviewPointerUp = () => {
    setIsPreviewDragging(false);
    previewDragStartRef.current = null;
  };

  useEffect(() => {
    if (previewZoom <= 1) {
      setPreviewOffset({ x: 0, y: 0 });
    }
  }, [previewZoom]);

  const handleDeletePhoto = async (photoUrl?: string) => {
    if (!transactionToEdit) return;
    const existingUrls = getTransactionPhotoUrls(transactionToEdit);
    if (existingUrls.length === 0) return;

    setIsPhotoProcessing(true);
    try {
      const success = await deleteTransactionPhoto(transactionToEdit.id, photoUrl);
      if (success) {
        const nextUrls = photoUrl
          ? existingUrls.filter((url) => url !== photoUrl)
          : [];
        setTransactionToEdit((prev) =>
          prev
            ? {
                ...prev,
                fileUrls: nextUrls,
                fileUrl: nextUrls[0] || "",
              }
            : prev
        );
        setPreviewState((prev) => {
          if (!prev || prev.transactionId !== transactionToEdit.id) return prev;
          if (nextUrls.length === 0) return null;
          const nextIndex = Math.min(prev.index, nextUrls.length - 1);
          return { ...prev, urls: nextUrls, index: nextIndex };
        });
      }
    } finally {
      setIsPhotoProcessing(false);
    }
  };

  useEffect(() => {
    setTablePage(1);
  }, [filteredTransactions.length, klaimStatusFilter]);

  useEffect(() => {
    if (tablePage > tablePageCount) {
      setTablePage(tablePageCount);
    }
  }, [tablePage, tablePageCount]);

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
    filteredTransactions.length === 0 ? 0 : (tablePage - 1) * rowsPerPage + 1;
  const endEntry = Math.min(filteredTransactions.length, tablePage * rowsPerPage);

  const hasEntries = filteredTransactions.length > 0;
  const hasGroupedEntries = hasEntries || filteredReimbursements.length > 0;
  const hasExportEntries = filteredExportTransactions.length > 0;
  const latestTransactions = hasEntries ? filteredTransactions.slice(0, 3) : [];

  const rangeLabel =
    filteredTransactions.length === 0
      ? "Belum ada entri"
      : `Menampilkan ${startEntry}-${endEntry} dari ${filteredTransactions.length} entri`;

  const editExistingPhotoUrls = useMemo(
    () => getTransactionPhotoUrls(transactionToEdit),
    [transactionToEdit]
  );

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

  const transactionToEditClaimable = transactionToEdit
    ? getKlaimDisplayStatus(transactionToEdit) !== "Tidak perlu klaim"
    : false;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-16">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <motion.div
      className="premium-card space-y-5 overflow-hidden rounded-3xl border border-white/10 bg-linear-to-b from-slate-900/90 via-slate-950/80 to-slate-950 p-4 sm:p-6 text-white shadow-[0_20px_60px_rgba(2,6,23,0.45)]"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.4em] text-(--dash-muted)">
            Riwayat Transaksi
          </p>
          <h2 className="text-lg font-semibold text-white sm:text-2xl">Catatan Pengeluaran</h2>
          <p className="text-xs text-(--dash-muted) sm:text-sm">
            {filteredTransactions.length} pengeluaran + {filteredReimbursements.length} reimbursement siap direkap.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {showCreateAction ? <ExpenseForm onTransactionAdded={onDataChange} /> : null}
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExportExcel()}
            disabled={!hasExportEntries}
            className="border-slate-200 bg-white/70 text-slate-800 hover:bg-white hover:border-slate-300 dark:border-white/20 dark:bg-white/5 dark:text-white/80 dark:hover:border-white/40"
          >
            <FileDown className="h-4 w-4 mr-2" /> Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExportPdf()}
            disabled={!hasExportEntries}
            className="border-slate-200 bg-white/70 text-slate-800 hover:bg-white hover:border-slate-300 dark:border-white/20 dark:bg-white/5 dark:text-white/80 dark:hover:border-white/40"
          >
            <FileDown className="h-4 w-4 mr-2" /> PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={() => setNumberMode((prev) => (prev === "compact" ? "full" : "compact"))}
            className="border-white/20 bg-white/5 text-(--dash-ink) hover:bg-white/10"
          >
            Angka: {numberMode === "compact" ? "Ringkas" : "Penuh"}
          </Button>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
        <span className="text-[10px] uppercase tracking-[0.22em] text-(--dash-muted)">
          Filter Status Klaim
        </span>
        <Select
          value={klaimStatusFilter}
          onValueChange={(value) =>
            setKlaimStatusFilter(value as "semua" | KlaimDisplayStatus)
          }
        >
          <SelectTrigger className="h-9 w-[220px] border-white/10 bg-black/20 text-white">
            <SelectValue placeholder="Semua status klaim" />
          </SelectTrigger>
          <SelectContent className="border-white/10 bg-slate-900 text-white">
            <SelectItem value="semua">Semua status</SelectItem>
            {KLAIM_FILTER_STATUS_OPTIONS.map((status) => (
              <SelectItem key={status} value={status}>
                {status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-(--dash-muted)">
          {filteredTransactions.length} pengeluaran, {filteredReimbursements.length} reimbursement
        </span>
      </div>

      <section className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-3 sm:p-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[9px] uppercase tracking-[0.22em] text-(--dash-muted) sm:text-[10px]">
              Rekap per Grup
            </p>
            <h3 className="text-sm font-semibold text-white sm:text-base">
              Saldo, pengeluaran, dan reimbursement
            </h3>
          </div>
          <p className="max-w-md text-[10px] leading-relaxed text-(--dash-muted) sm:text-[11px]">
            Reimbursement dihitung saat pengeluaran grup lebih besar dari saldo grup.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          {groupedTables.filter((item) => item.group !== "OTHER").map((item) => (
            <div
              key={item.group}
              className={`overflow-hidden rounded-2xl border bg-slate-950/45 shadow-[0_14px_40px_rgba(2,6,23,0.28)] ${
                item.group === "ZB"
                  ? "border-sky-400/30"
                  : "border-violet-400/30"
              }`}
            >
              <div
                className={`p-3 sm:p-4 ${
                  item.group === "ZB"
                    ? "bg-sky-500/10"
                    : "bg-violet-500/10"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p
                    className={`text-[10px] uppercase tracking-[0.2em] sm:text-[11px] ${
                      item.group === "ZB"
                        ? "font-black text-sky-100"
                        : "font-black italic text-violet-100"
                    }`}
                  >
                    {companyGroupLabel(item.group)}
                  </p>
                  <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] text-white/70 sm:text-[10px]">
                    {item.expenses.length} transaksi
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <div className="rounded-xl border border-emerald-300/15 bg-emerald-400/10 p-3">
                    <p className="text-[9px] uppercase tracking-[0.16em] text-emerald-100/70">
                      Saldo
                    </p>
                    <p className="mt-1 truncate text-base font-semibold leading-tight text-emerald-100 sm:text-lg">
                      {displayCurrency(item.saldoTotal)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-cyan-300/15 bg-cyan-400/10 p-3">
                    <p className="text-[9px] uppercase tracking-[0.16em] text-cyan-100/70">
                      Pengeluaran
                    </p>
                    <p className="mt-1 truncate text-base font-semibold leading-tight text-cyan-100 sm:text-lg">
                      {displayCurrency(item.expenseTotal)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-amber-300/15 bg-amber-400/10 p-3">
                    <p className="text-[9px] uppercase tracking-[0.16em] text-amber-100/70">
                      Reimburse
                    </p>
                    <p className="mt-1 truncate text-base font-semibold leading-tight text-amber-100 sm:text-lg">
                      {displayCurrency(item.balanceReimbursementTotal)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-white/5 p-3 sm:p-4 shadow-inner">
          <div className="flex min-w-0 items-center gap-3">
            <Wallet className="h-4 w-4 text-cyan-300 sm:h-5 sm:w-5" />
            <p className="line-clamp-1 text-[8px] uppercase tracking-[0.18em] text-(--dash-muted) sm:text-[10px]">Total Pengeluaran</p>
          </div>
          <p className="mt-2 overflow-hidden text-ellipsis whitespace-nowrap text-base font-semibold leading-tight tabular-nums text-white sm:text-xl">{displayCurrency(totalJumlah)}</p>
          <p className="mt-1 text-[9px] text-(--dash-muted) sm:text-[11px]">
            {hasEntries ? `${filteredTransactions.length} transaksi` : "Tidak ada data"}
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-3 sm:p-4 shadow-inner">
          <div className="flex min-w-0 items-center gap-3">
            <Wallet className="h-4 w-4 text-amber-300 sm:h-5 sm:w-5" />
            <p className="line-clamp-1 text-[8px] uppercase tracking-[0.18em] text-(--dash-muted) sm:text-[10px]">Reimbursement Saldo</p>
          </div>
          <p className="mt-2 overflow-hidden text-ellipsis whitespace-nowrap text-base font-semibold leading-tight tabular-nums text-white sm:text-xl">{displayCurrency(groupBalanceReimbursementTotal)}</p>
          <p className="mt-1 text-[9px] text-(--dash-muted) sm:text-[11px]">
            ZB + NM dari kekurangan saldo terhadap pengeluaran
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-3 sm:p-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-linear-to-br from-cyan-500/10 via-transparent to-emerald-400/10" />
          <div className="relative z-10 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[8px] uppercase tracking-[0.18em] text-(--dash-muted) sm:text-[10px]">Entri terbaru</p>
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[9px] text-white/80 sm:text-[10px]">
                {latestTransactions.length} entri
              </span>
            </div>
            {latestTransactions.length === 0 ? (
              <p className="mt-1 text-[11px] text-(--dash-muted) sm:text-sm">Tambahkan biaya untuk melihat ringkasan.</p>
            ) : (
              <ul className="mt-1 space-y-1.5 text-[11px] text-white/90 sm:space-y-2 sm:text-sm">
                {latestTransactions.map((tx) => (
                  <li
                    key={tx.id}
                    className="rounded-lg border border-white/5 bg-white/5 px-2.5 py-1.5 backdrop-blur-sm sm:px-3 sm:py-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[9px] text-(--dash-muted) tabular-nums sm:text-[11px]">{tx.tanggal}</span>
                      <div className="text-[9px] font-semibold text-emerald-200 tabular-nums truncate sm:text-[11px]">
                        {displayCurrency(Number(tx.jumlah))}
                      </div>
                    </div>
                    <p className="mt-0.5 truncate text-[9px] font-medium text-white/85 sm:mt-1 sm:text-[11px]">
                      {tx.jenisBiaya}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <div className="hidden lg:block">
        {paginationControls}
        <div
          className="overflow-auto"
          style={{ maxHeight: `${tableUi.transactionDesktopMaxHeightPx}px` }}
        >
          <Table className="min-w-full text-xs sm:text-sm">
            <TableHeader>
              <TableRow className="bg-slate-900 text-left text-white">
                <TableHead className="py-2 sm:py-3">Tanggal</TableHead>
                <TableHead className="py-2 sm:py-3">Keterangan</TableHead>
                <TableHead className="py-2 sm:py-3">Jenis Biaya</TableHead>
                <TableHead className="py-2 sm:py-3">Grup</TableHead>
                <TableHead className="py-2 sm:py-3 text-center">Jumlah</TableHead>
                <TableHead className="py-2 sm:py-3">Klaim</TableHead>
                <TableHead className="py-2 sm:py-3 text-center">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <tbody>
              {paginatedTransactions.map((tx) => (
                <tr
                  key={tx.id}
                  className="border-b border-white/10 transition-colors hover:border-cyan-500/40 hover:bg-white/5"
                >
                  <TableCell className="py-2 px-2 sm:py-3 sm:px-3">
                    <span className="inline-flex items-center gap-1.5 sm:gap-2">
                      <CalendarDays className="h-4 w-4 text-cyan-200/70" />
                      <span>{tx.tanggal}</span>
                    </span>
                  </TableCell>
                  <TableCell className="py-2 px-2 sm:py-3 sm:px-3">
                    <span className="inline-flex items-center gap-2">
                      <StickyNote className="h-4 w-4 text-cyan-200/70" />
                      <span className="line-clamp-2 whitespace-pre-line">{tx.keterangan}</span>
                    </span>
                  </TableCell>
                  <TableCell className="py-2 px-2 sm:py-3 sm:px-3">
                    <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold text-(--dash-muted)">
                      <Tags className="mr-2 h-3.5 w-3.5 text-cyan-200/70" />
                      {tx.jenisBiaya}
                    </span>
                  </TableCell>
                  <TableCell className="py-2 px-2 sm:py-3 sm:px-3">
                    <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-white/80">
                      {companyGroupLabel(tx.companyGroup)}
                    </span>
                  </TableCell>
                  <TableCell className="py-3 px-3 text-center font-mono text-white/80">
                    <span className="inline-flex items-center justify-center gap-2">
                      <Coins className="h-4 w-4 text-cyan-200/70" />
                      <span>{formatCurrency(Number(tx.jumlah))}</span>
                    </span>
                  </TableCell>
	                  <TableCell className="py-2 px-2 sm:py-3 sm:px-3">
	                    <div className="flex flex-col gap-1">
	                      <span className="inline-flex w-fit items-center rounded-full border border-cyan-400/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] text-cyan-100">
	                        {tx.klaimDisplayStatus}
	                      </span>
	                    </div>
	                  </TableCell>
                  <TableCell className="py-3 px-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <TooltipProvider>
                        {getTransactionPhotoUrls(tx).length > 0 && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleOpenPreview(tx, 0)}
                                className="text-cyan-300 hover:text-cyan-200"
                              >
                                <FileText className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              Lihat {getTransactionPhotoUrls(tx).length} berkas
                            </TooltipContent>
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
	                        {canSubmitKlaim(tx) && (
	                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={quickStatusUpdatingId === tx.id}
                                onClick={() => handleQuickKlaimStatusChange(tx, "Diajukan")}
                                className="h-8 rounded-full border-amber-300/40 bg-amber-400/10 px-3 text-[10px] font-semibold text-amber-100 hover:bg-amber-400/20"
                              >
                                {quickStatusUpdatingId === tx.id ? "..." : "Ajukan"}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Ubah status menjadi Diajukan</TooltipContent>
                          </Tooltip>
                        )}
	                        {canMarkKlaimPaid(tx) && (
	                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={quickStatusUpdatingId === tx.id}
                                onClick={() => handleQuickKlaimStatusChange(tx, "Dibayar")}
                                className="h-8 rounded-full border-emerald-300/40 bg-emerald-400/10 px-3 text-[10px] font-semibold text-emerald-100 hover:bg-emerald-400/20"
                              >
                                {quickStatusUpdatingId === tx.id ? "..." : "Bayar"}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Ubah status menjadi Dibayar</TooltipContent>
                          </Tooltip>
                        )}
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
              <div className="sticky top-0 rounded-3xl z-10 flex items-start justify-between gap-3 bg-linear-to-r from-slate-950/80 to-slate-900/80 px-3 py-2.5 backdrop-blur">
                <div className="min-w-0">
                  <p className="inline-flex items-center gap-1.5 text-[9px] uppercase tracking-[0.18em] text-(--dash-muted)">
                    <CalendarDays className="h-3.5 w-3.5 text-cyan-200/70" />
                    <span>{tx.tanggal}</span>
                  </p>
                  <p className="mt-1 inline-flex items-start gap-1.5 text-sm font-semibold text-white">
                    <StickyNote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-200/70" />
                    <span className="line-clamp-2 wrap-break-word">{tx.keterangan}</span>
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold text-white">
                    <span className="inline-flex items-center gap-1.5">
                      <Coins className="h-3.5 w-3.5 text-cyan-200/70" />
                      <span>{formatCurrency(Number(tx.jumlah))}</span>
                    </span>
                  </p>
                  <p className="mt-0.5 inline-flex items-center gap-1 text-[9px] text-white/60">
                    <Tags className="h-3 w-3 text-cyan-200/60" />
                    <span className="max-w-[92px] truncate">{tx.jenisBiaya}</span>
                  </p>
                </div>
                <button
                  onClick={toggleExpanded}
                  aria-expanded={isExpanded}
                  className="rounded-full border border-white/10 bg-white/10 p-1.5 text-white/70 transition hover:border-white/20 hover:text-white"
                >
                  {isExpanded ? (
                    <ChevronUp className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
              <div
                className={`overflow-hidden transition-all duration-300 ${
                  isExpanded ? "max-h-[520px] px-3 py-2.5" : "max-h-0 px-3"
                }`}
              >
                <div className="grid gap-1.5 text-[11px] text-white/70">
                  <div className="flex items-center justify-between rounded-xl bg-white/5 px-2.5 py-1.5">
                    <span className="font-semibold text-white/90">Jenis Biaya</span>
                    <span>{tx.jenisBiaya}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-white/5 px-2.5 py-1.5">
                    <span className="font-semibold text-white/90">Grup</span>
                    <span>{companyGroupLabel(tx.companyGroup)}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-white/5 px-2.5 py-1.5">
	                    <span className="font-semibold text-white/90">Klaim</span>
	                    <span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] text-cyan-100">
	                      {tx.klaimDisplayStatus}
	                    </span>
	                  </div>
                  <div className="flex items-start justify-between rounded-xl bg-white/5 px-2.5 py-1.5">
                    <span className="font-semibold text-white/90">Detail</span>
                    <span className="max-w-[62%] text-right text-[11px] leading-relaxed text-white/70">
                      {tx.keterangan}
                    </span>
                  </div>
                </div>
                <div className="mt-2.5 flex flex-wrap justify-end gap-1.5">
                  {getTransactionPhotoUrls(tx).length > 0 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenPreview(tx, 0)}
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
	                  {canSubmitKlaim(tx) && (
	                    <Button
                      variant="outline"
                      size="sm"
                      disabled={quickStatusUpdatingId === tx.id}
                      onClick={() => handleQuickKlaimStatusChange(tx, "Diajukan")}
                      className="h-8 rounded-full border-amber-300/40 bg-amber-400/10 px-3 text-[10px] font-semibold text-amber-100 hover:bg-amber-400/20"
                    >
                      Ajukan
                    </Button>
                  )}
	                  {canMarkKlaimPaid(tx) && (
	                    <Button
                      variant="outline"
                      size="sm"
                      disabled={quickStatusUpdatingId === tx.id}
                      onClick={() => handleQuickKlaimStatusChange(tx, "Dibayar")}
                      className="h-8 rounded-full border-emerald-300/40 bg-emerald-400/10 px-3 text-[10px] font-semibold text-emerald-100 hover:bg-emerald-400/20"
                    >
                      Bayar
                    </Button>
                  )}
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

      {!hasGroupedEntries && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-sm text-(--dash-muted)">
          <ArchiveX className="mx-auto mb-3 h-10 w-10 text-white/60" />
          <p className="font-semibold text-white/90">Belum ada transaksi</p>
          <p>Tambah data biaya agar riwayat muncul di sini.</p>
        </div>
      )}

      <Dialog
        open={isEditModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            handleCloseEditModal();
            return;
          }
          setIsEditModalOpen(true);
        }}
      >
        <DialogContent className="sm:max-w-[700px] border-slate-200 bg-white text-slate-900 shadow-2xl dark:border-white/10 dark:bg-slate-950 dark:text-slate-100">
          <DialogHeader>
            <DialogTitle className="text-cyan-700 dark:text-cyan-300">
              Edit Transaksi
            </DialogTitle>
            <DialogDescription className="sr-only">
              Form untuk mengubah data transaksi, termasuk detail biaya, klaim, dan berkas pendukung.
            </DialogDescription>
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
                {editExistingPhotoUrls.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {editExistingPhotoUrls.map((url, index) => (
                      <div
                        key={`${url}-${index}`}
                        className="rounded-lg border border-white/10 bg-black/20 p-2"
                      >
                        <button
                          type="button"
                          className="relative block aspect-4/3 w-full overflow-hidden rounded-md border border-white/10"
                          onClick={() => handleOpenPreview(transactionToEdit, index)}
                        >
                          <Image
                            src={url}
                            alt={`Foto berkas ${index + 1}`}
                            fill
                            unoptimized
                            sizes="(max-width: 640px) 48vw, 24vw"
                            style={{ objectFit: "cover" }}
                            className="rounded-md"
                          />
                        </button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeletePhoto(url)}
                          disabled={isPhotoProcessing}
                          className="mt-2 h-7 w-full border-rose-400/40 text-rose-300 hover:bg-rose-500/10"
                        >
                          Hapus
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">Belum ada foto terlampir.</p>
                )}
                <Input
                  id="file-upload"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoSelection}
                  className="text-slate-500 file:rounded-md file:border-0 file:bg-cyan-600 file:px-3 file:py-1 file:text-white hover:file:bg-cyan-700 dark:text-slate-400 dark:file:bg-cyan-500 dark:hover:file:bg-cyan-400"
                />
                {newPhotoFiles.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs text-cyan-300">
                      {newPhotoFiles.length} foto baru akan ditambahkan saat simpan.
                    </p>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {newPhotoFiles.map((photo) => (
                        <div
                          key={photo.id}
                          className="rounded-lg border border-cyan-400/30 bg-cyan-500/10 p-2"
                        >
                          <div className="relative aspect-4/3 overflow-hidden rounded-md border border-cyan-400/20">
                            <Image
                              src={photo.previewUrl}
                              alt={photo.file.name}
                              fill
                              unoptimized
                              sizes="(max-width: 640px) 48vw, 24vw"
                              style={{ objectFit: "cover" }}
                              className="rounded-md"
                            />
                          </div>
                          <div className="mt-1 text-[10px] text-cyan-100/90">
                            <p className="line-clamp-1">{photo.file.name}</p>
                            <p>
                              {photo.width > 0 && photo.height > 0
                                ? `${photo.width}x${photo.height}`
                                : "resolusi -"}{" "}
                              | {formatFileSize(photo.file.size)}
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeNewPhotoFile(photo.id)}
                            className="mt-1 h-6 w-full text-rose-300 hover:text-rose-200"
                          >
                            Batal
                          </Button>
                        </div>
                      ))}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={clearNewPhotoFiles}
                    >
                      Bersihkan Foto Baru
                    </Button>
                  </div>
                ) : null}
                {editExistingPhotoUrls.length > 0 ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeletePhoto()}
                    disabled={isPhotoProcessing}
                    className="w-fit border-rose-400/40 text-rose-300 hover:bg-rose-500/10"
                  >
                    {isPhotoProcessing ? "Menghapus..." : "Hapus Semua Foto"}
                  </Button>
                ) : null}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
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
                  <Label>Sumber Biaya</Label>
                  <Select
                    value={(transactionToEdit.sumberBiaya as MealsPaymentSource | undefined) ?? "deposit"}
                    onValueChange={(value) =>
                      setTransactionToEdit((prev) => {
                        if (!prev) return prev;
                        const nextSource = value as MealsPaymentSource;
                        return {
                          ...prev,
                          sumberBiaya: nextSource,
                          klaimStatus:
                            nextSource === "mandiri"
                              ? normalizeKlaimStatus(prev.klaimStatus) === "Dibayar"
                                ? "Belum diajukan"
                                : normalizeKlaimStatus(prev.klaimStatus)
                              : "Dibayar",
                        };
                      })
                    }
                  >
                    <SelectTrigger className="w-full bg-white border-slate-200 dark:bg-slate-900/60 dark:border-white/10">
                      <SelectValue placeholder="Pilih sumber biaya" />
                    </SelectTrigger>
                    <SelectContent className="bg-white text-slate-900 border-slate-200 dark:bg-slate-900 dark:text-slate-100 dark:border-white/10">
                      <SelectItem value="deposit">Deposit / Kas</SelectItem>
                      <SelectItem value="mandiri">Personal / Mandiri</SelectItem>
                      <SelectItem value="kantor">Kantor</SelectItem>
                    </SelectContent>
                  </Select>
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
	                <div className="grid gap-2">
	                  <Label>Status Klaim</Label>
	                  {transactionToEditClaimable ? (
	                    <Select
	                      value={normalizeKlaimStatus(transactionToEdit.klaimStatus)}
	                      onValueChange={(value) =>
	                        setTransactionToEdit((prev) =>
	                          prev
	                            ? { ...prev, klaimStatus: value as KlaimStatus }
	                            : prev
	                        )
	                      }
	                    >
	                      <SelectTrigger className="w-full bg-white border-slate-200 dark:bg-slate-900/60 dark:border-white/10">
	                        <SelectValue placeholder="Pilih status klaim" />
	                      </SelectTrigger>
	                      <SelectContent className="bg-white text-slate-900 border-slate-200 dark:bg-slate-900 dark:text-slate-100 dark:border-white/10">
	                        {KLAIM_STATUS_OPTIONS.map((status) => (
	                          <SelectItem key={status} value={status}>
	                            {status}
	                          </SelectItem>
	                        ))}
	                      </SelectContent>
	                    </Select>
	                  ) : (
	                    <Input
	                      value="Tidak perlu klaim"
	                      readOnly
	                      className="bg-white border-slate-200 text-slate-500 dark:bg-slate-900/60 dark:border-white/10 dark:text-slate-400"
	                    />
	                  )}
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

      <Dialog open={!!previewState} onOpenChange={(isOpen) => !isOpen && closePreview()}>
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
            <div className="absolute top-3 left-3 z-20 flex items-center gap-2 rounded-full bg-black/40 p-1 backdrop-blur">
              <Button
                variant="ghost"
                size="icon"
                onClick={() =>
                  setPreviewZoom((prev) => Math.max(1, Number((prev - 0.2).toFixed(2))))
                }
                className="h-8 w-8 text-white hover:bg-white/10"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="min-w-12 text-center text-xs text-white">
                {Math.round(previewZoom * 100)}%
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() =>
                  setPreviewZoom((prev) => Math.min(5, Number((prev + 0.2).toFixed(2))))
                }
                className="h-8 w-8 text-white hover:bg-white/10"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setPreviewZoom(1);
                  setPreviewOffset({ x: 0, y: 0 });
                }}
                className="h-8 w-8 text-white hover:bg-white/10"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>

            <div className="relative flex w-auto max-h-[90vh] max-w-[90vw] items-center justify-center overflow-hidden rounded-lg bg-black/40">
              {previewState ? (
                <div
                  className={`relative max-h-[90vh] max-w-[90vw] ${previewZoom > 1 ? "cursor-grab" : ""}`}
                  onWheel={handlePreviewWheel}
                  onPointerDown={handlePreviewPointerDown}
                  onPointerMove={handlePreviewPointerMove}
                  onPointerUp={handlePreviewPointerUp}
                  onPointerCancel={handlePreviewPointerUp}
                  onPointerLeave={handlePreviewPointerUp}
                >
                  <Image
                    src={previewState.urls[previewState.index]}
                    alt="Preview Berkas"
                    width={2048}
                    height={2048}
                    unoptimized
                    style={{
                      width: "auto",
                      height: "auto",
                      maxWidth: "90vw",
                      maxHeight: "90vh",
                      objectFit: "contain",
                      transform: `translate(${previewOffset.x}px, ${previewOffset.y}px) scale(${previewZoom})`,
                      transformOrigin: "center center",
                      transition: isPreviewDragging ? "none" : "transform 120ms ease",
                    }}
                    className="rounded-lg shadow-2xl"
                  />
                </div>
              ) : null}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={closePreview}
              className="absolute top-2 right-2 bg-black/50 hover:bg-black/75 text-white rounded-full h-8 w-8"
            >
              <X className="h-5 w-5" />
            </Button>
            {previewState && previewState.urls.length > 1 ? (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  type="button"
                  onClick={handlePreviewPrev}
                  className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/75 text-white rounded-full h-9 w-9"
                >
                  <ChevronsLeft className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  type="button"
                  onClick={handlePreviewNext}
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/75 text-white rounded-full h-9 w-9"
                >
                  <ChevronsRight className="h-5 w-5" />
                </Button>
                <div className="absolute bottom-4 left-4 rounded-full bg-black/55 px-3 py-1 text-xs text-white">
                  {previewState.index + 1} / {previewState.urls.length}
                </div>
              </>
            ) : null}
            <Button
              variant="default"
              size="sm"
              type="button"
              onClick={handleDownloadOriginalPhoto}
              className="absolute bottom-4 right-4 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg"
            >
              <span className="inline-flex items-center">
                <Download className="h-4 w-4 mr-2" />
                Unduh
              </span>
            </Button>
          </motion.div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
