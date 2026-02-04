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
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);
};

export default function SaldoManager({
  saldoData,
  isLoading,
  onDataChange,
}: SaldoManagerProps) {
  const { config: tableUi } = useTableUiConfig();
  const { user } = useAuth(); // Dapatkan info pengguna untuk autentikasi
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<Saldo | null>(null);

  const totalSaldo = useMemo(() => {
    if (!Array.isArray(saldoData)) return 0;
    return saldoData.reduce((sum, item) => sum + Number(item.jumlah || 0), 0);
  }, [saldoData]);

  // --- Fungsi Ekspor ---
  const handleExportExcel = () => {
    const dataToExport = saldoData.map((item) => ({
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
      body: saldoData.map((item) => [
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

  const hasEntries = Array.isArray(saldoData) && saldoData.length > 0;
  const totalEntries = hasEntries ? saldoData.length : 0;
  const latestEntries = hasEntries ? saldoData.slice(0, 3) : [];
  const enableScroll = totalEntries > tableUi.saldoScrollThreshold;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
  };

  const itemVariants = {
    hidden: { y: 16, opacity: 0 },
    visible: { y: 0, opacity: 1 },
  };

  const cardBackground = "border border-white/10 bg-[var(--dash-surface)] shadow-[0_20px_60px_rgba(2,6,23,0.45)]";

  return (
    <motion.div
      className={`space-y-6 rounded-3xl ${cardBackground} p-6 text-(--dash-ink)]`}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.4em] text-(--dash-muted)]">
            Riwayat Saldo
          </p>
          <h2 className="text-2xl font-semibold text-white">Sirkulasi Dana Terkini</h2>
          <p className="text-sm text-(--dash-muted)]">
            {totalEntries} entri dapat diekspor dengan cepat.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <SaldoForm onSaldoAdded={onDataChange} />
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            disabled={!hasEntries}
            className="border-slate-200 bg-white/70 text-slate-800 hover:bg-white hover:border-slate-300 dark:border-white/20 dark:bg-white/5 dark:text-white/80 dark:hover:border-white/40"
          >
            <FileDown className="h-4 w-4 mr-2" /> Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPdf}
            disabled={!hasEntries}
            className="border-slate-200 bg-white/70 text-slate-800 hover:bg-white hover:border-slate-300 dark:border-white/20 dark:bg-white/5 dark:text-white/80 dark:hover:border-white/40"
          >
            <FileDown className="h-4 w-4 mr-2" /> PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-inner">
          <div className="flex items-center gap-3">
            <Wallet className="h-5 w-5 text-emerald-300" />
            <p className="text-[10px] uppercase tracking-[0.3em] text-(--dash-muted)]">
              Total Saldo
            </p>
          </div>
          <p className="mt-3 text-3xl font-semibold text-white">{formatCurrency(totalSaldo)}</p>
          <p className="mt-2 text-[11px] text-(--dash-muted)]">
            {hasEntries ? `${totalEntries} transaksi` : "Belum ada data"}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-[10px] uppercase tracking-[0.3em] text-(--dash-muted)]">
            Entri terbaru
          </p>
          {latestEntries.length === 0 ? (
            <p className="text-sm text-(--dash-muted)] mt-2">
              Tambahkan saldo untuk melihat ringkasan.
            </p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm text-white/90">
              {latestEntries.map((item) => (
                <li key={item.id} className="flex items-center justify-between">
                  <span className="font-medium">{item.tanggal}</span>
                  <span className="text-(--dash-muted)]">{formatCurrency(Number(item.jumlah))}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
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
              <Table className="min-w-full text-sm">
                <TableHeader>
                  <TableRow className="bg-slate-900 text-left text-white">
                    <TableHead className="p-3">Tanggal</TableHead>
                    <TableHead className="p-3">Keterangan</TableHead>
                    <TableHead className="p-3 text-right">Jumlah</TableHead>
                    <TableHead className="p-3 text-center">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <motion.tbody variants={containerVariants} initial="hidden" animate="visible">
                  {saldoData.map((item) => (
                    <motion.tr
                      key={item.id}
                      className="border-b border-white/10"
                      variants={itemVariants}
                    >
                      <TableCell className="py-3 px-3">
                        <span className="inline-flex items-center gap-2">
                          <CalendarDays className="h-4 w-4 text-emerald-200/80" />
                          <span>{item.tanggal}</span>
                        </span>
                      </TableCell>
                      <TableCell className="py-3 px-3 font-medium">
                        <span className="inline-flex items-center gap-2">
                          <StickyNote className="h-4 w-4 text-emerald-200/70" />
                          <span>{item.keterangan}</span>
                        </span>
                      </TableCell>
                      <TableCell className="py-3 px-3 text-right font-mono text-white/80">
                        <span className="inline-flex items-center justify-end gap-2">
                          <Coins className="h-4 w-4 text-emerald-200/70" />
                          <span>{formatCurrency(Number(item.jumlah))}</span>
                        </span>
                      </TableCell>
                      <TableCell className="py-3 px-3 text-center">
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
            {saldoData.map((item) => (
              <motion.article
                key={item.id}
                className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[0_12px_30px_rgba(2,6,23,0.45)]"
                variants={itemVariants}
              >
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-(--dash-muted)]">
                        <CalendarDays className="h-4 w-4 text-emerald-200/70" />
                        <span>{item.tanggal}</span>
                      </p>
                      <p className="mt-1 inline-flex items-center gap-2 text-lg font-semibold text-white">
                        <StickyNote className="h-4 w-4 text-emerald-200/70" />
                        <span>{item.keterangan}</span>
                      </p>
                    </div>
                    <span className="text-right text-sm font-mono text-white/70">
                      <span className="inline-flex items-center gap-2">
                        <Coins className="h-4 w-4 text-emerald-200/70" />
                        <span>{formatCurrency(Number(item.jumlah))}</span>
                      </span>
                    </span>
                  </div>
                  <p className="text-[10px] font-medium text-(--dash-muted)]">
                    Catatan: {item.keterangan || "—"}
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
            ))}
          </div>
        </>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-sm text-(--dash-muted)]">
          <ArchiveX className="mx-auto mb-3 h-10 w-10 text-white/60" />
          <p className="font-semibold text-white/90">Belum ada data saldo</p>
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
                  className="bg-white border-slate-200 dark:bg-slate-900/60 dark:border-white/10"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="keterangan">Keterangan</Label>
                <Textarea
                  id="keterangan"
                  name="keterangan"
                  value={itemToEdit.keterangan}
                  onChange={handleEditFormChange}
                  className="bg-white border-slate-200 dark:bg-slate-900/60 dark:border-white/10"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="jumlah">Jumlah (Rp)</Label>
                <CurrencyInput
                  id="jumlah"
                  placeholder="1.000.000"
                  value={itemToEdit.jumlah}
                  onValueChange={handleEditJumlahChange}
                  className="bg-white border-slate-200 dark:bg-slate-900/60 dark:border-white/10"
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
