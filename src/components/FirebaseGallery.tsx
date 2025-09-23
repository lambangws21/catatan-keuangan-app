"use client";

import { useState, useMemo, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useAuth } from "@/components/AuthProvider";
import { Loader2, X, Search, Calendar, Download, ChevronLeft, ChevronRight, FileText, DollarSign } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// Import komponen dari shadcn/ui
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";


// Definisikan tipe data Transaction
interface Transaction {
  id: string;
  tanggal: string;
  jenisBiaya: string;
  keterangan: string;
  jumlah: number;
  klaim: string;
  fileUrl?: string;
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value);
};

export default function ImageGallery() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isDownloading, setIsDownloading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Transaction | null>(null);
  const itemsPerPage = 6; // 2 baris x 3 kolom

  // Fungsi untuk mengambil semua data transaksi
  const fetchTransactions = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/transactions', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Gagal mengambil data transaksi.');
      const data = await response.json();
      setTransactions(data);
    } catch (error) {
      console.error(error);
      setTransactions([]);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Saring transaksi untuk hanya menampilkan yang memiliki gambar
  const galleryItems = useMemo(() => {
    if (!Array.isArray(transactions)) return [];
    return transactions.filter(tx => tx.fileUrl && tx.fileUrl.trim() !== '');
  }, [transactions]);

  // Terapkan filter pencarian dan tanggal
  const filteredImages = useMemo(() => {
    return galleryItems.filter((item) => {
      const matchSearch = item.keterangan.toLowerCase().includes(search.toLowerCase());
      const matchDate = filterDate ? item.tanggal >= filterDate : true;
      return matchSearch && matchDate;
    });
  }, [galleryItems, search, filterDate]);

  const totalPages = Math.ceil(filteredImages.length / itemsPerPage);

  // Dapatkan gambar untuk halaman saat ini
  const currentImages = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredImages.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredImages, currentPage]);

  const exportToPDF = async () => {
    setIsDownloading(true);
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageCount = Math.ceil(filteredImages.length / itemsPerPage);
    const today = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });

    for (let i = 0; i < pageCount; i++) {
        const startIndex = i * itemsPerPage;
        const pageImages = filteredImages.slice(startIndex, startIndex + itemsPerPage);

        const gridContainer = document.createElement('div');
        gridContainer.style.width = '210mm';
        gridContainer.style.background = 'white';
        gridContainer.style.padding = '10mm';
        gridContainer.style.boxSizing = 'border-box';
        gridContainer.innerHTML = `
            <h2 style="text-align: center; font-size: 14pt; font-weight: bold; margin-bottom: 8mm; color: black;">Laporan Dokumentasi Foto</h2>
            <p style="text-align: right; font-size: 9pt; margin-bottom: 5mm; color: #333;">Tanggal Cetak: ${today}</p>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 5mm; min-height: 240mm;">
                ${pageImages.map(item => `
                    <div style="display: flex; flex-direction: column; border: 1px solid #eee; border-radius: 4px; overflow: hidden;">
                        <img src="${item.fileUrl}" crossOrigin="anonymous" style="width: 100%; height: 80%; object-fit: cover;" />
                        <p style="font-size: 7pt; text-align: center; padding: 4px; color: black; margin-top: auto;">${item.keterangan}</p>
                    </div>
                `).join('')}
            </div>
        `;
        document.body.appendChild(gridContainer);
        
        const images = Array.from(gridContainer.getElementsByTagName('img'));
        await Promise.all(images.map(img => new Promise(resolve => {
            if (img.complete) resolve(true);
            else img.onload = img.onerror = () => resolve(true);
        })));
        
        const canvas = await html2canvas(gridContainer, { scale: 2, useCORS: true });
        document.body.removeChild(gridContainer);

        const imgData = canvas.toDataURL('image/png');
        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);
    }
    
    pdf.save(`Laporan_Dokumentasi_${today}.pdf`);
    setIsDownloading(false);
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-16">
        <Loader2 className="h-10 w-10 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 text-white relative">
        {isDownloading && (
            <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center z-50 rounded-lg">
                <Loader2 className="h-12 w-12 animate-spin text-cyan-400 mb-4"/>
                <p className="text-lg font-semibold">Sedang membuat PDF...</p>
                <p className="text-sm text-gray-400">Ini mungkin memakan waktu beberapa saat.</p>
            </div>
        )}
        <header>
            <h1 className="text-3xl font-bold">Galeri Laporan</h1>
            <p className="text-gray-400">Pratinjau dan ekspor dokumentasi foto ke dalam format A4.</p>
        </header>

        <Card className="bg-gray-800/60 backdrop-blur-xl border border-white/10 p-4">
            <div className="flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-grow w-full md:w-auto">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input type="search" placeholder="Cari berdasarkan keterangan..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10"/>
                </div>
                <Input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="w-full md:w-auto"/>
                <Button onClick={exportToPDF} disabled={isDownloading || filteredImages.length === 0} className="w-full md:w-auto bg-cyan-600 hover:bg-cyan-700">
                    <Download className="h-4 w-4 mr-2" />
                    Export PDF
                </Button>
            </div>
        </Card>
      
        {filteredImages.length === 0 ? (
            <div className="text-center text-gray-400 py-16 bg-gray-800/50 rounded-lg">
                <FileText className="h-12 w-12 mx-auto mb-4 text-gray-500" />
                <p>Tidak ada berkas yang cocok dengan filter Anda.</p>
            </div>
        ) : (
            <div>
                <div id="a4-preview" className="grid grid-cols-3 gap-2 bg-white p-2 mx-auto rounded" style={{ width: "210mm", minHeight: "297mm" }}>
                    {currentImages.map((item) => (
                        <div key={item.id} className="flex flex-col border border-gray-200 rounded overflow-hidden cursor-pointer group" onClick={() => setSelectedItem(item)}>
                            <div className="relative w-full" style={{paddingTop: '133.33%'}}>
                                <Image src={item.fileUrl!} alt={item.keterangan} fill style={{objectFit: 'cover'}} />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            </div>
                            <p className="text-xs text-center p-1 text-black bg-gray-50 truncate">{item.keterangan}</p>
                        </div>
                    ))}
                    {Array.from({ length: itemsPerPage - currentImages.length }).map((_, i) => <div key={i} className="bg-gray-50 border border-gray-200 rounded"></div>)}
                </div>

                 <div className="flex justify-center items-center gap-4 mt-4">
                    <Button variant="outline" onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}><ChevronLeft className="h-4 w-4" /></Button>
                    <span className="text-sm font-medium">Halaman {currentPage} dari {totalPages}</span>
                    <Button variant="outline" onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}><ChevronRight className="h-4 w-4" /></Button>
                </div>
            </div>
        )}

        {/* Modal untuk Preview Gambar Beserta Datanya */}
        <Dialog open={!!selectedItem} onOpenChange={(isOpen) => !isOpen && setSelectedItem(null)}>
            <DialogContent className="sm:max-w-4xl w-auto bg-gray-900/50 backdrop-blur-lg border-gray-700 text-white p-4">
            <DialogHeader className="sr-only">
                <DialogTitle>Pratinjau Berkas: {selectedItem?.keterangan}</DialogTitle>
                <DialogDescription>Detail transaksi dan gambar berkas yang diperbesar.</DialogDescription>
            </DialogHeader>
            <motion.div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 relative flex justify-center items-center">
                {selectedItem?.fileUrl && (
                    <Image
                        src={selectedItem.fileUrl}
                        alt={selectedItem.keterangan}
                        width={1920} height={1080}
                        style={{ width: 'auto', height: 'auto', maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain' }}
                        className="rounded-lg shadow-2xl"
                    />
                )}
                </div>
                <div className="bg-gray-800 p-6 rounded-lg space-y-4 flex flex-col">
                    <h3 className="text-lg font-bold text-cyan-400">{selectedItem?.keterangan}</h3>
                    <div className="space-y-3 text-sm flex-grow">
                        <div className="flex items-center gap-3"><Calendar className="h-4 w-4 text-gray-400" /><span>{selectedItem?.tanggal}</span></div>
                        <div className="flex items-center gap-3"><DollarSign className="h-4 w-4 text-gray-400" /><span>{formatCurrency(selectedItem?.jumlah || 0)}</span></div>
                    </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setSelectedItem(null)} className="absolute top-2 right-2 bg-black/50 hover:bg-black/75 text-white rounded-full h-8 w-8"><X className="h-5 w-5" /></Button>
            </motion.div>
            </DialogContent>
        </Dialog>
    </div>
  );
}

