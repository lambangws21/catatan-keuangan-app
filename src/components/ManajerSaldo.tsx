"use client";

import { useState, ChangeEvent, useMemo } from 'react';
import { Edit, Trash2, FileDown } from 'lucide-react'; // Impor ikon baru

// Import library untuk ekspor
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable'; // PERBAIKAN: Impor 'autoTable' sebagai fungsi

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
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

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

// Tipe kustom 'jsPDFWithAutoTable' tidak lagi diperlukan

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value);
};

export default function SaldoManager({ saldoData, isLoading, onDataChange }: SaldoManagerProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<Saldo | null>(null);

  const totalSaldo = useMemo(() => {
    if (!Array.isArray(saldoData)) {
      return 0;
    }
    return saldoData.reduce((sum, item) => sum + Number(item.jumlah), 0);
  }, [saldoData]);

  // --- Fungsi Ekspor ---
  const handleExportExcel = () => {
    const dataToExport = saldoData.map(item => ({
      Tanggal: item.tanggal,
      Keterangan: item.keterangan,
      Jumlah: Number(item.jumlah),
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data Saldo");
    worksheet['!cols'] = [{ wch: 12 }, { wch: 40 }, { wch: 15 }];
    XLSX.writeFile(workbook, "Laporan Saldo.xlsx");
  };

  const handleExportPdf = () => {
    const doc = new jsPDF();
    doc.text("Laporan Riwayat Saldo", 14, 16);
    // PERBAIKAN: Panggil 'autoTable' sebagai fungsi, dengan 'doc' sebagai argumen pertama
    autoTable(doc, {
      head: [['Tanggal', 'Keterangan', 'Jumlah']],
      body: saldoData.map(item => [
        item.tanggal, 
        item.keterangan, 
        formatCurrency(Number(item.jumlah))
      ]),
      startY: 22,
      headStyles: { fillColor: [38, 145, 158] }, // Warna header (cyan)
    });
    doc.save("Laporan Saldo.pdf");
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus data saldo ini?')) return;
    await fetch(`/api/saldo/${id}`, { method: 'DELETE' });
    await onDataChange();
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
    if (!itemToEdit) return;
    const dataToUpdate = { ...itemToEdit, jumlah: Number(itemToEdit.jumlah) };
    await fetch(`/api/saldo/${itemToEdit.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dataToUpdate),
    });
    handleCloseEditModal();
    await onDataChange();
  };
  
  const handleEditFormChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (!itemToEdit) return;
    const { name, value } = e.target;
    setItemToEdit(prev => prev ? { ...prev, [name]: value } : null);
  };

  if (isLoading) return <p className="text-center p-8">Memuat data saldo...</p>;

  return (
    <div className="bg-gray-800 rounded-lg shadow-md p-6 text-white">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-cyan-400">Riwayat Saldo</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportExcel} disabled={!saldoData || saldoData.length === 0}>
            <FileDown className="h-4 w-4 mr-2" /> Excel
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPdf} disabled={!saldoData || saldoData.length === 0}>
            <FileDown className="h-4 w-4 mr-2" /> PDF
          </Button>
        </div>
      </div>
      
      <div className="mb-4 p-4 bg-gray-700/50 rounded-lg flex justify-between items-center">
        <h3 className="text-md font-semibold text-gray-300">Total Semua Saldo</h3>
        <p className="text-2xl font-bold text-cyan-400">{formatCurrency(totalSaldo)}</p>
      </div>

      {!Array.isArray(saldoData) || saldoData.length === 0 ? (
        <p className="text-center text-gray-400 py-4">Belum ada data saldo.</p>
      ) : (
        <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-gray-700 hover:bg-gray-800 sticky top-0 bg-gray-800">
                <TableHead className="text-white">Tanggal</TableHead>
                <TableHead className="text-white">Keterangan</TableHead>
                <TableHead className="text-white text-right">Jumlah</TableHead>
                <TableHead className="text-white text-center">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {saldoData.map((item) => (
                <TableRow key={item.id} className="border-gray-700">
                  <TableCell>{item.tanggal}</TableCell>
                  <TableCell className="font-medium">{item.keterangan}</TableCell>
                  <TableCell className="text-right">{formatCurrency(Number(item.jumlah))}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex justify-center items-center gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenEditModal(item)}>
                        <Edit className="h-4 w-4 text-yellow-500" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}>
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

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[425px] bg-gray-800 border-gray-700 text-white">
          <DialogHeader><DialogTitle className="text-cyan-400">Edit Saldo</DialogTitle></DialogHeader>
          {itemToEdit && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="tanggal">Tanggal</Label>
                <Input id="tanggal" name="tanggal" type="date" value={itemToEdit.tanggal} onChange={handleEditFormChange} className="bg-gray-700 border-gray-600"/>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="keterangan">Keterangan</Label>
                <Textarea id="keterangan" name="keterangan" value={itemToEdit.keterangan} onChange={handleEditFormChange} className="bg-gray-700 border-gray-600"/>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="jumlah">Jumlah (Rp)</Label>
                <Input id="jumlah" name="jumlah" type="number" value={Number(itemToEdit.jumlah)} onChange={handleEditFormChange} className="bg-gray-700 border-gray-600"/>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseEditModal}>Batal</Button>
            <Button onClick={handleUpdate} className="bg-cyan-600 hover:bg-cyan-700">Simpan Perubahan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

