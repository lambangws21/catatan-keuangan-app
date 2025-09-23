"use client";

import { useState, ChangeEvent, useMemo } from 'react';
import { Edit, Trash2, FileText, Download, X, FileDown, Wallet, ArchiveX, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

// Import library untuk ekspor
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Import komponen dari shadcn/ui
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

// Definisikan tipe data transaksi Anda
interface Transaction {
  id: string;
  tanggal: string;
  jenisBiaya: string;
  keterangan: string;
  jumlah: number;
  klaim: string;
  fileUrl?: string;
}

// Definisikan props yang diterima dari komponen induk
interface TransactionManagerProps {
  transactions: Transaction[];
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

export default function TransactionManager({
  transactions,
  isLoading,
  onDataChange,
}: TransactionManagerProps) {
  const { user } = useAuth();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [transactionToEdit, setTransactionToEdit] =
    useState<Transaction | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  const totalJumlah = useMemo(() => {
    if (!Array.isArray(transactions)) return 0;
    return transactions.reduce((sum, tx) => sum + Number(tx.jumlah || 0), 0);
  }, [transactions]);

  // --- Fungsi Ekspor ---
  const handleExportExcel = () => {
    const dataToExport = transactions.map(tx => ({
      Tanggal: tx.tanggal,
      Keterangan: tx.keterangan,
      'Jenis Biaya': tx.jenisBiaya,
      Jumlah: Number(tx.jumlah),
      Klaim: tx.klaim,
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data Transaksi");
    worksheet['!cols'] = [{ wch: 12 }, { wch: 40 }, { wch: 20 }, { wch: 15 }, { wch: 15 }];
    XLSX.writeFile(workbook, "Laporan Transaksi.xlsx");
  };

  const handleExportPdf = () => {
    const doc = new jsPDF();
    doc.text("Laporan Riwayat Transaksi", 14, 16);
    autoTable(doc, {
      head: [['Tanggal', 'Keterangan', 'Jenis Biaya', 'Jumlah', 'Klaim']],
      body: transactions.map(tx => [
        tx.tanggal,
        tx.keterangan,
        tx.jenisBiaya,
        formatCurrency(Number(tx.jumlah)),
        tx.klaim
      ]),
      startY: 22,
      headStyles: { fillColor: [38, 145, 158] },
    });
    doc.save("Laporan Transaksi.pdf");
  };

  // --- Fungsi CRUD dengan Autentikasi ---
  const handleDeleteTransaction = async (id: string) => {
    if (!user) return toast.error("Sesi tidak valid, silakan login kembali.");
    if (!window.confirm("Apakah Anda yakin ingin menghapus transaksi ini?")) return;
    
    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/transactions/${id}`, { 
          method: "DELETE",
          headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Gagal menghapus transaksi.");
      }
      toast.success("Transaksi berhasil dihapus.");
      await onDataChange();

    } catch (error) {
        toast.error((error as Error).message);
    }
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
    if (!user) return toast.error("Sesi tidak valid, silakan login kembali.");
    if (!transactionToEdit) return;

    const { tanggal, jenisBiaya, keterangan, jumlah } = transactionToEdit;
    if (!tanggal || !jenisBiaya.trim() || !keterangan.trim() || isNaN(Number(jumlah))) {
        toast.error("Data tidak valid. Pastikan semua field terisi dengan benar.");
        return;
    }
    
    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/transactions/${transactionToEdit.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          ...transactionToEdit,
          jumlah: Number(transactionToEdit.jumlah)
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Gagal memperbarui transaksi.");
      }
      
      handleCloseEditModal();
      toast.success("Transaksi berhasil diperbarui.");
      await onDataChange();
    } catch (error) {
        toast.error((error as Error).message);
    }
  };
  
  const handleEditFormChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    if (!transactionToEdit) return;
    const { name, value } = e.target;
    setTransactionToEdit((prev) => (prev ? { ...prev, [name]: value } : null));
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
        <h2 className="text-xl font-semibold text-cyan-400">
          Riwayat Transaksi
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportExcel} disabled={!transactions || transactions.length === 0}>
            <FileDown className="h-4 w-4 mr-2" /> Excel
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPdf} disabled={!transactions || transactions.length === 0}>
            <FileDown className="h-4 w-4 mr-2" /> PDF
          </Button>
        </div>
      </motion.div>

      <motion.div className="mb-6 p-4 bg-gray-700/50 rounded-lg flex justify-between items-center" variants={itemVariants}>
        <div className="flex items-center gap-3">
          <Wallet className="h-6 w-6 text-gray-400"/>
          <h3 className="text-md font-semibold text-gray-300">
            Total Transaksi
          </h3>
        </div>
        <p className="text-2xl font-bold text-cyan-400">
          {formatCurrency(totalJumlah)}
        </p>
      </motion.div>

      <motion.div variants={itemVariants}>
        {!Array.isArray(transactions) || transactions.length === 0 ? (
          <div className="text-center text-gray-400 py-16 bg-gray-800/50 rounded-lg">
            <ArchiveX className="h-12 w-12 mx-auto mb-4 text-gray-500" />
            <p className="font-semibold">Tidak Ada Transaksi</p>
            <p className="text-sm">Data transaksi Anda akan muncul di sini.</p>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[700px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-700 hover:bg-gray-800 sticky top-0 bg-gray-800 z-10">
                  <TableHead className="text-white">Tanggal</TableHead>
                  <TableHead className="text-white">Keterangan</TableHead>
                  <TableHead className="text-white">Jenis Biaya</TableHead>
                  <TableHead className="text-white text-right">Jumlah</TableHead>
                  <TableHead className="text-white">Klaim</TableHead>
                  <TableHead className="text-white text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <motion.tbody variants={containerVariants} initial="hidden" animate="visible">
                {transactions.map((tx) => (
                  <motion.tr key={tx.id} className="border-b border-gray-700" variants={itemVariants}>
                    <TableCell className="py-3 px-6">{tx.tanggal}</TableCell>
                    <TableCell className="font-medium py-3 px-6">{tx.keterangan}</TableCell>
                    <TableCell className="py-3 px-6"><span className="bg-cyan-900/50 text-cyan-300 text-xs font-medium px-2.5 py-0.5 rounded-full">{tx.jenisBiaya}</span></TableCell>
                    <TableCell className="text-right py-3 px-6 font-mono">
                      {formatCurrency(Number(tx.jumlah))}
                    </TableCell>
                    <TableCell className="py-3 px-6">{tx.klaim}</TableCell>
                    <TableCell className="text-center py-3 px-6">
                      <div className="flex justify-center items-center gap-1">
                        <TooltipProvider>
                            {tx.fileUrl && (
                                <Tooltip>
                                    <TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => setPreviewImageUrl(tx.fileUrl!)}><FileText className="h-4 w-4 text-cyan-400" /></Button></TooltipTrigger>
                                    <TooltipContent><p>Lihat Berkas</p></TooltipContent>
                                </Tooltip>
                            )}
                            <Tooltip>
                                <TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => handleOpenEditModal(tx)}><Edit className="h-4 w-4 text-yellow-500" /></Button></TooltipTrigger>
                                <TooltipContent><p>Edit Transaksi</p></TooltipContent>
                            </Tooltip>
                             <Tooltip>
                                <TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => handleDeleteTransaction(tx.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button></TooltipTrigger>
                                <TooltipContent><p>Hapus Transaksi</p></TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                      </div>
                    </TableCell>
                  </motion.tr>
                ))}
              </motion.tbody>
            </Table>
          </div>
        )}
      </motion.div>

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[625px] bg-gray-800/80 backdrop-blur-md border-gray-700 text-white">
          <DialogHeader><DialogTitle className="text-cyan-400">Edit Transaksi</DialogTitle></DialogHeader>
          {transactionToEdit && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2"><Label htmlFor="tanggal">Tanggal</Label><Input id="tanggal" name="tanggal" type="date" value={transactionToEdit.tanggal} onChange={handleEditFormChange} className="bg-gray-700 border-gray-600" /></div>
                <div className="grid gap-2"><Label htmlFor="jenisBiaya">Jenis Biaya</Label><Input id="jenisBiaya" name="jenisBiaya" value={transactionToEdit.jenisBiaya} onChange={handleEditFormChange} className="bg-gray-700 border-gray-600" /></div>
              </div>
              <div className="grid gap-2"><Label htmlFor="keterangan">Keterangan</Label><Textarea id="keterangan" name="keterangan" value={transactionToEdit.keterangan} onChange={handleEditFormChange} className="bg-gray-700 border-gray-600" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2"><Label htmlFor="jumlah">Jumlah (Rp)</Label><Input id="jumlah" name="jumlah" type="number" value={transactionToEdit.jumlah} onChange={handleEditFormChange} className="bg-gray-700 border-gray-600" /></div>
                <div className="grid gap-2"><Label htmlFor="klaim">Klaim</Label><Input type="text" id="klaim" name="klaim" value={transactionToEdit.klaim} onChange={handleEditFormChange} className="bg-gray-700 border-gray-600" /></div>
              </div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={handleCloseEditModal}>Batal</Button><Button onClick={handleUpdateTransaction} className="bg-cyan-600 hover:bg-cyan-700">Simpan Perubahan</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={!!previewImageUrl} onOpenChange={(isOpen) => !isOpen && setPreviewImageUrl(null)}>
        <DialogContent className="sm:max-w-4xl w-auto bg-transparent border-none shadow-none p-0">
           <DialogHeader className="sr-only"><DialogTitle>Pratinjau Gambar Berkas</DialogTitle><DialogDescription>Ini adalah pratinjau gambar yang diperbesar dari berkas yang dipilih.</DialogDescription></DialogHeader>
          <motion.div className="relative" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }}>
            <div className="relative w-auto h-auto max-w-[90vw] max-h-[90vh]">
              {previewImageUrl && (
                <Image src={previewImageUrl} alt="Preview Berkas" width={1920} height={1080} style={{ width: "auto", height: "auto", maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} className="rounded-lg shadow-2xl" />
              )}
            </div>
            <Button variant="ghost" size="icon" onClick={() => setPreviewImageUrl(null)} className="absolute top-2 right-2 bg-black/50 hover:bg-black/75 text-white rounded-full h-8 w-8"><X className="h-5 w-5" /></Button>
            <Button variant="default" size="sm" className="absolute bottom-4 right-4 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg" asChild><a href={previewImageUrl || "#"} download><Download className="h-4 w-4 mr-2" />Unduh</a></Button>
          </motion.div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

