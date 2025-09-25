"use client";

import { useState, useMemo, ChangeEvent } from 'react';
import { Edit, Trash2, FileDown, Wallet, ArchiveX, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/AuthProvider"; // Diperlukan untuk autentikasi
import { toast } from 'sonner';
import { motion } from 'framer-motion';

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

  if (isLoading) return (
      <div className="flex justify-center items-center p-16">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
  );

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 },
  };

  return (
    <motion.div
        className="bg-gray-800/60 backdrop-blur-xl border border-white/10 rounded-lg shadow-lg p-6 text-white"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
    >
      <motion.div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4" variants={itemVariants}>
        <h2 className="text-xl font-semibold text-cyan-400">Riwayat Saldo</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportExcel} disabled={!saldoData || saldoData.length === 0}><FileDown className="h-4 w-4 mr-2" /> Excel</Button>
          <Button variant="outline" size="sm" onClick={handleExportPdf} disabled={!saldoData || saldoData.length === 0}><FileDown className="h-4 w-4 mr-2" /> PDF</Button>
        </div>
      </motion.div>

      <motion.div className="mb-6 p-4 bg-gray-700/50 rounded-lg flex justify-between items-center" variants={itemVariants}>
        <div className="flex items-center gap-3"><Wallet className="h-6 w-6 text-gray-400" /><h3 className="text-md font-semibold text-gray-300">Total Semua Saldo</h3></div>
        <p className="text-2xl font-bold text-cyan-400">{formatCurrency(totalSaldo)}</p>
      </motion.div>

      <motion.div variants={itemVariants}>
        {!Array.isArray(saldoData) || saldoData.length === 0 ? (
          <div className="text-center text-gray-400 py-16 bg-gray-800/50 rounded-lg">
            <ArchiveX className="h-12 w-12 mx-auto mb-4 text-gray-500" />
            <p className="font-semibold">Tidak Ada Data Saldo</p>
            <p className="text-sm">Data yang Anda tambahkan akan muncul di sini.</p>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
            <Table>
              <TableHeader><TableRow className="border-gray-700 hover:bg-gray-800 sticky top-0 bg-gray-800 z-10"><TableHead>Tanggal</TableHead><TableHead>Keterangan</TableHead><TableHead className="text-right">Jumlah</TableHead><TableHead className="text-center">Aksi</TableHead></TableRow></TableHeader>
              <motion.tbody variants={containerVariants} initial="hidden" animate="visible">
                {saldoData.map((item) => (
                  <motion.tr key={item.id} className="border-b border-gray-700" variants={itemVariants}>
                    <TableCell className="py-3 px-6">{item.tanggal}</TableCell>
                    <TableCell className="font-medium py-3 px-6">{item.keterangan}</TableCell>
                    <TableCell className="text-right py-3 px-6 font-mono">{formatCurrency(Number(item.jumlah))}</TableCell>
                    <TableCell className="text-center py-3 px-6">
                      <TooltipProvider>
                        <div className="flex justify-center items-center gap-1">
                          <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => handleOpenEditModal(item)}><Edit className="h-4 w-4 text-yellow-500" /></Button></TooltipTrigger><TooltipContent><p>Edit Data</p></TooltipContent></Tooltip>
                          <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button></TooltipTrigger><TooltipContent><p>Hapus Data</p></TooltipContent></Tooltip>
                        </div>
                      </TooltipProvider>
                    </TableCell>
                  </motion.tr>
                ))}
              </motion.tbody>
            </Table>
          </div>
        )}
      </motion.div>

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[425px] bg-gray-800/80 backdrop-blur-md border-gray-700 text-white">
          <DialogHeader><DialogTitle className="text-cyan-400">Edit Saldo</DialogTitle></DialogHeader>
          {itemToEdit && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2"><Label htmlFor="tanggal">Tanggal</Label><Input id="tanggal" name="tanggal" type="date" value={itemToEdit.tanggal} onChange={handleEditFormChange} className="bg-gray-700 border-gray-600"/></div>
              <div className="grid gap-2">
                <Label htmlFor="keterangan">Keterangan</Label>
                {/* PERBAIKAN: Hapus 'as any' karena sudah type-safe */}
                <Textarea id="keterangan" name="keterangan" value={itemToEdit.keterangan} onChange={handleEditFormChange} className="bg-gray-700 border-gray-600"/>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="jumlah">Jumlah (Rp)</Label>
                <CurrencyInput
                  id="jumlah"
                  placeholder="1.000.000"
                  value={itemToEdit.jumlah}
                  onValueChange={handleEditJumlahChange}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseEditModal}>Batal</Button>
            <Button onClick={handleUpdate} className="bg-cyan-600 hover:bg-cyan-700">Simpan Perubahan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

