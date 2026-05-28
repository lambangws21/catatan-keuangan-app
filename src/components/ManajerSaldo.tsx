"use client";

import { useMemo, useState, ChangeEvent } from 'react';
import { Edit, Trash2, FileDown, Wallet, ArchiveX, Loader2, CalendarDays, StickyNote, Coins } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/AuthProvider"; // Diperlukan untuk autentikasi
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import SaldoForm from "@/components/FormSaldo";
import { useTableUiConfig } from "@/hooks/use-table-ui-config";

// Import library dan komponen UI
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Table,  TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CurrencyInput } from "@/components/CurencyInput";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  COMPANY_GROUP_OPTIONS,
  type CompanyGroup,
  companyGroupLabel,
  detectCompanyGroup,
  matchesCompanyGroup,
} from "@/lib/company-groups";

// Definisikan tipe data saldo
interface Saldo {
  id: string;
  tanggal: string;
  keterangan: string;
  jumlah: number | string;
}

// Definisikan props yang diterima
interface SaldoManagerProps {
  saldoData: Saldo[];
  isLoading: boolean;
  onDataChange: () => Promise<void>;
  floatingActionOffset?: "bottom" | "stacked";
  showCreateAction?: boolean;
}

type SaldoGroup = Exclude<CompanyGroup, "all">;

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);
};

const saldoGroupStyles: Record<
  SaldoGroup,
  {
    card: string;
    badge: string;
    title: string;
    value: string;
  }
> = {
  ZB: {
    card: "border-sky-300/60 bg-sky-50 text-sky-950 dark:border-sky-400/30 dark:bg-sky-500/10 dark:text-sky-50",
    badge: "border-sky-300 bg-sky-100 text-sky-700 dark:border-sky-400/30 dark:bg-sky-400/10 dark:text-sky-100",
    title: "font-black text-sky-700 dark:text-sky-200",
    value: "font-black text-sky-950 dark:text-sky-50",
  },
  NM: {
    card: "border-violet-300/60 bg-violet-50 text-violet-950 dark:border-violet-400/30 dark:bg-violet-500/10 dark:text-violet-50",
    badge: "border-violet-300 bg-violet-100 text-violet-700 dark:border-violet-400/30 dark:bg-violet-400/10 dark:text-violet-100",
    title: "font-black italic text-violet-700 dark:text-violet-200",
    value: "font-black italic text-violet-950 dark:text-violet-50",
  },
  OTHER: {
    card: "border-slate-200 bg-white/80 text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-slate-100",
    badge: "border-slate-200 bg-slate-100 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-white/75",
    title: "font-semibold text-(--dash-muted)",
    value: "font-semibold text-slate-950 dark:text-white",
  },
};

export default function SaldoManager({
  saldoData,
  isLoading,
  onDataChange,
  floatingActionOffset = "bottom",
  showCreateAction = true,
}: SaldoManagerProps) {
  const { config: tableUi } = useTableUiConfig();
  const { user } = useAuth(); // Dapatkan info pengguna untuk autentikasi
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<Saldo | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCompanyGroup, setSelectedCompanyGroup] = useState<CompanyGroup>("all");

  const filteredSaldoData = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return saldoData.filter((item) => {
      const matchesSearch =
        q.length === 0 ||
        [item.tanggal, item.keterangan, String(item.jumlah)]
          .join(" ")
          .toLowerCase()
          .includes(q);
      return matchesSearch && matchesCompanyGroup(item.keterangan, selectedCompanyGroup);
    });
  }, [saldoData, searchTerm, selectedCompanyGroup]);

  const totalSaldo = useMemo(() => {
    if (!Array.isArray(filteredSaldoData)) return 0;
    return filteredSaldoData.reduce((sum, item) => sum + Number(item.jumlah || 0), 0);
  }, [filteredSaldoData]);

  const groupSummary = useMemo(() => {
    return filteredSaldoData.reduce(
      (acc, item) => {
        const group = detectCompanyGroup(item.keterangan);
        acc[group] = {
          count: acc[group].count + 1,
          total: acc[group].total + Number(item.jumlah || 0),
        };
        return acc;
      },
      {
        ZB: { count: 0, total: 0 },
        NM: { count: 0, total: 0 },
        OTHER: { count: 0, total: 0 },
      }
    );
  }, [filteredSaldoData]);

  // --- Fungsi Ekspor ---
  const handleExportExcel = () => {
    const dataToExport = filteredSaldoData
      .slice()
      .sort((a, b) => String(a.tanggal).localeCompare(String(b.tanggal)))
      .map((item) => ({
        Tanggal: item.tanggal,
        Keterangan: item.keterangan,
        Jumlah: Number(item.jumlah),
      }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data Saldo");
    worksheet["!cols"] = [{ wch: 12 }, { wch: 40 }, { wch: 15 }];
    XLSX.writeFile(workbook, "Laporan Saldo.xlsx");
  };

  const handleExportPdf = () => {
    const doc = new jsPDF();
    doc.text("Laporan Riwayat Saldo", 14, 16);
    autoTable(doc, {
      head: [["Tanggal", "Keterangan", "Jumlah"]],
      body: filteredSaldoData.map((item) => [
        item.tanggal,
        item.keterangan,
        formatCurrency(Number(item.jumlah)),
      ]),
      startY: 22,
      headStyles: { fillColor: [38, 145, 158] },
    });
    doc.save("Laporan Saldo.pdf");
  };

  // --- Logika CRUD dengan Autentikasi ---
  const handleDelete = async (id: string) => {
    if (!user) return toast.error("Sesi tidak valid, silakan login kembali.");
    if (!window.confirm("Apakah Anda yakin ingin menghapus data saldo ini?")) return;
    
    try {
        const token = await user.getIdToken();
        const response = await fetch(`/api/saldo/${id}`, { 
            method: "DELETE",
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error("Gagal menghapus data.");
        toast.success("Data berhasil dihapus.");
        await onDataChange();
    } catch (error) {
        toast.error((error as Error).message);
    }
  };

  const handleOpenEditModal = (item: Saldo) => {
    setItemToEdit({ ...item });
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setItemToEdit(null);
  };

  const handleUpdate = async () => {
    if (!user) return toast.error("Sesi tidak valid, silakan login kembali.");
    if (!itemToEdit) return;

    try {
      const token = await user.getIdToken();
      const dataToUpdate = { ...itemToEdit, jumlah: Number(itemToEdit.jumlah) };
      const response = await fetch(`/api/saldo/${itemToEdit.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(dataToUpdate),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Gagal memperbarui data.");
      }

      handleCloseEditModal();
      toast.success("Data berhasil diperbarui.");
      await onDataChange();
    } catch (error) {
      toast.error((error as Error).message);
    }
  };
  
  // Handler untuk input teks biasa di modal edit
  const handleEditFormChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (!itemToEdit) return;
    const { name, value } = e.target;
    setItemToEdit((prev) => (prev ? { ...prev, [name]: value } : null));
  };
  
  // Handler khusus untuk CurrencyInput di modal edit
  const handleEditJumlahChange = (value: number | undefined) => {
    if (!itemToEdit) return;
    setItemToEdit(prev => prev ? { ...prev, jumlah: value || 0 } : null);
  };

  if (isLoading)
    return (
      <div className="flex justify-center items-center p-16">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    );

  const hasEntries = Array.isArray(filteredSaldoData) && filteredSaldoData.length > 0;
  const totalEntries = hasEntries ? filteredSaldoData.length : 0;
  const latestEntries = hasEntries ? filteredSaldoData.slice(0, 3) : [];
  const enableScroll = totalEntries > tableUi.saldoScrollThreshold;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
  };

  const itemVariants = {
    hidden: { y: 16, opacity: 0 },
    visible: { y: 0, opacity: 1 },
  };

  const cardBackground = "border border-white/10 bg-(--dash-surface) shadow-[0_20px_60px_rgba(2,6,23,0.45)]";

  return (
    <motion.div
      className={`space-y-3 rounded-2xl ${cardBackground} p-3 text-(--dash-ink) sm:p-4`}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[9px] uppercase tracking-[0.32em] text-(--dash-muted)">
            Riwayat Saldo
          </p>
          <h2 className="text-lg font-semibold text-white sm:text-xl">Sirkulasi Dana Terkini</h2>
          <p className="text-[11px] text-(--dash-muted)">
            {totalEntries} entri dapat diekspor dengan cepat.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {showCreateAction ? (
            <SaldoForm
              onSaldoAdded={onDataChange}
              floatingOffset={floatingActionOffset}
            />
          ) : null}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            disabled={!hasEntries}
            className="h-8 border-slate-200 bg-white/70 text-xs text-slate-800 hover:bg-white hover:border-slate-300 dark:border-white/20 dark:bg-white/5 dark:text-white/80 dark:hover:border-white/40"
          >
            <FileDown className="h-3.5 w-3.5 mr-1.5" /> Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPdf}
            disabled={!hasEntries}
            className="h-8 border-slate-200 bg-white/70 text-xs text-slate-800 hover:bg-white hover:border-slate-300 dark:border-white/20 dark:bg-white/5 dark:text-white/80 dark:hover:border-white/40"
          >
            <FileDown className="h-3.5 w-3.5 mr-1.5" /> PDF
          </Button>
        </div>
      </div>

      <div className="grid gap-2 rounded-xl border border-slate-200 bg-white/70 p-2 text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 md:grid-cols-[minmax(0,1fr)_150px]">
        <Input
          type="search"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Cari tanggal, keterangan, jumlah, ZB, Zimmer Biomet, NM, Normed..."
          className="h-9 border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 dark:border-white/10 dark:bg-black/20 dark:text-slate-100 dark:placeholder:text-white/40"
        />
        <Select
          value={selectedCompanyGroup}
          onValueChange={(value) => setSelectedCompanyGroup(value as CompanyGroup)}
        >
          <SelectTrigger className="h-9 border-slate-200 bg-white text-xs text-slate-900 dark:border-white/10 dark:bg-black/20 dark:text-slate-100">
            <SelectValue placeholder="Semua Grup" />
          </SelectTrigger>
          <SelectContent className="border-slate-200 bg-white text-slate-900 dark:border-white/10 dark:bg-slate-900 dark:text-white">
            {COMPANY_GROUP_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white/80 p-2.5 text-slate-900 shadow-inner dark:border-white/10 dark:bg-white/5 dark:text-slate-100">
          <div className="flex items-center gap-2">
            <Wallet className="h-3.5 w-3.5 text-emerald-300" />
            <p className="text-[8px] uppercase tracking-[0.22em] text-(--dash-muted)">
              Total Saldo
            </p>
          </div>
          <p className="mt-1.5 truncate text-xl font-semibold text-slate-950 dark:text-white sm:text-2xl">{formatCurrency(totalSaldo)}</p>
          <p className="mt-1 text-[10px] text-(--dash-muted)">
            {hasEntries ? `${totalEntries} transaksi` : "Belum ada data"}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white/80 p-2.5 text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-slate-100">
          <p className="text-[8px] uppercase tracking-[0.22em] text-(--dash-muted)">
            Entri terbaru
          </p>
          {latestEntries.length === 0 ? (
            <p className="mt-2 text-[11px] text-(--dash-muted)">
              Tambahkan saldo untuk melihat ringkasan.
            </p>
          ) : (
            <ul className="mt-2 space-y-1.5 text-[11px] text-slate-800 dark:text-white/90">
              {latestEntries.map((item) => (
                <li key={item.id} className="flex items-center justify-between">
                  <span className="font-medium">{item.tanggal}</span>
                  <span className="text-(--dash-muted)">{formatCurrency(Number(item.jumlah))}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {(["ZB", "NM", "OTHER"] as const).map((group) => (
          <div
            key={group}
            className={`rounded-xl border p-2.5 ${saldoGroupStyles[group].card}`}
          >
            <div className="flex items-center justify-between gap-2">
              <p className={`text-[8px] uppercase tracking-[0.18em] ${saldoGroupStyles[group].title}`}>
                {companyGroupLabel(group)}
              </p>
              <span className={`rounded-full border px-1.5 py-0.5 text-[8px] ${saldoGroupStyles[group].badge}`}>
                {groupSummary[group].count}
              </span>
            </div>
            <p className={`mt-1.5 truncate text-sm sm:text-base ${saldoGroupStyles[group].value}`}>
              {formatCurrency(groupSummary[group].total)}
            </p>
          </div>
        ))}
      </div>

      {hasEntries ? (
        <>
          <div className="hidden lg:block">
            <div
              className={enableScroll ? "overflow-auto" : "overflow-x-auto"}
              style={
                enableScroll
                  ? { maxHeight: `${tableUi.saldoDesktopMaxHeightPx}px` }
                  : undefined
              }
            >
              <Table className="min-w-full text-[11px] text-white">
                <TableHeader>
                  <TableRow className="bg-slate-100 text-left text-slate-700 dark:bg-slate-900 dark:text-white">
                    <TableHead className="p-2 text-xs">Tanggal</TableHead>
                    <TableHead className="p-2 text-xs">Keterangan</TableHead>
                    <TableHead className="p-2 text-xs">Grup</TableHead>
                    <TableHead className="p-2 text-right text-xs">Jumlah</TableHead>
                    <TableHead className="p-2 text-center text-xs">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <motion.tbody className="text-white" variants={containerVariants} initial="hidden" animate="visible">
                  {filteredSaldoData.map((item) => (
                    (() => {
                      const group = detectCompanyGroup(item.keterangan);
                      return (
                    <motion.tr
                      key={item.id}
                      className="border-b border-slate-200 dark:border-white/10"
                      variants={itemVariants}
                    >
                      <TableCell className="px-2 py-1.5 text-white">
                        <span className="inline-flex items-center gap-2">
                          <CalendarDays className="h-3.5 w-3.5 text-emerald-200/80" />
                          <span>{item.tanggal}</span>
                        </span>
                      </TableCell>
                      <TableCell className="px-2 py-1.5 font-medium text-white">
                        <span className="inline-flex items-center gap-2">
                          <StickyNote className="h-3.5 w-3.5 text-emerald-200/70" />
                          <span>{item.keterangan}</span>
                        </span>
                      </TableCell>
                      <TableCell className="px-2 py-1.5">
                        <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] ${saldoGroupStyles[group].badge} ${group === "NM" ? "font-black italic" : "font-black"}`}>
                          {companyGroupLabel(group)}
                        </span>
                      </TableCell>
                      <TableCell className="px-2 py-1.5 text-right font-mono text-white/90">
                        <span className="inline-flex items-center justify-end gap-2">
                          <Coins className="h-3.5 w-3.5 text-emerald-200/70" />
                          <span>{formatCurrency(Number(item.jumlah))}</span>
                        </span>
                      </TableCell>
                      <TableCell className="px-2 py-1.5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleOpenEditModal(item)}
                                  className="text-yellow-300 hover:text-yellow-200"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Edit Data</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDelete(item.id)}
                                  className="text-rose-300 hover:text-rose-200"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Hapus Data</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </TableCell>
                    </motion.tr>
                      );
                    })()
                  ))}
                </motion.tbody>
              </Table>
            </div>
          </div>

          <div
            className={`space-y-3 lg:hidden ${enableScroll ? "overflow-auto pr-1" : ""}`}
            style={
              enableScroll
                ? { maxHeight: `${tableUi.saldoMobileMaxHeightPx}px` }
                : undefined
            }
          >
            {filteredSaldoData.map((item) => (
              (() => {
                const group = detectCompanyGroup(item.keterangan);
                return (
              <motion.article
                key={item.id}
                className={`rounded-2xl border p-3 shadow-[0_12px_30px_rgba(15,23,42,0.12)] dark:shadow-[0_12px_30px_rgba(2,6,23,0.45)] ${saldoGroupStyles[group].card}`}
                variants={itemVariants}
              >
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.24em] text-(--dash-muted)">
                        <CalendarDays className="h-3.5 w-3.5 text-emerald-200/70" />
                        <span>{item.tanggal}</span>
                      </p>
                      <p className="mt-1 inline-flex items-center gap-2 text-sm font-semibold text-slate-950 dark:text-white">
                        <StickyNote className="h-3.5 w-3.5 text-emerald-200/70" />
                        <span>{item.keterangan}</span>
                      </p>
                    </div>
                    <span className="text-right text-xs font-mono text-slate-700 dark:text-white/70">
                      <span className="inline-flex items-center gap-2">
                        <Coins className="h-3.5 w-3.5 text-emerald-200/70" />
                        <span>{formatCurrency(Number(item.jumlah))}</span>
                      </span>
                    </span>
                  </div>
                  <p className="text-[10px] font-medium text-(--dash-muted)">
                    Grup: <span className={group === "NM" ? "font-black italic" : "font-black"}>{companyGroupLabel(group)}</span> • Catatan: {item.keterangan || "—"}
                  </p>
                </div>
                <div className="mt-3 flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleOpenEditModal(item)}
                    className="rounded-full bg-white/5 text-yellow-300 hover:text-yellow-200"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(item.id)}
                    className="rounded-full bg-white/5 text-rose-300 hover:text-rose-200"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </motion.article>
                );
              })()
            ))}
          </div>
        </>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white/80 p-8 text-center text-sm text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-(--dash-muted)">
          <ArchiveX className="mx-auto mb-3 h-10 w-10 text-white/60" />
          <p className="font-semibold text-slate-900 dark:text-white/90">Belum ada data saldo</p>
          <p>Tambahkan saldo agar riwayat dapat ditampilkan.</p>
        </div>
      )}

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[500px] border-slate-200 bg-white text-slate-900 shadow-2xl dark:border-white/10 dark:bg-slate-950 dark:text-slate-100">
          <DialogHeader>
            <DialogTitle className="text-cyan-700 dark:text-cyan-300">
              Edit Saldo
            </DialogTitle>
          </DialogHeader>
          {itemToEdit && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="tanggal">Tanggal</Label>
                <Input
                  id="tanggal"
                  name="tanggal"
                  type="date"
                  value={itemToEdit.tanggal}
                  onChange={handleEditFormChange}
                  className="border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-100 dark:placeholder:text-slate-500"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="keterangan">Keterangan</Label>
                <Textarea
                  id="keterangan"
                  name="keterangan"
                  value={itemToEdit.keterangan}
                  onChange={handleEditFormChange}
                  className="border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-100 dark:placeholder:text-slate-500"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="jumlah">Jumlah (Rp)</Label>
                <CurrencyInput
                  id="jumlah"
                  placeholder="1.000.000"
                  value={itemToEdit.jumlah}
                  onValueChange={handleEditJumlahChange}
                  className="border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-100 dark:placeholder:text-slate-500"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseEditModal}>
              Batal
            </Button>
            <Button
              onClick={handleUpdate}
              className="bg-cyan-600 text-white hover:bg-cyan-700 dark:bg-cyan-500 dark:hover:bg-cyan-400"
            >
              Simpan Perubahan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
