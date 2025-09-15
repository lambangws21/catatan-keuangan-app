"use client";

import { useState, ChangeEvent, useMemo } from "react";
import { Edit, Trash2, FileText, Download, X, FileDown } from "lucide-react";
import { motion } from "framer-motion";
import Image from "next/image";

// Import library untuk ekspor
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Import komponen dari shadcn/ui
import {
  Table,
  TableBody,
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
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [transactionToEdit, setTransactionToEdit] =
    useState<Transaction | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  const totalJumlah = useMemo(() => {
    if (!Array.isArray(transactions)) return 0;
    return transactions.reduce((sum, tx) => sum + Number(tx.jumlah), 0);
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
    await fetch(`/api/transactions/${transactionToEdit.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(transactionToEdit),
    });
    handleCloseEditModal();
    await onDataChange();
  };

  const handleEditFormChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    if (!transactionToEdit) return;
    const { name, value } = e.target;
    setTransactionToEdit((prev) => (prev ? { ...prev, [name]: value } : null));
  };

  if (isLoading) return <p className="text-center p-8">Memuat data...</p>;
  
  return (
    <div className="bg-gray-800 rounded-lg shadow-md p-6 text-white">
      <div className="flex justify-between items-center mb-4">
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
      </div>

      <div className="mb-4 p-4 bg-gray-700/50 rounded-lg flex justify-between items-center">
        <h3 className="text-md font-semibold text-gray-300">
          Total Semua Transaksi
        </h3>
        <p className="text-2xl font-bold text-cyan-400">
          {formatCurrency(totalJumlah)}
        </p>
      </div>

      {!Array.isArray(transactions) || transactions.length === 0 ? (
        <p className="text-center text-gray-400 py-4">Belum ada data transaksi.</p>
      ) : (
        <div className="overflow-x-auto max-h-[700px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-gray-700 hover:bg-gray-800 sticky top-0 bg-gray-800">
                <TableHead className="text-white">Tanggal</TableHead>
                <TableHead className="text-white">Keterangan</TableHead>
                <TableHead className="text-white">Jenis Biaya</TableHead>
                <TableHead className="text-white text-right">Jumlah</TableHead>
                <TableHead className="text-white">Klaim</TableHead>
                <TableHead className="text-white text-center">Berkas</TableHead>
                <TableHead className="text-white text-center">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((tx) => (
                <TableRow key={tx.id} className="border-gray-700">
                  <TableCell>{tx.tanggal}</TableCell>
                  <TableCell className="font-medium">{tx.keterangan}</TableCell>
                  <TableCell>{tx.jenisBiaya}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(Number(tx.jumlah))}
                  </TableCell>
                  <TableCell>{tx.klaim}</TableCell>
                  <TableCell className="text-center">
                    {tx.fileUrl ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setPreviewImageUrl(tx.fileUrl!)}
                      >
                        <FileText className="h-4 w-4 text-cyan-400" />
                      </Button>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex justify-center items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenEditModal(tx)}
                      >
                        <Edit className="h-4 w-4 text-yellow-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteTransaction(tx.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Modal untuk Edit Transaksi */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[625px] bg-gray-800 border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-cyan-400">Edit Transaksi</DialogTitle>
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
                    className="bg-gray-700 border-gray-600"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="jenisBiaya">Jenis Biaya</Label>
                  <Input
                    id="jenisBiaya"
                    name="jenisBiaya"
                    value={transactionToEdit.jenisBiaya}
                    onChange={handleEditFormChange}
                    className="bg-gray-700 border-gray-600"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="keterangan">Keterangan</Label>
                <Textarea
                  id="keterangan"
                  name="keterangan"
                  value={transactionToEdit.keterangan}
                  onChange={handleEditFormChange}
                  className="bg-gray-700 border-gray-600"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="jumlah">Jumlah (Rp)</Label>
                  <Input
                    id="jumlah"
                    name="jumlah"
                    type="number"
                    value={Number(transactionToEdit.jumlah)}
                    onChange={handleEditFormChange}
                    className="bg-gray-700 border-gray-600"
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
                    className="bg-gray-700 border-gray-600"
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
              className="bg-cyan-600 hover:bg-cyan-700"
            >
              Simpan Perubahan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Preview Gambar dengan Next/Image */}
      <Dialog
        open={!!previewImageUrl}
        onOpenChange={(isOpen) => !isOpen && setPreviewImageUrl(null)}
      >
        <DialogContent className="sm:max-w-4xl w-auto bg-transparent border-none shadow-none p-0">
           <DialogHeader className="sr-only">
            <DialogTitle>Pratinjau Gambar Berkas</DialogTitle>
            <DialogDescription>
              Ini adalah pratinjau gambar yang diperbesar dari berkas yang dipilih.
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
    </div>
  );
}

